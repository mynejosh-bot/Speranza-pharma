-- ══════════════════════════════════════════════════════════════════
-- Speranza Della Pharma — Storefront + Permissions Migration
-- Run this entire script in your Supabase SQL Editor (one execution).
-- Idempotent: safe to re-run.
-- ══════════════════════════════════════════════════════════════════

-- ─── 1. storefront_orders table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.storefront_orders (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id   UUID        NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  customer_name  TEXT        NOT NULL,
  customer_phone TEXT,
  items          JSONB       NOT NULL DEFAULT '[]'::jsonb,
  notes          TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','confirmed','cancelled')),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.storefront_orders ENABLE ROW LEVEL SECURITY;

-- ─── 2. Per-member permissions (JSONB) ────────────────────────────
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT NULL;

-- ─── 3. Public (anon) read of workspaces (name only is exposed via app) ──
DROP POLICY IF EXISTS "workspaces_public_read"   ON public.workspaces;
CREATE POLICY "workspaces_public_read" ON public.workspaces
  FOR SELECT TO anon
  USING (true);

-- ─── 4. Public (anon) catalog read of drugs in any workspace ─────
-- Only drugs that belong to a workspace AND have stock are exposed.
DROP POLICY IF EXISTS "drugs_public_catalog" ON public.drugs;
CREATE POLICY "drugs_public_catalog" ON public.drugs
  FOR SELECT TO anon
  USING (workspace_id IS NOT NULL AND stock > 0);

-- ─── 5. Public (anon) submit of storefront orders ────────────────
DROP POLICY IF EXISTS "sf_orders_anon_insert" ON public.storefront_orders;
CREATE POLICY "sf_orders_anon_insert" ON public.storefront_orders
  FOR INSERT TO anon
  WITH CHECK (workspace_id IS NOT NULL);

-- ─── 6. Workspace owners + members can read/update their orders ──
DROP POLICY IF EXISTS "sf_orders_workspace_read"   ON public.storefront_orders;
DROP POLICY IF EXISTS "sf_orders_workspace_update" ON public.storefront_orders;

CREATE POLICY "sf_orders_workspace_read" ON public.storefront_orders
  FOR SELECT TO authenticated
  USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE  user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "sf_orders_workspace_update" ON public.storefront_orders
  FOR UPDATE TO authenticated
  USING (
    workspace_id IN (SELECT id FROM public.workspaces WHERE owner_id = auth.uid())
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE  user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  )
  WITH CHECK (true);

-- ─── Done ─────────────────────────────────────────────────────────
