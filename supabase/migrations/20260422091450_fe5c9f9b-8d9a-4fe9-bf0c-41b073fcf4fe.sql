
CREATE OR REPLACE FUNCTION public.get_professional_all_patients(_professional_id uuid)
RETURNS TABLE(user_id uuid, full_name text, email text, has_account boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH pro_check AS (
    SELECT 1 FROM public.professionals p WHERE p.id = _professional_id AND p.user_id = auth.uid()
  ),
  -- Emails from assessments
  assessment_contacts AS (
    SELECT DISTINCT a.patient_email, a.patient_name, a.user_id AS a_user_id
    FROM public.assessments a
    WHERE a.professional_id = _professional_id
      AND EXISTS (SELECT 1 FROM pro_check)
  ),
  -- Emails from patients table
  patient_contacts AS (
    SELECT DISTINCT pt.email AS patient_email, pt.full_name AS patient_name
    FROM public.patients pt
    WHERE pt.professional_id = _professional_id
      AND EXISTS (SELECT 1 FROM pro_check)
  ),
  -- Referral user_ids
  referral_contacts AS (
    SELECT DISTINCT pr.patient_user_id AS uid
    FROM public.professional_referrals pr
    WHERE pr.professional_id = _professional_id
      AND EXISTS (SELECT 1 FROM pro_check)
  ),
  -- All unique emails
  all_emails AS (
    SELECT patient_email, patient_name FROM assessment_contacts WHERE patient_email IS NOT NULL
    UNION
    SELECT patient_email, patient_name FROM patient_contacts WHERE patient_email IS NOT NULL
  ),
  -- Resolve emails to auth.users
  resolved AS (
    SELECT u.id AS uid, u.email::text AS email, TRUE AS has_acct
    FROM auth.users u
    INNER JOIN all_emails ae ON LOWER(u.email) = LOWER(ae.patient_email)
  ),
  -- Emails without account
  unresolved AS (
    SELECT DISTINCT ae.patient_email AS email, ae.patient_name
    FROM all_emails ae
    WHERE NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE LOWER(u.email) = LOWER(ae.patient_email)
    )
  ),
  -- Referral users
  referral_resolved AS (
    SELECT rc.uid, u.email::text AS email, TRUE AS has_acct
    FROM referral_contacts rc
    JOIN auth.users u ON u.id = rc.uid
  ),
  -- Combine users with accounts
  with_account AS (
    SELECT uid, email FROM resolved
    UNION
    SELECT uid, email FROM referral_resolved
  ),
  -- Final with-account rows
  account_rows AS (
    SELECT
      wa.uid AS user_id,
      COALESCE(pr.full_name, wa.email, 'Paciente') AS full_name,
      COALESCE(wa.email, '') AS email,
      TRUE AS has_account
    FROM with_account wa
    LEFT JOIN public.profiles pr ON pr.user_id = wa.uid
    WHERE wa.uid IS NOT NULL
  ),
  -- No-account rows
  no_account_rows AS (
    SELECT
      NULL::uuid AS user_id,
      COALESCE(ur.patient_name, ur.email, 'Paciente') AS full_name,
      COALESCE(ur.email, '') AS email,
      FALSE AS has_account
    FROM unresolved ur
    WHERE NOT EXISTS (
      SELECT 1 FROM with_account wa WHERE LOWER(wa.email) = LOWER(ur.email)
    )
  )
  SELECT * FROM account_rows
  UNION ALL
  SELECT * FROM no_account_rows;
$$;
