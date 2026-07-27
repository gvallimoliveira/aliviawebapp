CREATE OR REPLACE FUNCTION public.get_hep_professional(_token text)
RETURNS TABLE (
  full_name text,
  logo_url text,
  clinic_name text,
  is_student boolean,
  active_profile_mode text,
  student_institution text,
  student_period text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.full_name, p.logo_url, p.clinic_name, p.is_student,
         p.active_profile_mode, p.student_institution, p.student_period
  FROM public.exercise_programs ep
  JOIN public.professionals p ON p.id = ep.professional_id
  WHERE ep.token = _token
    AND ep.expires_at > now()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_hep_professional(text) TO anon, authenticated;