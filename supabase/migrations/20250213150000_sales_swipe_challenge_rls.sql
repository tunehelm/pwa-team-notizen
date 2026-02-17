-- Sales Swipe Challenge – RLS Policies + Vote-Limits (Schritt 2)
-- Voraussetzung: Tabellen aus 20250213140000_sales_swipe_challenge_tables.sql

-- 1) Admin-Check: Tabelle + Funktion (E-Mail-basiert, wie in der App)
CREATE TABLE IF NOT EXISTS public.sales_admin_emails (
  email text PRIMARY KEY
);

-- Admin-E-Mails einmalig einpflegen (mit deinen echten Admins ersetzen oder ergänzen)
INSERT INTO public.sales_admin_emails (email) VALUES
  ('tunehelm@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Optional: VITE_ADMIN_EMAIL per Hand hinzufügen, z.B.:
-- INSERT INTO public.sales_admin_emails (email) VALUES ('admin@example.com') ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_sales_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.sales_admin_emails a ON lower(u.email) = lower(a.email)
    WHERE u.id = auth.uid()
  );
$$;

-- 2) RLS aktivieren
ALTER TABLE public.sales_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_bestof ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_admin_emails ENABLE ROW LEVEL SECURITY;

-- sales_admin_emails: nur Admins lesen (für RLS-Check brauchen wir keinen Lesezugriff von außen)
DROP POLICY IF EXISTS "sales_admin_emails_admin_only" ON public.sales_admin_emails;
CREATE POLICY "sales_admin_emails_admin_only"
  ON public.sales_admin_emails FOR SELECT TO authenticated
  USING (public.is_sales_admin());

-- 3) sales_challenges
DROP POLICY IF EXISTS "sales_challenges_select_team" ON public.sales_challenges;
CREATE POLICY "sales_challenges_select_team"
  ON public.sales_challenges FOR SELECT TO authenticated
  USING (status IN ('active', 'frozen', 'revealed', 'archived'));

DROP POLICY IF EXISTS "sales_challenges_select_admin" ON public.sales_challenges;
CREATE POLICY "sales_challenges_select_admin"
  ON public.sales_challenges FOR SELECT TO authenticated
  USING (public.is_sales_admin());

DROP POLICY IF EXISTS "sales_challenges_insert_admin" ON public.sales_challenges;
CREATE POLICY "sales_challenges_insert_admin"
  ON public.sales_challenges FOR INSERT TO authenticated
  WITH CHECK (public.is_sales_admin());

DROP POLICY IF EXISTS "sales_challenges_update_admin" ON public.sales_challenges;
CREATE POLICY "sales_challenges_update_admin"
  ON public.sales_challenges FOR UPDATE TO authenticated
  USING (public.is_sales_admin())
  WITH CHECK (public.is_sales_admin());

DROP POLICY IF EXISTS "sales_challenges_delete_admin" ON public.sales_challenges;
CREATE POLICY "sales_challenges_delete_admin"
  ON public.sales_challenges FOR DELETE TO authenticated
  USING (public.is_sales_admin());

-- 4) sales_entries
-- SELECT: eigene Einträge oder veröffentlichte (Anonymität: App zeigt author erst beim Reveal)
DROP POLICY IF EXISTS "sales_entries_select_own_or_published" ON public.sales_entries;
CREATE POLICY "sales_entries_select_own_or_published"
  ON public.sales_entries FOR SELECT TO authenticated
  USING (
    author_user_id = auth.uid()
    OR is_published = true
  );

-- INSERT: eigene Human-Entries oder Admin für AI-Entries
DROP POLICY IF EXISTS "sales_entries_insert" ON public.sales_entries;
CREATE POLICY "sales_entries_insert"
  ON public.sales_entries FOR INSERT TO authenticated
  WITH CHECK (
    (source = 'human' AND author_user_id = auth.uid())
    OR (source = 'ai' AND public.is_sales_admin())
  );

-- UPDATE: nur eigene Einträge, nur bis edit_deadline
DROP POLICY IF EXISTS "sales_entries_update_own" ON public.sales_entries;
CREATE POLICY "sales_entries_update_own"
  ON public.sales_entries FOR UPDATE TO authenticated
  USING (
    author_user_id = auth.uid()
    AND (SELECT edit_deadline_at FROM public.sales_challenges WHERE id = sales_entries.challenge_id) >= now()
  )
  WITH CHECK (
    author_user_id = auth.uid()
    AND (SELECT edit_deadline_at FROM public.sales_challenges WHERE id = sales_entries.challenge_id) >= now()
  );

