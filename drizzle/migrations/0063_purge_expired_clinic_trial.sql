CREATE OR REPLACE FUNCTION public.purge_expired_clinic_trial(_clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c record;
BEGIN
  SELECT * INTO c FROM public.clinics WHERE id = _clinic_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  -- Only never-paid trials past 15-day trial + 7-day grace; administrators' clinics are never purged.
  IF c.subscription_status IS DISTINCT FROM 'trialing'
     OR c.subscription_stripe_id IS NOT NULL
     OR COALESCE(c.trial_started_at, c.created_at) > now() - interval '22 days'
     OR public.is_admin(c.owner_user_id) THEN
    RETURN false;
  END IF;

  -- Rows whose clinic FK is SET NULL / NO ACTION must be removed explicitly so they never leak into a solo scope.
  UPDATE public.assessments SET original_assessment_id = NULL
    WHERE original_assessment_id IN (SELECT id FROM public.assessments WHERE clinic_id = _clinic_id);
  DELETE FROM public.professional_referrals
    WHERE assessment_id IN (SELECT id FROM public.assessments WHERE clinic_id = _clinic_id);
  DELETE FROM public.session_notes WHERE clinic_id = _clinic_id;
  DELETE FROM public.professional_appointments WHERE clinic_id = _clinic_id;
  DELETE FROM public.periodization_plans WHERE clinic_id = _clinic_id;
  DELETE FROM public.exercise_programs WHERE clinic_id = _clinic_id;
  DELETE FROM public.agent_threads WHERE clinic_id = _clinic_id;
  DELETE FROM public.conversations WHERE clinic_id = _clinic_id;
  DELETE FROM public.ai_credit_usage WHERE clinic_id = _clinic_id;
  DELETE FROM public.assessments WHERE clinic_id = _clinic_id;
  DELETE FROM public.clinics WHERE id = _clinic_id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_clinic_trial(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_clinic_trial(uuid) TO service_role;