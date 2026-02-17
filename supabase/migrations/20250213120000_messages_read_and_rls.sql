-- Admin-Inbox: Tabelle messages mit read-Spalte und RLS für SELECT/UPDATE
-- Nur ausführen, wenn die Tabelle bereits existiert aber read fehlt oder RLS blockiert.
-- Wenn die Tabelle noch nicht existiert, zuerst die Tabelle anlegen (siehe unten).

-- 1) Spalte "read" hinzufügen (falls nicht vorhanden)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'read'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN "read" boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2) RLS aktivieren
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3) Unsere Policies droppen (für sauberes Re-Run)
DROP POLICY IF EXISTS "messages_select_authenticated" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_authenticated" ON public.messages;
DROP POLICY IF EXISTS "messages_update_authenticated" ON public.messages;

-- 4) Policies: Authentifizierte User dürfen
--    - alle Nachrichten lesen (Admin-Inbox in der App)
--    - eigene Nachrichten einfügen (User sendet an Admin)
--    - alle Nachrichten updaten (Admin markiert als gelesen)
CREATE POLICY "messages_select_authenticated"
  ON public.messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "messages_insert_authenticated"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "messages_update_authenticated"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Optional: Tabelle von Grund auf (nur wenn messages noch nicht existiert)
-- CREATE TABLE IF NOT EXISTS public.messages (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   created_at timestamptz NOT NULL DEFAULT now(),
--   sender_id uuid REFERENCES auth.users(id),
--   sender_name text,
--   sender_email text,
--   content text NOT NULL,
--   "read" boolean NOT NULL DEFAULT false
-- );
