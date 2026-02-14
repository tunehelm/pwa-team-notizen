-- ============================================================
-- Profiles-Tabelle: Macht Nutzernamen für alle Team-Mitglieder sichtbar
-- Ausführen im Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Tabelle anlegen
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Row Level Security aktivieren
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Alle eingeloggten User dürfen Profile lesen
CREATE POLICY "Profiles lesbar für authentifizierte User"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- 4. User dürfen eigenes Profil aktualisieren
CREATE POLICY "Eigenes Profil aktualisieren"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 5. User dürfen eigenes Profil erstellen
CREATE POLICY "Eigenes Profil erstellen"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 6. Trigger: Profil automatisch bei neuer Anmeldung erstellen
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = CASE
      WHEN EXCLUDED.display_name != '' THEN EXCLUDED.display_name
      ELSE profiles.display_name
    END,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
