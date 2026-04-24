
-- 1. RPC: list professionals a patient can message
CREATE OR REPLACE FUNCTION public.get_patient_professionals(_user_id uuid)
RETURNS TABLE(
  professional_id uuid,
  professional_user_id uuid,
  full_name text,
  logo_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_email AS (
    SELECT email FROM auth.users WHERE id = _user_id
  ),
  pro_ids AS (
    -- Assessments linked directly to this user
    SELECT DISTINCT a.professional_id AS pid
    FROM public.assessments a
    WHERE a.user_id = _user_id AND a.professional_id IS NOT NULL
    UNION
    -- Assessments linked by email (pre-assessment links)
    SELECT DISTINCT a.professional_id
    FROM public.assessments a, user_email ue
    WHERE a.professional_id IS NOT NULL
      AND a.patient_email IS NOT NULL
      AND LOWER(a.patient_email) = LOWER(ue.email)
    UNION
    -- Patients table by email
    SELECT DISTINCT pt.professional_id
    FROM public.patients pt, user_email ue
    WHERE pt.professional_id IS NOT NULL
      AND pt.email IS NOT NULL
      AND LOWER(pt.email) = LOWER(ue.email)
    UNION
    -- Existing conversations
    SELECT DISTINCT c.professional_id
    FROM public.conversations c
    WHERE c.patient_user_id = _user_id
    UNION
    -- Referrals
    SELECT DISTINCT pr.professional_id
    FROM public.professional_referrals pr
    WHERE pr.patient_user_id = _user_id
  )
  SELECT p.id, p.user_id, p.full_name, p.logo_url
  FROM public.professionals p
  INNER JOIN pro_ids ON pro_ids.pid = p.id
  WHERE p.active = true;
$$;

-- 2. Auto-unhide conversation on new message (trigger)
CREATE OR REPLACE FUNCTION public.unhide_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reset hidden flags for the recipient(s) so the conversation reappears
  UPDATE public.conversations
  SET hidden_by_patient = CASE
        WHEN patient_user_id = NEW.sender_user_id THEN hidden_by_patient
        ELSE false
      END,
      hidden_by_professional = CASE
        WHEN EXISTS (
          SELECT 1 FROM public.professionals p
          WHERE p.id = professional_id AND p.user_id = NEW.sender_user_id
        ) THEN hidden_by_professional
        ELSE false
      END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unhide_conversation_on_message ON public.messages;
CREATE TRIGGER trg_unhide_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.unhide_conversation_on_message();

-- 3. Update create_conversation_for_patient to unhide both sides on reuse
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
  IF NOT EXISTS (
    SELECT 1 FROM public.professionals
    WHERE id = _professional_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT email INTO _user_email FROM auth.users WHERE id = _patient_user_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.assessments
    WHERE professional_id = _professional_id
      AND (user_id = _patient_user_id
           OR (_user_email IS NOT NULL AND LOWER(patient_email) = LOWER(_user_email)))
    LIMIT 1
  ) AND NOT EXISTS (
    SELECT 1 FROM public.professional_referrals
    WHERE professional_id = _professional_id AND patient_user_id = _patient_user_id
    LIMIT 1
  ) AND NOT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.professional_id = _professional_id
      AND _user_email IS NOT NULL
      AND LOWER(p.email) = LOWER(_user_email)
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Patient not linked to this professional';
  END IF;

  SELECT id INTO _conv_id FROM public.conversations
  WHERE professional_id = _professional_id AND patient_user_id = _patient_user_id
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
