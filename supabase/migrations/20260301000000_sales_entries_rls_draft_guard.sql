-- Sales entries: Draft-Challenge Guard
-- Non-Admins dürfen keine Entries aus Challenges mit status='draft' lesen.
-- Admins behalten vollen Zugriff.
-- NULL-sicher: verwaiste Entries (challenge_id ohne Match) werden wie nicht-draft behandelt.

DROP POLICY IF EXISTS "sales_entries_select_own_or_published" ON public.sales_entries;

CREATE POLICY "sales_entries_select_own_or_published"
  ON public.sales_entries FOR SELECT TO authenticated
  USING (
    -- Admins sehen alles
    public.is_sales_admin()
    OR (
      -- Non-Admins: eigene Entries oder publizierte Entries,
      -- aber nur wenn Parent-Challenge NICHT im Draft-Status ist.
      -- COALESCE behandelt NULL (gelöschte/verwaiste Challenge) als 'orphaned' → != 'draft' → TRUE
      (author_user_id = auth.uid() OR is_published = true)
      AND COALESCE(
        (SELECT status FROM public.sales_challenges WHERE id = sales_entries.challenge_id),
        'orphaned'
      ) != 'draft'
    )
  );
