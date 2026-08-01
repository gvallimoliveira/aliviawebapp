CREATE OR REPLACE FUNCTION public.delete_my_assessments(_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_owned uuid[];
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  SELECT COALESCE(array_agg(a.id), '{}')
    INTO v_owned
  FROM public.assessments a
  WHERE a.id = ANY(_ids)
    AND (
      a.user_id = v_uid
      OR (a.patient_email IS NOT NULL AND v_email IS NOT NULL AND LOWER(a.patient_email) = LOWER(v_email))
    );

  IF array_length(v_owned, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- desvincula referências que bloqueiam a exclusão
  UPDATE public.assessments SET original_assessment_id = NULL
  WHERE original_assessment_id = ANY(v_owned);

  DELETE FROM public.professional_referrals WHERE assessment_id = ANY(v_owned);
  DELETE FROM public.assessment_progress WHERE assessment_id = ANY(v_owned);

  DELETE FROM public.assessments WHERE id = ANY(v_owned);
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
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_ids uuid[];
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  SELECT COALESCE(array_agg(a.id), '{}')
    INTO v_ids
  FROM public.assessments a
  WHERE a.user_id = v_uid
     OR (a.patient_email IS NOT NULL AND v_email IS NOT NULL AND LOWER(a.patient_email) = LOWER(v_email));

  RETURN public.delete_my_assessments(v_ids);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_all_my_assessments() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_all_my_assessments() TO authenticated;