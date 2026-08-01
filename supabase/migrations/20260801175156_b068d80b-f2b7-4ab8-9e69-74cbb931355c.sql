CREATE OR REPLACE FUNCTION public.delete_my_assessments(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := NULLIF(auth.jwt() ->> 'email', '');
  v_owned uuid[];
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT COALESCE(array_agg(a.id), ARRAY[]::uuid[])
    INTO v_owned
  FROM public.assessments a
  WHERE a.id = ANY(COALESCE(_ids, ARRAY[]::uuid[]))
    AND (
      a.user_id = v_uid
      OR (
        v_email IS NOT NULL
        AND a.patient_email IS NOT NULL
        AND lower(a.patient_email) = lower(v_email)
      )
      OR EXISTS (
        SELECT 1
        FROM public.professionals p
        WHERE p.id = a.professional_id
          AND p.user_id = v_uid
      )
    );

  IF cardinality(v_owned) = 0 THEN
    RETURN 0;
  END IF;

  UPDATE public.assessments
  SET original_assessment_id = NULL
  WHERE original_assessment_id = ANY(v_owned);

  DELETE FROM public.professional_referrals
  WHERE assessment_id = ANY(v_owned);

  DELETE FROM public.assessments
  WHERE id = ANY(v_owned);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_assessments(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_assessments(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_all_my_assessments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := NULLIF(auth.jwt() ->> 'email', '');
  v_ids uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT COALESCE(array_agg(a.id), ARRAY[]::uuid[])
    INTO v_ids
  FROM public.assessments a
  WHERE a.user_id = v_uid
     OR (
       v_email IS NOT NULL
       AND a.patient_email IS NOT NULL
       AND lower(a.patient_email) = lower(v_email)
     );

  RETURN public.delete_my_assessments(v_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_all_my_assessments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_all_my_assessments() TO authenticated;