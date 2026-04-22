CREATE OR REPLACE FUNCTION public.create_conversation_for_patient(
  _professional_id uuid,
  _patient_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _conv_id uuid;
BEGIN
  -- Verify caller is the professional
  IF NOT EXISTS (
    SELECT 1 FROM public.professionals
    WHERE id = _professional_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Verify the patient is linked to this professional (via assessments, referrals, or patients table)
  IF NOT EXISTS (
    SELECT 1 FROM public.assessments
    WHERE professional_id = _professional_id AND user_id = _patient_user_id
    LIMIT 1
  ) AND NOT EXISTS (
    SELECT 1 FROM public.professional_referrals
    WHERE professional_id = _professional_id AND patient_user_id = _patient_user_id
    LIMIT 1
  ) AND NOT EXISTS (
    SELECT 1 FROM public.patients p
    JOIN auth.users u ON u.email = p.email
    WHERE p.professional_id = _professional_id AND u.id = _patient_user_id
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Patient not linked to this professional';
  END IF;

  -- Check if conversation already exists
  SELECT id INTO _conv_id FROM public.conversations
  WHERE professional_id = _professional_id AND patient_user_id = _patient_user_id
  LIMIT 1;

  IF _conv_id IS NOT NULL THEN
    -- Unhide for professional
    UPDATE public.conversations SET hidden_by_professional = false WHERE id = _conv_id;
    RETURN _conv_id;
  END IF;

  -- Create conversation
  INSERT INTO public.conversations (professional_id, patient_user_id)
  VALUES (_professional_id, _patient_user_id)
  RETURNING id INTO _conv_id;

  RETURN _conv_id;
END;
$$;