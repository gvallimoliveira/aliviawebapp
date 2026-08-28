REVOKE ALL ON FUNCTION public.studio_credit_status() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.studio_credit_status() FROM anon;
GRANT EXECUTE ON FUNCTION public.studio_credit_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.studio_credit_status() TO service_role;