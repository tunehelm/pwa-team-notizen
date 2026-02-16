-- ============================================================
-- user_pins – Jeder User hat seine eigenen fixierten Elemente
-- ============================================================

-- 1) Tabelle erstellen
CREATE TABLE IF NOT EXISTS public.user_pins (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id    text NOT NULL,          -- ID des Ordners oder der Notiz
  item_type  text NOT NULL CHECK (item_type IN ('folder', 'note')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id)           -- Ein User kann ein Element nur einmal pinnen
);

-- 2) RLS aktivieren
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;

-- 3) Policies: Jeder User sieht/verwaltet nur seine eigenen Pins
CREATE POLICY "Users can view own pins"
  ON public.user_pins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pins"
  ON public.user_pins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own pins"
  ON public.user_pins FOR DELETE
  USING (auth.uid() = user_id);

-- 4) Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_user_pins_user_id ON public.user_pins(user_id);
