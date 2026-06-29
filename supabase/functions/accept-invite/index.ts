// Supabase Edge Function: accept-invite
// Creates (or updates) the auth user for an invited workspace member
// using the admin API, bypassing the SMTP-rate-limited "Confirm email"
// flow entirely. No outbound email is sent.
//
// Deploy:   supabase functions deploy accept-invite --no-verify-jwt
// Required env vars (auto-injected by Supabase): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: { invite_token?: string; password?: string; full_name?: string };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }

  const { invite_token, password, full_name } = body;
  if (!invite_token || !password || password.length < 8) {
    return json({ error: "invalid_input" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // 1. Look up the invite (service role bypasses RLS)
  const { data: invite, error: lookupErr } = await admin
    .from("workspace_members")
    .select("id, email, workspace_id, accepted_at")
    .eq("id", invite_token)
    .maybeSingle();

  if (lookupErr) return json({ error: "lookup_failed", detail: lookupErr.message }, 500);
  if (!invite) return json({ error: "invite_not_found" }, 404);

  const email = (invite.email as string).trim().toLowerCase();
  const metadata = {
    full_name: full_name || email,
    password_set: true,
  };

  // 2. Find or create the auth user, auto-confirmed
  let userId: string | null = null;
  // listUsers paginates; for a small pharmacy the first page is fine, but loop just in case.
  let page = 1;
  while (!userId) {
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (listErr) return json({ error: "list_users_failed", detail: listErr.message }, 500);
    const match = list.users.find((u) => (u.email || "").toLowerCase() === email);
    if (match) { userId = match.id; break; }
    if (list.users.length < 200) break;
    page += 1;
  }

  if (userId) {
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (updErr) return json({ error: "update_failed", detail: updErr.message }, 500);
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (createErr) return json({ error: "create_failed", detail: createErr.message }, 500);
    userId = created.user.id;
  }

  // 3. Attach the user to the invite row (idempotent)
  const { error: attachErr } = await admin
    .from("workspace_members")
    .update({ user_id: userId, accepted_at: new Date().toISOString() })
    .eq("id", invite_token);
  if (attachErr) return json({ error: "attach_failed", detail: attachErr.message }, 500);

  return json({ ok: true, email });
});
