-- ══════════════════════════════════════════════════════════════════
-- Speranza Della Pharma — Workspace / Team Migration
-- Run this entire script in your Supabase SQL Editor (one execution).
-- ══════════════════════════════════════════════════════════════════

-- ─── 1. Create workspaces table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspaces (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        NOT NULL,
  owner_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Create workspace_members table ────────────────────────────
CREATE TABLE IF NOT EXISTS public.workspace_members (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  email        TEXT        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'member'
                           CHECK (role IN ('owner', 'member')),
  invited_at   TIMESTAMPTZ DEFAULT NOW(),
  accepted_at  TIMESTAMPTZ,
  UNIQUE(workspace_id, email)
);

-- ─── 3. Add workspace_id to drugs and sales ───────────────────────
ALTER TABLE public.drugs ADD COLUMN IF NOT EXISTS workspace_id UUID
  REFERENCES public.workspaces(id);

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS workspace_id UUID
  REFERENCES public.workspaces(id);

-- Also add invoice/customer columns if missing (from previous update)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_name  TEXT;

-- ─── 4. Enable RLS on new tables ──────────────────────────────────
ALTER TABLE public.workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- ─── 5. RLS policies: workspaces ──────────────────────────────────
DROP POLICY IF EXISTS "workspace_owner_all"      ON public.workspaces;
DROP POLICY IF EXISTS "workspace_member_select"  ON public.workspaces;

-- Owners can do everything with their own workspaces
CREATE POLICY "workspace_owner_all" ON public.workspaces
  FOR ALL TO authenticated
  USING   (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Accepted members can read the workspace
CREATE POLICY "workspace_member_select" ON public.workspaces
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE  user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

-- ─── 6. RLS policies: workspace_members ───────────────────────────
DROP POLICY IF EXISTS "wm_select"  ON public.workspace_members;
DROP POLICY IF EXISTS "wm_insert"  ON public.workspace_members;
DROP POLICY IF EXISTS "wm_update"  ON public.workspace_members;
DROP POLICY IF EXISTS "wm_delete"  ON public.workspace_members;

-- SELECT: see your own records, pending invites for your email, or anyone in a workspace you own/belong to
CREATE POLICY "wm_select" ON public.workspace_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR email = auth.email()
    OR workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE  user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

-- INSERT: only workspace owners can invite (includes inserting their own owner record)
CREATE POLICY "wm_insert" ON public.workspace_members
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  );

-- UPDATE: owner can update any member; users can accept their own invite (null user_id + matching email)
CREATE POLICY "wm_update" ON public.workspace_members
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND email = auth.email())
    OR workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
  )
  WITH CHECK (true);

-- DELETE: only owners can remove non-owner members
CREATE POLICY "wm_delete" ON public.workspace_members
  FOR DELETE TO authenticated
  USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
    AND role != 'owner'
  );

-- ─── 7. Update drugs RLS ──────────────────────────────────────────
-- Drop all existing policies on drugs dynamically to avoid name conflicts
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE tablename = 'drugs' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.drugs', r.policyname);
  END LOOP;
END $$;

-- New policy: user_id match (backward compat) OR workspace member
CREATE POLICY "drugs_workspace_access" ON public.drugs
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE  user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE  user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

-- ─── 8. Update sales RLS ──────────────────────────────────────────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE tablename = 'sales' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.sales', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "sales_workspace_access" ON public.sales
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE  user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE  user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

-- ─── Done ─────────────────────────────────────────────────────────
-- After running this script:
-- 1. Existing users will get their workspace auto-created on next login
-- 2. The app will migrate their existing drugs/sales to the new workspace
-- 3. Owners can invite collaborators from the Équipe page
