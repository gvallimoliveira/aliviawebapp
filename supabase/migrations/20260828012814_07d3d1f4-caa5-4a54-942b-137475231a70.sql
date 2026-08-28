GRANT EXECUTE ON FUNCTION public.studio_credit_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.studio_credit_status() TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_studio_generation(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_studio_generation(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.studio_plan_allowance(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_studio_vip() TO authenticated;
NOTIFY pgrst, 'reload schema';