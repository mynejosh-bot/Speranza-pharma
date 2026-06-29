-- ══════════════════════════════════════════════════════════════════
-- Speranza Della Pharma — Shareable invite link
-- Run this ONCE in the Supabase SQL Editor.
-- Idempotent: safe to re-run.
--
-- Why: relying on Supabase's built-in magic-link email is unreliable
-- (default SMTP is heavily rate-limited). Instead the owner copies a
-- unique invite link and sends it via WhatsApp / SMS / personal email.
-- The link opens a signup page that needs to look up the invite by
-- its UUID before the user is authenticated, so we expose a single
-- safe RPC for that.
-- ══════════════════════════════════════════════════════════════════

-- A single SECURITY DEFINER function that returns only the fields the
-- signup screen needs. Callable by anon (the visitor hasn't signed in
-- yet) but only ever returns one row, keyed by the UUID in the URL.
CREATE OR REPLACE FUNCTION public.get_invite_info(invite_id UUID)
RETURNS TABLE(
  email          TEXT,
  workspace_name TEXT,
  role           TEXT,
  accepted       BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wm.email,
         w.name AS workspace_name,
         wm.role,
         (wm.accepted_at IS NOT NULL) AS accepted
  FROM   public.workspace_members wm
  JOIN   public.workspaces        w  ON w.id = wm.workspace_id
  WHERE  wm.id = invite_id
  LIMIT  1;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_info(UUID) TO anon, authenticated;

-- ─── Done ─────────────────────────────────────────────────────────
-- After running this script, ALSO go to:
--   Authentication → Sign In / Up → Email →  DISABLE "Confirm email"
-- so a newly-signed-up invitee can log in immediately without having
-- to click a confirmation email (which is the same email delivery
-- problem we are working around).
