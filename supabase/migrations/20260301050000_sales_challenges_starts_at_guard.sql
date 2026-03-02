-- Zukunftsschutz: Normale User sehen nur Challenges, die bereits gestartet sind.
-- Admins behalten vollen Zugriff auf Drafts und zukuenftige Wochen.

-- sales_challenges: starts_at-Guard fuer non-admin SELECT
DROP POLICY IF EXISTS "sales_challenges_select_team" ON public.sales_challenges;
CREATE POLICY "sales_challenges_select_team"
  ON public.sales_challenges FOR SELECT TO authenticated
  USING (
    status IN ('active', 'frozen', 'revealed', 'archived')
    AND starts_at <= now()
  );

-- sales_entries: dazu passend ebenfalls starts_at der Parent-Challenge pruefen.
-- Orphaned Entries (keine passende Challenge) bleiben sichtbar (COALESCE -infinity).
DROP POLICY IF EXISTS "sales_entries_select_own_or_published" ON public.sales_entries;
CREATE POLICY "sales_entries_select_own_or_published"
  ON public.sales_entries FOR SELECT TO authenticated
  USING (
    public.is_sales_admin()
    OR (
      (author_user_id = auth.uid() OR is_published = true)
      AND COALESCE(
        (SELECT status FROM public.sales_challenges WHERE id = sales_entries.challenge_id),
        'orphaned'
      ) != 'draft'
      AND COALESCE(
        (SELECT starts_at FROM public.sales_challenges WHERE id = sales_entries.challenge_id),
        '-infinity'::timestamptz
      ) <= now()
    )
  );
