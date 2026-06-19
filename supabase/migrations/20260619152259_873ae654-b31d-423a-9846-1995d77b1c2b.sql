
DROP FUNCTION IF EXISTS public.get_public_professional_assessment_link(uuid);
DROP FUNCTION IF EXISTS public.get_clinic_members_with_details(uuid);

CREATE OR REPLACE FUNCTION public.get_public_professional_assessment_link(_professional_id uuid)
RETURNS TABLE(
  id uuid, user_id uuid, full_name text, logo_url text,
  approved boolean, active boolean, has_access boolean,
  is_student boolean, student_institution text, student_period text,
  active_profile_mode text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.user_id,
    p.full_name,
    p.logo_url,
    p.approved,
    p.active,
    (
      p.subscription_status = 'active'
      OR p.is_partner = true
      OR p.lifetime_treatment = true
      OR p.premium_granted = true
      OR (p.pro_access_expires_at IS NOT NULL AND p.pro_access_expires_at > now())
      OR public.is_admin(p.user_id)
    ) AS has_access,
    COALESCE(p.is_student, false) AS is_student,
    p.student_institution,
    p.student_period,
    COALESCE(p.active_profile_mode, CASE WHEN p.is_student THEN 'student' ELSE 'professional' END) AS active_profile_mode
  FROM public.professionals p
  WHERE p.id = _professional_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_clinic_members_with_details(_clinic_id uuid)
RETURNS TABLE(
  id uuid, user_id uuid, role clinic_role, status text, accepted_at timestamp with time zone,
  full_name text, email text,
  is_student boolean, student_institution text, student_period text,
  active_profile_mode text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    cm.id,
    cm.user_id,
    cm.role,
    cm.status,
    cm.accepted_at,
    COALESCE(pr.full_name, p.full_name) AS full_name,
    u.email::text,
    COALESCE(pr.is_student, false) AS is_student,
    pr.student_institution,
    pr.student_period,
    COALESCE(pr.active_profile_mode, CASE WHEN pr.is_student THEN 'student' ELSE 'professional' END) AS active_profile_mode
  FROM public.clinic_members cm
  LEFT JOIN public.profiles p ON p.user_id = cm.user_id
  LEFT JOIN public.professionals pr ON pr.user_id = cm.user_id
  LEFT JOIN auth.users u ON u.id = cm.user_id
  WHERE cm.clinic_id = _clinic_id
    AND cm.status = 'active'
    AND public.is_clinic_member(auth.uid(), _clinic_id);
$function$;
