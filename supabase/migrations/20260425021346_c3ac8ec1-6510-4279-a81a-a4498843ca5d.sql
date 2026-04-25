CREATE OR REPLACE FUNCTION public.create_conversation_for_patient(_professional_id uuid, _patient_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conv_id uuid;
  _user_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    auth.uid() = _patient_user_id
    OR EXISTS (
      SELECT 1
      FROM public.professionals
      WHERE id = _professional_id
        AND user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT email INTO _user_email
  FROM auth.users
  WHERE id = _patient_user_id;

  IF NOT EXISTS (
    SELECT 1
    FROM public.assessments
    WHERE professional_id = _professional_id
      AND (
        user_id = _patient_user_id
        OR (_user_email IS NOT NULL AND LOWER(patient_email) = LOWER(_user_email))
      )
    LIMIT 1
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.professional_referrals
    WHERE professional_id = _professional_id
      AND patient_user_id = _patient_user_id
    LIMIT 1
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.professional_id = _professional_id
      AND _user_email IS NOT NULL
      AND LOWER(p.email) = LOWER(_user_email)
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Patient not linked to this professional';
  END IF;

  SELECT id INTO _conv_id
  FROM public.conversations
  WHERE professional_id = _professional_id
    AND patient_user_id = _patient_user_id
  LIMIT 1;

  IF _conv_id IS NOT NULL THEN
    UPDATE public.conversations
    SET hidden_by_professional = false,
        hidden_by_patient = false
    WHERE id = _conv_id;

    RETURN _conv_id;
  END IF;

  INSERT INTO public.conversations (professional_id, patient_user_id)
  VALUES (_professional_id, _patient_user_id)
  RETURNING id INTO _conv_id;

  RETURN _conv_id;
END;
$$;