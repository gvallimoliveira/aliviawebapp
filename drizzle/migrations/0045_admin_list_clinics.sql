CREATE OR REPLACE FUNCTION public.admin_list_clinics()
RETURNS TABLE(id uuid, name text, owner_email text, owner_name text, subscription_status text, subscription_stripe_id text, max_members int, active_members bigint, members jsonb, patients_count bigint, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT c.id, c.name::text, ou.email::text, op.full_name::text, c.subscription_status::text, c.subscription_stripe_id::text, c.max_members::int,
    (SELECT count(*) FROM clinic_members m WHERE m.clinic_id=c.id AND m.status='active'),
    COALESCE((SELECT jsonb_agg(jsonb_build_object('email', COALESCE(mu.email, m.email), 'name', mp.full_name, 'role', m.role, 'status', m.status) ORDER BY m.created_at)
      FROM clinic_members m LEFT JOIN auth.users mu ON mu.id=m.user_id LEFT JOIN profiles mp ON mp.user_id=m.user_id WHERE m.clinic_id=c.id), '[]'::jsonb),
    (SELECT count(*) FROM patients pt WHERE pt.clinic_id=c.id),
    c.created_at
  FROM clinics c LEFT JOIN auth.users ou ON ou.id=c.owner_user_id LEFT JOIN profiles op ON op.user_id=c.owner_user_id
  ORDER BY c.created_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.admin_list_clinics() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_clinics() TO authenticated;