-- 5) sales_votes
-- SELECT: nur eigene Votes
DROP POLICY IF EXISTS "sales_votes_select_own" ON public.sales_votes;
CREATE POLICY "sales_votes_select_own"
  ON public.sales_votes FOR SELECT TO authenticated
  USING (voter_user_id = auth.uid());

-- INSERT: nur eigener Voter, bis vote_deadline, weight 0/1/2 (Limit per Trigger)
DROP POLICY IF EXISTS "sales_votes_insert_own" ON public.sales_votes;
CREATE POLICY "sales_votes_insert_own"
  ON public.sales_votes FOR INSERT TO authenticated
  WITH CHECK (
    voter_user_id = auth.uid()
    AND (SELECT vote_deadline_at FROM public.sales_challenges WHERE id = sales_votes.challenge_id) >= now()
    AND weight IN (0, 1, 2)
  );

DROP POLICY IF EXISTS "sales_votes_update_own" ON public.sales_votes;
CREATE POLICY "sales_votes_update_own"
  ON public.sales_votes FOR UPDATE TO authenticated
  USING (voter_user_id = auth.uid())
  WITH CHECK (
    voter_user_id = auth.uid()
    AND (SELECT vote_deadline_at FROM public.sales_challenges WHERE id = sales_votes.challenge_id) >= now()
    AND weight IN (0, 1, 2)
  );

-- 6) sales_winners
-- SELECT: nur nach reveal
DROP POLICY IF EXISTS "sales_winners_select_after_reveal" ON public.sales_winners;
CREATE POLICY "sales_winners_select_after_reveal"
  ON public.sales_winners FOR SELECT TO authenticated
  USING (
    (SELECT reveal_at FROM public.sales_challenges WHERE id = sales_winners.challenge_id) <= now()
    OR (SELECT status FROM public.sales_challenges WHERE id = sales_winners.challenge_id) = 'revealed'
  );

DROP POLICY IF EXISTS "sales_winners_insert_admin" ON public.sales_winners;
CREATE POLICY "sales_winners_insert_admin"
  ON public.sales_winners FOR INSERT TO authenticated
  WITH CHECK (public.is_sales_admin());

DROP POLICY IF EXISTS "sales_winners_update_admin" ON public.sales_winners;
CREATE POLICY "sales_winners_update_admin"
  ON public.sales_winners FOR UPDATE TO authenticated
  USING (public.is_sales_admin())
  WITH CHECK (public.is_sales_admin());

-- 7) sales_bestof
DROP POLICY IF EXISTS "sales_bestof_select_team" ON public.sales_bestof;
CREATE POLICY "sales_bestof_select_team"
  ON public.sales_bestof FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "sales_bestof_insert_admin" ON public.sales_bestof;
CREATE POLICY "sales_bestof_insert_admin"
  ON public.sales_bestof FOR INSERT TO authenticated
  WITH CHECK (public.is_sales_admin());

-- 8) Vote-Limits: max 3 Stimmen pro User/Challenge, max 2 pro Entry
CREATE OR REPLACE FUNCTION public.sales_votes_check_limits()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_deadline timestamptz;
  v_total int;
  v_per_entry int;
BEGIN
  SELECT vote_deadline_at INTO v_deadline
  FROM public.sales_challenges WHERE id = COALESCE(NEW.challenge_id, OLD.challenge_id);
  IF v_deadline < now() THEN
    RAISE EXCEPTION 'Voting ended (vote_deadline_at passed)';
  END IF;

  IF NEW.weight NOT IN (0, 1, 2) THEN
    RAISE EXCEPTION 'weight must be 0, 1 or 2';
  END IF;

  -- Gesamtsumme pro User/Challenge (bei UPDATE aktuelle Zeile aus Summe raus)
  SELECT COALESCE(SUM(weight), 0) INTO v_total
  FROM public.sales_votes
  WHERE challenge_id = NEW.challenge_id AND voter_user_id = NEW.voter_user_id
    AND (TG_OP = 'INSERT' OR id != OLD.id);
  IF v_total + NEW.weight > 3 THEN
    RAISE EXCEPTION 'Max 3 votes per user per challenge (current total: %)', v_total;
  END IF;

  -- Pro Entry max 2 (die aktuelle Zeile ist schon der eine Eintrag für dieses entry_id)
  IF NEW.weight > 2 THEN
    RAISE EXCEPTION 'Max 2 votes per entry';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_votes_check_limits_trigger ON public.sales_votes;
CREATE TRIGGER sales_votes_check_limits_trigger
  BEFORE INSERT OR UPDATE ON public.sales_votes
  FOR EACH ROW EXECUTE FUNCTION public.sales_votes_check_limits();
