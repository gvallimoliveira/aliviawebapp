REVOKE ALL ON FUNCTION public.get_clinic_kpis(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_clinic_kpis(uuid) TO authenticated;