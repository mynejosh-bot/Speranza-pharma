-- ══════════════════════════════════════════════════════════════════
-- Speranza Della Pharma — Backfill workspace_id on drugs & sales
-- Run this ONCE in the Supabase SQL Editor.
-- Idempotent: safe to re-run.
--
-- Why: drugs and sales created before the workspace migration have
-- workspace_id = NULL. The public storefront RLS policy requires
-- workspace_id IS NOT NULL, so they don't appear in the public catalog.
-- This script assigns each row's workspace_id from the owner's workspace.
-- ══════════════════════════════════════════════════════════════════

-- ─── 1. Backfill drugs ────────────────────────────────────────────
UPDATE public.drugs d
SET    workspace_id = w.id
FROM   public.workspaces w
WHERE  d.workspace_id IS NULL
  AND  d.user_id = w.owner_id;

-- ─── 2. Backfill sales ────────────────────────────────────────────
UPDATE public.sales s
SET    workspace_id = w.id
FROM   public.workspaces w
WHERE  s.workspace_id IS NULL
  AND  s.user_id = w.owner_id;

-- ─── 3. Sanity check (read-only) ──────────────────────────────────
-- After running, this should show 0 rows in both columns.
SELECT
  (SELECT count(*) FROM public.drugs WHERE workspace_id IS NULL) AS drugs_without_workspace,
  (SELECT count(*) FROM public.sales WHERE workspace_id IS NULL) AS sales_without_workspace;
