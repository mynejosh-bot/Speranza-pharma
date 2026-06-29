-- ══════════════════════════════════════════════════════════════════
-- Speranza Della Pharma — Member visibility fix
-- Run this ONCE in the Supabase SQL Editor.
-- Idempotent: safe to re-run.
--
-- Why: the previous drugs / sales RLS policies looked up the user's
-- workspaces with a subquery on workspace_members. That subquery is
-- itself filtered by workspace_members' RLS — a self-referential
-- pattern that returns empty rows for invited (non-owner) members
-- under Postgres' RLS recursion handling. The result was that an
-- invited member could see their own user_id rows but none of the
-- owner's workspace inventory, even with a fully-attached membership.
--
-- The fix: a SECURITY DEFINER helper function that returns the
-- current user's workspace_ids directly, bypassing the
-- workspace_members RLS. Drugs / sales policies then consult the
-- helper instead of inlining a subquery.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.user_workspace_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id
  FROM   public.workspace_members
  WHERE  user_id     = auth.uid()
    AND  accepted_at IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.user_workspace_ids() TO authenticated;

-- ─── drugs ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "drugs_workspace_access" ON public.drugs;
CREATE POLICY "drugs_workspace_access" ON public.drugs
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT public.user_workspace_ids())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );

-- ─── sales ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "sales_workspace_access" ON public.sales;
CREATE POLICY "sales_workspace_access" ON public.sales
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT public.user_workspace_ids())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );

-- ─── Sanity checks (read-only) ────────────────────────────────────
-- After running, for the invited member glen:
--   SELECT count(*) FROM public.drugs;  -- should return ~508
-- For the owner dad: unchanged behaviour, still sees everything.

-- ─── Done ─────────────────────────────────────────────────────────
