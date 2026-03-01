-- Atomares Flag für AI-Entry-Seeding (verhindert Duplikate bei Race-Conditions)
ALTER TABLE public.sales_challenges
  ADD COLUMN IF NOT EXISTS ai_entries_seeded boolean NOT NULL DEFAULT false;

-- Bestehende aktive/frozen/revealed/archived Challenges rückwirkend als geseeded markieren
UPDATE public.sales_challenges
  SET ai_entries_seeded = true
  WHERE status IN ('active', 'frozen', 'revealed', 'archived');
