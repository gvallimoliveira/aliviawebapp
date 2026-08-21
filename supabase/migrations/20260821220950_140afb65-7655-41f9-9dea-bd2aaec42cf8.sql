CREATE OR REPLACE FUNCTION public.delete_assessment_secure(_assessment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
  caller_email text;
  allowed boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT * INTO a FROM public.assessments WHERE id = _assessment_id;
  IF a.id IS NULL THEN
    RETURN false;
  END IF;

  SELECT lower(trim(u.email)) INTO caller_email FROM auth.users u WHERE u.id = auth.uid();

  -- Owner (patient) by user_id or email
  IF a.user_id = auth.uid() THEN
    allowed := true;
  ELSIF a.patient_email IS NOT NULL AND caller_email IS NOT NULL
        AND lower(trim(a.patient_email)) = caller_email THEN
    allowed := true;
  END IF;

  -- Linked professional (owner of the professional profile)
  IF NOT allowed AND a.professional_id IS NOT NULL THEN
    SELECT true INTO allowed FROM public.professionals p
     WHERE p.id = a.professional_id AND p.user_id = auth.uid();
    allowed := coalesce(allowed, false);
  END IF;

  -- Clinic staff with management rights
  IF NOT allowed AND a.clinic_id IS NOT NULL THEN
    IF public.get_clinic_role(auth.uid(), a.clinic_id) = ANY (ARRAY['owner'::clinic_role,'admin'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]) THEN
      allowed := true;
    END IF;
  END IF;

  IF NOT allowed THEN
    RAISE EXCEPTION 'not allowed to delete this assessment';
  END IF;

  -- Detach / clean references that would block the delete
  UPDATE public.assessments SET original_assessment_id = NULL WHERE original_assessment_id = _assessment_id;
  DELETE FROM public.professional_referrals WHERE assessment_id = _assessment_id;
  UPDATE public.clinic_assessment_logs SET assessment_id = NULL WHERE assessment_id = _assessment_id;
  UPDATE public.pain_diary_entries SET assessment_id = NULL WHERE assessment_id = _assessment_id;
  UPDATE public.professional_appointments SET assessment_id = NULL WHERE assessment_id = _assessment_id;
  DELETE FROM public.exercise_program_items
   WHERE program_id IN (SELECT id FROM public.exercise_programs WHERE assessment_id = _assessment_id);
  DELETE FROM public.exercise_programs WHERE assessment_id = _assessment_id;
  DELETE FROM public.professional_notes WHERE assessment_id = _assessment_id;
  DELETE FROM public.follow_up_emails WHERE assessment_id = _assessment_id;
  DELETE FROM public.pending_questionnaires WHERE assessment_id = _assessment_id;
  DELETE FROM public.assessment_voice_notes WHERE assessment_id = _assessment_id;
  DELETE FROM public.pain_mechanism_screenings WHERE assessment_id = _assessment_id;

  DELETE FROM public.assessments WHERE id = _assessment_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_assessment_secure(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.delete_assessment_secure(uuid) TO authenticated;