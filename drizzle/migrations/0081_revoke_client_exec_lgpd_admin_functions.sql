REVOKE EXECUTE ON FUNCTION public.admin_user_data_inventory(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_purge_user_data(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_purge_user_data(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_data_inventory(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_purge_user_data(uuid, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_purge_user_data(uuid, text) TO service_role;