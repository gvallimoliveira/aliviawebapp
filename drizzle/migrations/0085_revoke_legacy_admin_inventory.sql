REVOKE EXECUTE ON FUNCTION public.admin_user_data_inventory(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_data_inventory(uuid, text) TO service_role;