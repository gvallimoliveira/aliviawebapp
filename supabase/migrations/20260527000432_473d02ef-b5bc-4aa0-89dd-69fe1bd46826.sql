
CREATE OR REPLACE FUNCTION public.get_support_tickets_admin(_include_archived boolean DEFAULT false)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  subject text,
  message text,
  status text,
  admin_reply text,
  created_at timestamptz,
  updated_at timestamptz,
  archived_at timestamptz,
  user_email text,
  user_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id, t.user_id, t.subject, t.message, t.status, t.admin_reply,
    t.created_at, t.updated_at, t.archived_at,
    u.email::text AS user_email,
    COALESCE(p.full_name, u.raw_user_meta_data->>'full_name') AS user_name
  FROM public.support_tickets t
  LEFT JOIN auth.users u ON u.id = t.user_id
  LEFT JOIN public.profiles p ON p.user_id = t.user_id
  WHERE public.is_admin(auth.uid())
    AND (_include_archived OR t.archived_at IS NULL)
  ORDER BY t.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_support_tickets_admin(boolean) TO authenticated;
