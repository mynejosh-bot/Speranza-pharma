-- ══════════════════════════════════════════════════════════════════
-- Speranza Della Pharma — Store prices natively in FC (integer)
-- Run this ONCE in the Supabase SQL Editor.
-- Idempotent: safe to re-run.
--
-- Why: prices were stored as USD-equivalent (price / 2800) which lost
-- precision in the DB column, causing edited prices to drift by a few
-- FC on roundtrip. We now persist the exact FC integer the user typed.
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.drugs
  ADD COLUMN IF NOT EXISTS price_fc INTEGER,
  ADD COLUMN IF NOT EXISTS cost_fc  INTEGER;

-- Backfill from existing USD-equivalent prices (2800 FC = 1 USD).
UPDATE public.drugs
   SET price_fc = ROUND(price * 2800)::INTEGER
 WHERE price_fc IS NULL AND price IS NOT NULL;

UPDATE public.drugs
   SET cost_fc = ROUND(cost_price * 2800)::INTEGER
 WHERE cost_fc IS NULL AND cost_price IS NOT NULL;

-- Sanity check (read-only): should report 0 nulls if every row has a price.
SELECT
  (SELECT count(*) FROM public.drugs WHERE price IS NOT NULL AND price_fc IS NULL) AS drugs_missing_price_fc,
  (SELECT count(*) FROM public.drugs WHERE cost_price IS NOT NULL AND cost_fc IS NULL) AS drugs_missing_cost_fc;
