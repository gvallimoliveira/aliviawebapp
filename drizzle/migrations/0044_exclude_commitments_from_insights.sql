-- Preserve deployed signatures, scope, grants and formulas; filter all appointment/note inputs.
DO $migration$
DECLARE
  metric text;
  signature regprocedure;
  original text;
  revised text;
BEGIN
  FOREACH metric IN ARRAY ARRAY[
    'get_clinic_kpis', 'get_clinic_benchmarks', 'get_clinic_therapist_stats',
    'get_clinic_patient_concentration', 'get_patient_churn_risk',
    'get_discharge_predictions', 'get_reactivation_candidates',
    'get_clinic_funnel', 'get_reassessment_due', 'get_patient_adherence_scores'
  ] LOOP
    SELECT p.oid::regprocedure INTO STRICT signature
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = metric;
    original := pg_get_functiondef(signature);
    revised := regexp_replace(original,
      'FROM public\.professional_appointments (pa)([ ,\n])',
      'FROM (SELECT * FROM public.professional_appointments WHERE COALESCE(service_type, '''') <> ''compromisso'') \1\2', 'g');
    revised := regexp_replace(revised,
      '(FROM|JOIN) public\.session_notes (sn|n)([ ,\n])',
      E'\\1 (SELECT care_note.* FROM public.session_notes care_note WHERE NOT EXISTS (SELECT 1 FROM public.professional_appointments commitment WHERE commitment.id = care_note.appointment_id AND commitment.clinic_id IS NOT DISTINCT FROM care_note.clinic_id AND commitment.professional_id IS NOT DISTINCT FROM care_note.professional_id AND commitment.service_type = ''compromisso'')) \\2\\3', 'g');
    IF revised = original THEN
      RAISE EXCEPTION 'No metric input matched for %; refusing an incomplete migration', metric;
    END IF;
    IF metric = 'get_clinic_benchmarks' THEN
      revised := replace(revised, 'SELECT metric AS m, bkt, AVG(val)', 'SELECT metrics.metric AS m, bkt, AVG(val)');
      revised := replace(revised, 'FROM metrics GROUP BY metric, bkt', 'FROM metrics GROUP BY metrics.metric, bkt');
    END IF;
    IF metric = 'get_clinic_funnel' THEN
      revised := replace(revised, 'JOIN assessed USING (email_key)', 'JOIN assessed ON assessed.email_key = LOWER(sn.patient_email)');
    END IF;
    EXECUTE revised;
  END LOOP;
END;
$migration$;