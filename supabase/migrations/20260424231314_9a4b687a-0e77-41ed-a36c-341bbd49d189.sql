
-- RPC: list all clinic patients (with or without account) for chat / messaging
CREATE OR REPLACE FUNCTION public.get_clinic_all_patients(_clinic_id uuid)
RETURNS TABLE(user_id uuid, full_name text, email text, has_account boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH membership_check AS (
    SELECT 1 FROM public.clinic_members
    WHERE clinic_id = _clinic_id AND user_id = auth.uid() AND status = 'active'
  ),
  assessment_contacts AS (
    SELECT DISTINCT a.patient_email, a.patient_name, a.user_id AS a_user_id
    FROM public.assessments a
    WHERE a.clinic_id = _clinic_id
      AND EXISTS (SELECT 1 FROM membership_check)
  ),
  patient_contacts AS (
    SELECT DISTINCT pt.email AS patient_email, pt.full_name AS patient_name
    FROM public.patients pt
    WHERE pt.clinic_id = _clinic_id
      AND EXISTS (SELECT 1 FROM membership_check)
  ),
  all_emails AS (
    SELECT patient_email, patient_name FROM assessment_contacts WHERE patient_email IS NOT NULL
    UNION
    SELECT patient_email, patient_name FROM patient_contacts WHERE patient_email IS NOT NULL
  ),
  resolved AS (
    SELECT u.id AS uid, u.email::text AS email, TRUE AS has_acct
    FROM auth.users u
    INNER JOIN all_emails ae ON LOWER(u.email) = LOWER(ae.patient_email)
  ),
  unresolved AS (
    SELECT DISTINCT ae.patient_email AS email, ae.patient_name
    FROM all_emails ae
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE LOWER(u.email) = LOWER(ae.patient_email)
    )
  ),
  account_rows AS (
    SELECT
      r.uid AS user_id,
      COALESCE(pr.full_name, r.email, 'Paciente') AS full_name,
      COALESCE(r.email, '') AS email,
      TRUE AS has_account
    FROM resolved r
    LEFT JOIN public.profiles pr ON pr.user_id = r.uid
    WHERE r.uid IS NOT NULL
  ),
  no_account_rows AS (
    SELECT
      NULL::uuid AS user_id,
      COALESCE(ur.patient_name, ur.email, 'Paciente') AS full_name,
      COALESCE(ur.email, '') AS email,
      FALSE AS has_account
    FROM unresolved ur
    WHERE NOT EXISTS (
      SELECT 1 FROM account_rows ar WHERE LOWER(ar.email) = LOWER(ur.email)
    )
  )
  SELECT * FROM account_rows
  UNION ALL
  SELECT * FROM no_account_rows;
$function$;

-- RPC: create or reuse a conversation between a clinic professional and a clinic patient.
-- Validates that caller is an active clinic member, that the patient belongs to the clinic,
-- and that the chosen professional is also a member of the clinic.
CREATE OR REPLACE FUNCTION public.create_conversation_for_clinic_patient(
  _clinic_id uuid,
  _professional_id uuid,
  _patient_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _conv_id uuid;
  _user_email text;
  _pro_user_id uuid;
BEGIN
  -- Caller must be an active member of the clinic
  IF NOT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE clinic_id = _clinic_id AND user_id = auth.uid() AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not a clinic member';
  END IF;

  -- Professional must exist and their owner user must be an active member of the clinic
  SELECT user_id INTO _pro_user_id FROM public.professionals WHERE id = _professional_id;
  IF _pro_user_id IS NULL THEN
    RAISE EXCEPTION 'Professional not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clinic_members
    WHERE clinic_id = _clinic_id AND user_id = _pro_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Professional is not a member of this clinic';
  END IF;

  -- Patient must belong to the clinic (assessment or patient row by email match)
  SELECT email INTO _user_email FROM auth.users WHERE id = _patient_user_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.assessments
    WHERE clinic_id = _clinic_id
      AND (user_id = _patient_user_id
           OR (_user_email IS NOT NULL AND LOWER(patient_email) = LOWER(_user_email)))
    LIMIT 1
  ) AND NOT EXISTS (
    SELECT 1 FROM public.patients
    WHERE clinic_id = _clinic_id
      AND _user_email IS NOT NULL
      AND LOWER(email) = LOWER(_user_email)
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Patient not linked to this clinic';
  END IF;

  -- Reuse conversation if it exists between this professional and this patient
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
$function$;
