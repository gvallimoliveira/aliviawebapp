CREATE OR REPLACE FUNCTION public.get_my_active_exercise_programs()
RETURNS TABLE(
  program_id uuid,
  professional_id uuid,
  professional_name text,
  patient_name text,
  notes text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH me AS (
    SELECT auth.uid() AS uid, (SELECT email FROM auth.users WHERE id = auth.uid()) AS email
  ),
  -- Assessments owned by me (direct user_id or matching email)
  my_assessments AS (
    SELECT a.id
    FROM public.assessments a, me
    WHERE me.uid IS NOT NULL
      AND (
        a.user_id = me.uid
        OR (a.patient_email IS NOT NULL AND me.email IS NOT NULL AND LOWER(a.patient_email) = LOWER(me.email))
      )
  ),
  -- Patient records owned by me (matching email)
  my_patient_records AS (
    SELECT pt.id, pt.full_name, pt.professional_id
    FROM public.patients pt, me
    WHERE me.email IS NOT NULL
      AND pt.email IS NOT NULL
      AND LOWER(pt.email) = LOWER(me.email)
  )
  SELECT
    ep.id AS program_id,
    ep.professional_id,
    pr.full_name AS professional_name,
    ep.patient_name,
    ep.notes,
    ep.expires_at,
    ep.created_at
  FROM public.exercise_programs ep
  LEFT JOIN public.professionals pr ON pr.id = ep.professional_id
  WHERE ep.expires_at > now()
    AND (
      -- Linked to one of my assessments
      ep.assessment_id IN (SELECT id FROM my_assessments)
      -- OR same professional + matches one of my patient records by name
      OR EXISTS (
        SELECT 1 FROM my_patient_records mpr
        WHERE mpr.professional_id = ep.professional_id
          AND LOWER(TRIM(mpr.full_name)) = LOWER(TRIM(ep.patient_name))
      )
    );
$$;