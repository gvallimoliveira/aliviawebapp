CREATE OR REPLACE FUNCTION public.validate_crefito_format()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(NEW.is_student, false) = true THEN
    RETURN NEW;
  END IF;
  IF NEW.crefito IS NULL OR length(trim(NEW.crefito)) = 0 THEN
    RAISE EXCEPTION 'CREFITO is required for professional accounts. Enable Student Access if you are still studying.';
  END IF;
  IF NEW.crefito !~ '^\d{1,6}-[A-Z]$' THEN
    RAISE EXCEPTION 'Invalid CREFITO format. Expected pattern: 123456-F';
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.get_clinic_members_with_details(uuid);

CREATE FUNCTION public.get_clinic_members_with_details(_clinic_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  role public.clinic_role,
  status text,
  accepted_at timestamptz,
  full_name text,
  email text,
  is_student boolean,
  student_institution text,
  student_period text
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
    COALESCE(pr.full_name, p.full_name) AS full_name,
    u.email::text,
    COALESCE(pr.is_student, false) AS is_student,
    pr.student_institution,
    pr.student_period
  FROM public.clinic_members cm
  LEFT JOIN public.profiles p ON p.user_id = cm.user_id
  LEFT JOIN public.professionals pr ON pr.user_id = cm.user_id
  LEFT JOIN auth.users u ON u.id = cm.user_id
  WHERE cm.clinic_id = _clinic_id
    AND cm.status = 'active'
    AND public.is_clinic_member(auth.uid(), _clinic_id);
$$;