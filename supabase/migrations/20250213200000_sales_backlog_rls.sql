-- RLS für sales_backlog: Nur Sales-Admins (is_sales_admin) dürfen lesen/schreiben.
-- Team hat keinen SELECT (keine Policy für normale User).

ALTER TABLE public.sales_backlog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_backlog_select_admin" ON public.sales_backlog;
CREATE POLICY "sales_backlog_select_admin"
  ON public.sales_backlog FOR SELECT TO authenticated
  USING (public.is_sales_admin());

DROP POLICY IF EXISTS "sales_backlog_insert_admin" ON public.sales_backlog;
CREATE POLICY "sales_backlog_insert_admin"
  ON public.sales_backlog FOR INSERT TO authenticated
  WITH CHECK (public.is_sales_admin());

DROP POLICY IF EXISTS "sales_backlog_update_admin" ON public.sales_backlog;
CREATE POLICY "sales_backlog_update_admin"
  ON public.sales_backlog FOR UPDATE TO authenticated
  USING (public.is_sales_admin())
  WITH CHECK (public.is_sales_admin());

DROP POLICY IF EXISTS "sales_backlog_delete_admin" ON public.sales_backlog;
CREATE POLICY "sales_backlog_delete_admin"
  ON public.sales_backlog FOR DELETE TO authenticated
  USING (public.is_sales_admin());
