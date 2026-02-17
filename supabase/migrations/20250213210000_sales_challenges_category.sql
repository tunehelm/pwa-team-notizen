-- Kategorie an sales_challenges für Archiv (Best-of) und Backlog-Ablage
ALTER TABLE public.sales_challenges
  ADD COLUMN IF NOT EXISTS category text;
