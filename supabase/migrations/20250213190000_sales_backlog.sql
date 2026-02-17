-- Sales Backlog: Admin plant Wochen-Challenges (Original, Context, Rules).
-- Nur Admins (is_sales_admin) dürfen lesen/schreiben (RLS in separater Migration).

CREATE TABLE IF NOT EXISTS public.sales_backlog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'used', 'archived')),
  category text NOT NULL DEFAULT 'Allgemein',
  title text NOT NULL,
  original_text text NOT NULL,
  context_md text,
  rules_md text,
  planned_week_key text,
  planned_starts_at timestamptz,
  used_in_challenge_id uuid REFERENCES public.sales_challenges(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_backlog_planned_week_key ON public.sales_backlog(planned_week_key);
CREATE INDEX IF NOT EXISTS idx_sales_backlog_status ON public.sales_backlog(status);

-- Max ein geplantes Item pro Woche
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_backlog_planned_week_unique
  ON public.sales_backlog(planned_week_key)
  WHERE status = 'planned';

-- updated_at Trigger
DROP TRIGGER IF EXISTS sales_backlog_updated_at ON public.sales_backlog;
CREATE TRIGGER sales_backlog_updated_at
  BEFORE UPDATE ON public.sales_backlog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
