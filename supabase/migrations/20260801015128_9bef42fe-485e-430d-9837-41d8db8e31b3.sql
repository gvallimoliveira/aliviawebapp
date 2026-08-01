CREATE OR REPLACE FUNCTION public.get_dsr_admin()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  request_type text,
  status text,
  details text,
  created_at timestamptz,
  updated_at timestamptz,
  handled_at timestamptz,
  notified_at timestamptz,
  subject_name text,
  subject_email text,
  deliveries jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.user_id,
    r.request_type,
    r.status,
    r.details,
    r.created_at,
    r.updated_at,
    r.handled_at,
    r.notified_at,
    p.full_name,
    u.email::text,
    COALESCE(
      (
        SELECT jsonb_agg(
                 jsonb_build_object(
                   'channel', l.channel,
                   'status', l.status,
                   'event_type', l.event_type,
                   'detail', l.detail,
                   'created_at', l.created_at
                 ) ORDER BY l.created_at DESC
               )
        FROM public.admin_alert_log l
        WHERE l.ref = r.id::text
      ),
      '[]'::jsonb
    )
  FROM public.data_subject_requests r
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  LEFT JOIN auth.users u ON u.id = r.user_id
  ORDER BY r.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_dsr_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.get_dsr_admin() TO authenticated;