
CREATE OR REPLACE FUNCTION public.get_professional_patient_contacts(_professional_id uuid)
RETURNS TABLE(user_id uuid, full_name text, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Must be the professional owner
  WITH pro_check AS (
    SELECT 1 FROM public.professionals p WHERE p.id = _professional_id AND p.user_id = auth.uid()
  ),
  -- 1. From assessments (both with and without user_id, match email -> auth.users)
  assessment_emails AS (
    SELECT DISTINCT a.patient_email
    FROM public.assessments a
    WHERE a.professional_id = _professional_id
      AND a.patient_email IS NOT NULL
      AND EXISTS (SELECT 1 FROM pro_check)
  ),
  -- 2. From patients table
  patient_emails AS (
    SELECT DISTINCT pt.email AS patient_email
    FROM public.patients pt
    WHERE pt.professional_id = _professional_id
      AND pt.email IS NOT NULL
      AND EXISTS (SELECT 1 FROM pro_check)
  ),
  -- 3. From professional_referrals (these already have user_id)
  referral_users AS (
    SELECT DISTINCT pr.patient_user_id AS uid
    FROM public.professional_referrals pr
    WHERE pr.professional_id = _professional_id
      AND EXISTS (SELECT 1 FROM pro_check)
  ),
  -- Combine all emails
  all_emails AS (
    SELECT patient_email FROM assessment_emails
    UNION
    SELECT patient_email FROM patient_emails
  ),
  -- Resolve emails to auth.users
  resolved_from_email AS (
    SELECT u.id AS uid, u.email::text AS email
    FROM auth.users u
    INNER JOIN all_emails ae ON LOWER(u.email) = LOWER(ae.patient_email)
  ),
  -- Combine all user_ids
  all_users AS (
    SELECT uid, email FROM resolved_from_email
    UNION
    SELECT uid, (SELECT u2.email::text FROM auth.users u2 WHERE u2.id = referral_users.uid) FROM referral_users
  )
  SELECT
    au.uid AS user_id,
    COALESCE(pr.full_name, au.email, 'Paciente') AS full_name,
    COALESCE(au.email, '') AS email
  FROM all_users au
  LEFT JOIN public.profiles pr ON pr.user_id = au.uid
  WHERE au.uid IS NOT NULL;
$$;
