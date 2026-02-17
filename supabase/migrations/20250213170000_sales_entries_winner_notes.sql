-- Winner Notes (Interview): optionaler Kommentar von Platz 1–3 nach Reveal
ALTER TABLE public.sales_entries
  ADD COLUMN IF NOT EXISTS winner_notes_md text,
  ADD COLUMN IF NOT EXISTS winner_notes_updated_at timestamptz;
