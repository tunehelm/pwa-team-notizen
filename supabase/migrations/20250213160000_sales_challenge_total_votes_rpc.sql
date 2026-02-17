-- RPC: Live-Gesamtstimmen einer Challenge (für Anzeige vor Reveal).
-- Erlaubt allen authentifizierten Nutzern, die Summe zu lesen (Anonymität bleibt gewahrt).
CREATE OR REPLACE FUNCTION public.get_sales_challenge_total_votes(p_challenge_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(weight), 0)::bigint
  FROM public.sales_votes
  WHERE challenge_id = p_challenge_id;
$$;

-- Ausführung für eingeloggte Nutzer erlauben
GRANT EXECUTE ON FUNCTION public.get_sales_challenge_total_votes(uuid) TO authenticated;
