
CREATE OR REPLACE FUNCTION public.admin_delete_professional(_professional_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.assessments SET professional_id = NULL WHERE professional_id = _professional_id;
  DELETE FROM public.exercise_program_items WHERE program_id IN (SELECT id FROM public.exercise_programs WHERE professional_id = _professional_id);
  DELETE FROM public.exercise_programs WHERE professional_id = _professional_id;
  DELETE FROM public.professional_appointments WHERE professional_id = _professional_id;
  DELETE FROM public.professional_notes WHERE professional_id = _professional_id;
  DELETE FROM public.professional_referrals WHERE professional_id = _professional_id;
  DELETE FROM public.professional_hidden_patients WHERE professional_id = _professional_id;
  DELETE FROM public.conversations WHERE professional_id = _professional_id;
  DELETE FROM public.patients WHERE professional_id = _professional_id;
  DELETE FROM public.professionals WHERE id = _professional_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_professional(uuid) TO authenticated;
