DROP FUNCTION IF EXISTS public.get_clinic_members_with_details(uuid);
CREATE FUNCTION public.get_clinic_members_with_details(_clinic_id uuid)
RETURNS TABLE(
  id uuid, user_id uuid, role clinic_role, status text, accepted_at timestamp with time zone,
  full_name text, email text,
  is_student boolean, student_institution text, student_period text,
  active_profile_mode text, has_signature boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT cm.id, cm.user_id, cm.role, cm.status, cm.accepted_at,
    COALESCE(pr.full_name, p.full_name), u.email::text,
    COALESCE(pr.is_student, false), pr.student_institution, pr.student_period,
    COALESCE(pr.active_profile_mode, CASE WHEN pr.is_student THEN 'student' ELSE 'professional' END),
    (pr.signature_image_url IS NOT NULL AND pr.signature_image_url <> '')
  FROM public.clinic_members cm
  LEFT JOIN public.profiles p ON p.user_id = cm.user_id
  LEFT JOIN public.professionals pr ON pr.user_id = cm.user_id
  LEFT JOIN auth.users u ON u.id = cm.user_id
  WHERE cm.clinic_id = _clinic_id AND cm.status = 'active'
    AND public.is_clinic_member(auth.uid(), _clinic_id);
$function$;
REVOKE ALL ON FUNCTION public.get_clinic_members_with_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_clinic_members_with_details(uuid) TO authenticated, service_role;