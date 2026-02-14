-- ============================================
-- Messages-Tabelle: Nachrichten an Admin
-- ============================================

-- Tabelle erstellen
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid REFERENCES auth.users(id) NOT NULL,
  sender_name text,
  sender_email text,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read boolean DEFAULT false
);

-- RLS aktivieren
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Jeder eingeloggte User darf Nachrichten senden (INSERT)
CREATE POLICY "Users can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Sender sieht eigene Nachrichten (für Gesendet-Bestätigung)
CREATE POLICY "Users can see own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id);

-- Admin darf alle Nachrichten sehen
CREATE POLICY "Admin can read all messages"
  ON public.messages FOR SELECT
  USING (auth.jwt()->>'email' = 'tunehelm@gmail.com');

-- Admin darf Nachrichten als gelesen markieren
CREATE POLICY "Admin can update messages"
  ON public.messages FOR UPDATE
  USING (auth.jwt()->>'email' = 'tunehelm@gmail.com');
