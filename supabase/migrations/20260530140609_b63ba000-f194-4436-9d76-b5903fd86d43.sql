
-- 1) Allow conversations addressed to a non-professional recipient (e.g. clinic secretary)
ALTER TABLE public.conversations
  ALTER COLUMN professional_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS recipient_user_id uuid,
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;

-- At least one of the two must be set
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_target_chk;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_target_chk
  CHECK (professional_id IS NOT NULL OR recipient_user_id IS NOT NULL);

-- Replace blanket unique with partial unique indexes
ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_patient_user_id_professional_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_patient_pro_uniq
  ON public.conversations (patient_user_id, professional_id)
  WHERE professional_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS conversations_patient_recipient_uniq
  ON public.conversations (patient_user_id, recipient_user_id)
  WHERE recipient_user_id IS NOT NULL;

-- 2) Update participant check to include direct recipient
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id
    AND (
      c.patient_user_id = _user_id
      OR c.recipient_user_id = _user_id
      OR EXISTS (
        SELECT 1 FROM public.professionals p
        WHERE p.id = c.professional_id AND p.user_id = _user_id
      )
    )
  )
$function$;

-- 3) RPC: clinic patient opens a conversation with the clinic's secretary/owner
CREATE OR REPLACE FUNCTION public.create_conversation_with_clinic_staff(_clinic_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _patient_user_id uuid := auth.uid();
  _patient_email text;
  _recipient uuid;
  _conv_id uuid;
BEGIN
  IF _patient_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO _patient_email FROM auth.users WHERE id = _patient_user_id;

  -- Verify the caller is a patient of this clinic
  IF NOT EXISTS (
    SELECT 1 FROM public.assessments
    WHERE clinic_id = _clinic_id
      AND (user_id = _patient_user_id
           OR (_patient_email IS NOT NULL AND LOWER(patient_email) = LOWER(_patient_email)))
    LIMIT 1
  ) AND NOT EXISTS (
    SELECT 1 FROM public.patients
    WHERE clinic_id = _clinic_id
      AND _patient_email IS NOT NULL
      AND LOWER(email) = LOWER(_patient_email)
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Patient not linked to this clinic';
  END IF;

  -- Pick a secretary first, otherwise the clinic owner
  SELECT cm.user_id INTO _recipient
  FROM public.clinic_members cm
  WHERE cm.clinic_id = _clinic_id
    AND cm.status = 'active'
    AND cm.role = 'secretary'
  ORDER BY cm.accepted_at NULLS LAST
  LIMIT 1;

  IF _recipient IS NULL THEN
    SELECT cm.user_id INTO _recipient
    FROM public.clinic_members cm
    WHERE cm.clinic_id = _clinic_id
      AND cm.status = 'active'
      AND cm.role = 'owner'
    LIMIT 1;
  END IF;

  IF _recipient IS NULL THEN
    RAISE EXCEPTION 'No staff available for this clinic';
  END IF;

  -- Reuse if a conversation already exists
  SELECT id INTO _conv_id
  FROM public.conversations
  WHERE patient_user_id = _patient_user_id
    AND recipient_user_id = _recipient
  LIMIT 1;

  IF _conv_id IS NOT NULL THEN
    UPDATE public.conversations
      SET hidden_by_patient = false,
          hidden_by_professional = false
      WHERE id = _conv_id;
    RETURN _conv_id;
  END IF;

  INSERT INTO public.conversations (patient_user_id, recipient_user_id, clinic_id)
  VALUES (_patient_user_id, _recipient, _clinic_id)
  RETURNING id INTO _conv_id;

  RETURN _conv_id;
END;
$function$;

-- 4) RLS: allow clinic staff (recipient) to view/update their conversations,
-- and allow recipients to be inserted by the patient (covered by existing patient-insert policy
-- since auth.uid() = patient_user_id is still enforced).
-- Existing SELECT/UPDATE policies use is_conversation_participant which now covers recipient_user_id.

-- 5) Unhide-on-message trigger: also unhide for recipient side
CREATE OR REPLACE FUNCTION public.unhide_conversation_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.conversations
  SET hidden_by_patient = CASE
        WHEN patient_user_id = NEW.sender_user_id THEN hidden_by_patient
        ELSE false
      END,
      hidden_by_professional = CASE
        WHEN recipient_user_id = NEW.sender_user_id THEN hidden_by_professional
        WHEN EXISTS (
          SELECT 1 FROM public.professionals p
          WHERE p.id = professional_id AND p.user_id = NEW.sender_user_id
        ) THEN hidden_by_professional
        ELSE false
      END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$;
