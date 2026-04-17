CREATE OR REPLACE FUNCTION public.get_clinic_members_with_details(_clinic_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  role public.clinic_role,
  status text,
  accepted_at timestamptz,
  full_name text,
  email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cm.id,
    cm.user_id,
    cm.role,
    cm.status,
    cm.accepted_at,
    p.full_name,
    u.email::text
  FROM public.clinic_members cm
  LEFT JOIN public.profiles p ON p.user_id = cm.user_id
  LEFT JOIN auth.users u ON u.id = cm.user_id
  WHERE cm.clinic_id = _clinic_id
    AND cm.status = 'active'
    AND public.is_clinic_member(auth.uid(), _clinic_id);
$$;