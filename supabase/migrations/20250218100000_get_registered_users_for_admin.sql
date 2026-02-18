-- RPC: Registrierte User für Admin (auth.users) – nur is_sales_admin() darf ausführen.
-- Keine neuen Tabellen; liest auth.users mit SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.get_registered_users_for_admin()
RETURNS TABLE (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_sales_admin() THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, u.created_at, u.last_sign_in_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Nur authentifizierte User dürfen die Funktion aufrufen; Ergebnis liefert nur die RPC bei Admin.
GRANT EXECUTE ON FUNCTION public.get_registered_users_for_admin() TO authenticated;
