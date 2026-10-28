CREATE OR REPLACE FUNCTION public.request_assessment_id()
RETURNS uuid LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE v text;
BEGIN
  v := current_setting('request.headers', true)::json->>'x-assessment-id';
  IF v IS NULL OR v !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN NULL; END IF;
  RETURN v::uuid;
EXCEPTION WHEN others THEN RETURN NULL;
END $$;
GRANT EXECUTE ON FUNCTION public.request_assessment_id() TO anon, authenticated;

DROP POLICY IF EXISTS "Anon flow can view professional assessments (active window)" ON public.assessments;
CREATE POLICY "Anon flow can view professional assessments (active window)"
ON public.assessments FOR SELECT TO anon, authenticated
USING (id = public.request_assessment_id()
  AND type = 'professional' AND user_id IS NULL AND professional_id IS NOT NULL
  AND status = ANY (ARRAY['in_progress','red_flagged','completed'])
  AND created_at > (now() - interval '48 hours')
  AND has_active_pro_subscription(professional_id));

DROP POLICY IF EXISTS "Anon flow can update professional assessments (active window)" ON public.assessments;
CREATE POLICY "Anon flow can update professional assessments (active window)"
ON public.assessments FOR UPDATE TO anon, authenticated
USING (id = public.request_assessment_id()
  AND type = 'professional' AND user_id IS NULL AND professional_id IS NOT NULL
  AND status = ANY (ARRAY['in_progress','red_flagged','completed'])
  AND created_at > (now() - interval '48 hours')
  AND has_active_pro_subscription(professional_id))
WITH CHECK (type = 'professional' AND user_id IS NULL AND professional_id IS NOT NULL);

DROP POLICY IF EXISTS "Anon flow can view clinic assessments (active window)" ON public.assessments;
CREATE POLICY "Anon flow can view clinic assessments (active window)"
ON public.assessments FOR SELECT TO anon, authenticated
USING (id = public.request_assessment_id()
  AND type = 'professional' AND user_id IS NULL AND clinic_id IS NOT NULL
  AND status = ANY (ARRAY['in_progress','red_flagged','completed'])
  AND created_at > (now() - interval '48 hours'));

DROP POLICY IF EXISTS "Anon flow can update clinic assessments (active window)" ON public.assessments;
CREATE POLICY "Anon flow can update clinic assessments (active window)"
ON public.assessments FOR UPDATE TO anon, authenticated
USING (id = public.request_assessment_id()
  AND type = 'professional' AND user_id IS NULL AND clinic_id IS NOT NULL
  AND status = ANY (ARRAY['in_progress','red_flagged','completed'])
  AND created_at > (now() - interval '48 hours'))
WITH CHECK (type = 'professional' AND user_id IS NULL AND clinic_id IS NOT NULL);

DO $$
DECLARE f record;
BEGIN
  FOR f IN SELECT p.oid::regprocedure AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef AND p.proname IN (
      'get_clinic_funnel','get_clinic_patient_concentration','get_clinic_therapist_stats',
      'get_discharge_predictions','get_patient_churn_risk','get_patient_load_alerts',
      'approve_appointment_request','dismiss_appointment_request','count_announcement_audience',
      'account_ai_credit_usage','create_appointment_request','get_my_announcements','get_my_care_providers')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, public', f.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', f.sig);
  END LOOP;
END $$;