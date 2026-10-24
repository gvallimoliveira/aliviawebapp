CREATE OR REPLACE FUNCTION public.get_assessment_agenda_conversion(_clinic_id uuid DEFAULT NULL, _professional_id uuid DEFAULT NULL)
RETURNS TABLE(assessed_count integer, scheduled_count integer, unscheduled_count integer, attended_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL OR (_clinic_id IS NULL AND _professional_id IS NULL) OR (_clinic_id IS NOT NULL AND _professional_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Exactly one authorized care scope required';
  END IF;
  IF _clinic_id IS NOT NULL THEN
    IF NOT public.is_clinic_member(auth.uid(), _clinic_id) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = _professional_id AND p.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  WITH scoped_assessments AS (
    SELECT a.id, NULLIF(LOWER(BTRIM(a.patient_email)), '') AS email_key, a.created_at,
      COALESCE(NULLIF(LOWER(BTRIM(a.patient_email)), ''), a.id::text) AS identity_key
    FROM public.assessments a
    WHERE a.status = 'completed' AND (
      (_clinic_id IS NOT NULL AND a.clinic_id = _clinic_id) OR
      (_clinic_id IS NULL AND a.clinic_id IS NULL AND a.professional_id = _professional_id)
    )
  ), first_assessments AS (
    SELECT DISTINCT ON (identity_key) * FROM scoped_assessments ORDER BY identity_key, created_at, id
  ), cohort AS (
    SELECT * FROM first_assessments WHERE created_at >= now() - INTERVAL '90 days'
  ), conversion AS (
    SELECT c.identity_key,
      COALESCE(BOOL_OR(pa.status IN ('scheduled', 'completed')), false) AS has_appointment,
      COALESCE(BOOL_OR(pa.status = 'completed'), false) AS has_attended
    FROM cohort c
    LEFT JOIN public.professional_appointments pa ON (
      (_clinic_id IS NOT NULL AND pa.clinic_id = _clinic_id) OR
      (_clinic_id IS NULL AND pa.clinic_id IS NULL AND pa.professional_id = _professional_id)
    ) AND pa.appointment_date >= (c.created_at AT TIME ZONE 'America/Sao_Paulo')::date
      AND COALESCE(pa.service_type, '') NOT IN ('compromisso', 'avaliacao')
      AND (LOWER(BTRIM(pa.patient_email)) = c.email_key OR EXISTS (
        SELECT 1 FROM scoped_assessments linked WHERE linked.id = pa.assessment_id AND linked.identity_key = c.identity_key
      ))
    GROUP BY c.identity_key
  )
  SELECT COUNT(*)::int, COUNT(*) FILTER (WHERE has_appointment)::int,
    COUNT(*) FILTER (WHERE NOT has_appointment)::int, COUNT(*) FILTER (WHERE has_attended)::int
  FROM conversion;
END;
$function$;
REVOKE ALL ON FUNCTION public.get_assessment_agenda_conversion(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_assessment_agenda_conversion(uuid, uuid) TO authenticated, service_role;