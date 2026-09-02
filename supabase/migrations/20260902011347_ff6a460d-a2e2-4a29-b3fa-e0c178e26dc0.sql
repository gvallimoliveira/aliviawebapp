REVOKE EXECUTE ON FUNCTION public.can_access_patient(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_access_patient(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_patient(uuid, uuid) TO authenticated, service_role;