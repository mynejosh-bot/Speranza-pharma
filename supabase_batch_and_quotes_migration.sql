-- ══════════════════════════════════════════════════════════════════
-- Speranza Della Pharma — Batch numbers (lots) + pending quotes (devis)
-- Run this ONCE in the Supabase SQL Editor.
-- Idempotent: safe to re-run.
--
-- 1. drugs.batch / sales.batch: each batch ("lot") of a medicine is its
--    own inventory row (e.g. Paracétamol lot A, Paracétamol lot B), and
--    the lot number is copied onto every sale line so invoices keep it.
-- 2. quotes: devis saved as "en attente" so a customer can come back
--    later and have the devis turned into a real sale + invoice.
--
-- Requires supabase_member_visibility_fix.sql (user_workspace_ids()).
-- ══════════════════════════════════════════════════════════════════

-- ─── 1. Batch / lot columns ───────────────────────────────────────
ALTER TABLE public.drugs ADD COLUMN IF NOT EXISTS batch TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS batch TEXT;

-- ─── 2. Pending quotes ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL DEFAULT auth.uid(),
  workspace_id    UUID,
  number          TEXT NOT NULL,
  customer_name   TEXT,
  customer        JSONB NOT NULL DEFAULT '{}'::jsonb,  -- {phone,address,notes}
  items           JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{drug_id,drug_name,batch,qty,unit_price}]
  total           NUMERIC,                             -- normalized unit, like sales.total
  status          TEXT NOT NULL DEFAULT 'pending',     -- pending | converted | cancelled
  invoice_number  TEXT,                                -- set when converted into a sale
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS quotes_workspace_status_idx ON public.quotes (workspace_id, status);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotes_workspace_access" ON public.quotes;
CREATE POLICY "quotes_workspace_access" ON public.quotes
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR workspace_id IN (SELECT public.user_workspace_ids())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR workspace_id IN (SELECT public.user_workspace_ids())
  );

-- Make PostgREST pick up the new columns/table immediately.
NOTIFY pgrst, 'reload schema';
