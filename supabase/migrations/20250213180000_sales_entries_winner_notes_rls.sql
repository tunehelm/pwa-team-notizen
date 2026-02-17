-- Winner Notes: Nur Gewinner (Top 3) dürfen im Reveal-Fenster winner_notes_md setzen.
-- Voraussetzung: 20250213170000_sales_entries_winner_notes.sql (Spalte existiert).

-- Hilfsfunktion: true wenn entry_id in Top 3 der zugehörigen Challenge ist
-- und Challenge im Reveal-Fenster (revealed, vor ends_at).
CREATE OR REPLACE FUNCTION public.is_sales_entry_winner(p_entry_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sales_entries e
    JOIN public.sales_challenges c ON c.id = e.challenge_id
    JOIN public.sales_winners w ON w.challenge_id = e.challenge_id
      AND (w.place1_entry_id = e.id OR w.place2_entry_id = e.id OR w.place3_entry_id = e.id)
    WHERE e.id = p_entry_id
      AND (c.status = 'revealed' OR c.reveal_at <= now())
      AND c.ends_at > now()
  );
$$;

-- UPDATE Policy erweitern: entweder bis edit_deadline (bestehend) ODER Winner im Reveal-Fenster
DROP POLICY IF EXISTS "sales_entries_update_own" ON public.sales_entries;
CREATE POLICY "sales_entries_update_own"
  ON public.sales_entries FOR UPDATE TO authenticated
  USING (
    author_user_id = auth.uid()
    AND (
      (SELECT edit_deadline_at FROM public.sales_challenges WHERE id = sales_entries.challenge_id) >= now()
      OR public.is_sales_entry_winner(sales_entries.id)
    )
  )
  WITH CHECK (
    author_user_id = auth.uid()
    AND (
      (SELECT edit_deadline_at FROM public.sales_challenges WHERE id = sales_entries.challenge_id) >= now()
      OR public.is_sales_entry_winner(sales_entries.id)
    )
  );
