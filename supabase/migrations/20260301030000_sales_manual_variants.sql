-- Manuelle Variantenpflege fuer Sales Quiz.
-- Erweitert source-Checks und Admin-CRUD fuer redaktionell gepflegte Varianten.

ALTER TABLE public.sales_entries
  DROP CONSTRAINT IF EXISTS sales_entries_source_check;

ALTER TABLE public.sales_entries
  ADD CONSTRAINT sales_entries_source_check
  CHECK (source IN ('human', 'ai', 'admin'));

ALTER TABLE public.sales_bestof
  DROP CONSTRAINT IF EXISTS sales_bestof_source_check;

ALTER TABLE public.sales_bestof
  ADD CONSTRAINT sales_bestof_source_check
  CHECK (source IN ('human', 'ai', 'admin'));

DROP POLICY IF EXISTS "sales_entries_insert" ON public.sales_entries;
CREATE POLICY "sales_entries_insert"
  ON public.sales_entries FOR INSERT TO authenticated
  WITH CHECK (
    (source = 'human' AND author_user_id = auth.uid())
    OR (source IN ('ai', 'admin') AND public.is_sales_admin())
  );

DROP POLICY IF EXISTS "sales_entries_update_admin" ON public.sales_entries;
CREATE POLICY "sales_entries_update_admin"
  ON public.sales_entries FOR UPDATE TO authenticated
  USING (public.is_sales_admin())
  WITH CHECK (public.is_sales_admin());

DROP POLICY IF EXISTS "sales_entries_delete_admin" ON public.sales_entries;
CREATE POLICY "sales_entries_delete_admin"
  ON public.sales_entries FOR DELETE TO authenticated
  USING (public.is_sales_admin());
