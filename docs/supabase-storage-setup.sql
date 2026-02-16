-- ============================================================
-- Storage Bucket für Notiz-Medien (Bilder, Audio, Videos, Dateien)
-- ============================================================
-- Dieses SQL im Supabase SQL-Editor ausführen.

-- 1) Bucket erstellen (public = Bilder per URL abrufbar ohne Auth-Token)
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-media', 'note-media', true)
ON CONFLICT (id) DO NOTHING;

-- 2) Policy: Authentifizierte User dürfen hochladen
CREATE POLICY "Auth users can upload media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'note-media');

-- 3) Policy: Jeder kann Dateien lesen (public bucket)
CREATE POLICY "Anyone can read media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'note-media');

-- 4) Policy: User dürfen eigene Dateien löschen
CREATE POLICY "Users can delete own media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'note-media' AND (storage.foldername(name))[1] = auth.uid()::text);
