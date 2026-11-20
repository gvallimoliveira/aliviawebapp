CREATE OR REPLACE FUNCTION public.get_my_active_exercise_programs()
RETURNS TABLE(program_id uuid, professional_id uuid, professional_name text, patient_name text, notes text, expires_at timestamptz, created_at timestamptz, assessment_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  WITH me AS (
    SELECT auth.uid() AS uid, (SELECT email FROM auth.users WHERE id = auth.uid()) AS email
  ),
  my_assessments AS (
    SELECT a.id FROM public.assessments a, me
    WHERE me.uid IS NOT NULL AND (a.user_id = me.uid OR (a.patient_email IS NOT NULL AND me.email IS NOT NULL AND LOWER(a.patient_email) = LOWER(me.email)))
  ),
  my_patient_records AS (
    SELECT pt.id, pt.full_name, pt.professional_id, pt.clinic_id FROM public.patients pt, me
    WHERE me.uid IS NOT NULL AND me.email IS NOT NULL AND pt.email IS NOT NULL AND LOWER(pt.email) = LOWER(me.email)
  )
  SELECT ep.id, ep.professional_id, pr.full_name, ep.patient_name, ep.notes, ep.expires_at, ep.created_at, ep.assessment_id
  FROM public.exercise_programs ep
  LEFT JOIN public.professionals pr ON pr.id = ep.professional_id
  WHERE auth.uid() IS NOT NULL AND ep.expires_at > now()
    AND (
      ep.assessment_id IN (SELECT id FROM my_assessments)
      OR EXISTS (
        SELECT 1 FROM my_patient_records mpr
        WHERE mpr.professional_id = ep.professional_id
          AND mpr.clinic_id IS NOT DISTINCT FROM ep.clinic_id
          AND LOWER(TRIM(mpr.full_name)) = LOWER(TRIM(ep.patient_name))
          AND (ep.assessment_id IS NULL OR ep.assessment_id IN (SELECT id FROM my_assessments))
      )
    );
$function$;
REVOKE EXECUTE ON FUNCTION public.get_my_active_exercise_programs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_active_exercise_programs() TO authenticated, service_role;