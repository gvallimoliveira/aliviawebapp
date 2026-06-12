
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS is_student boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS student_institution text,
  ADD COLUMN IF NOT EXISTS student_period text;

ALTER TABLE public.professionals
  ALTER COLUMN crefito DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.validate_crefito_format()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.crefito IS NULL OR NEW.is_student = true THEN
    RETURN NEW;
  END IF;
  IF NEW.crefito !~ '^\d{1,6}-[A-Z]$' THEN
    RAISE EXCEPTION 'Invalid CREFITO format. Expected pattern: 123456-F';
  END IF;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.get_public_professional_assessment_link(uuid);

CREATE FUNCTION public.get_public_professional_assessment_link(_professional_id uuid)
 RETURNS TABLE(id uuid, user_id uuid, full_name text, logo_url text, approved boolean, active boolean, has_access boolean, is_student boolean, student_institution text, student_period text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    p.id,
    p.user_id,
    p.full_name,
    p.logo_url,
    p.approved,
    p.active,
    (
      p.subscription_status = 'active'
      OR p.is_partner = true
      OR p.lifetime_treatment = true
      OR p.premium_granted = true
      OR (p.pro_access_expires_at IS NOT NULL AND p.pro_access_expires_at > now())
      OR public.is_admin(p.user_id)
    ) AS has_access,
    COALESCE(p.is_student, false) AS is_student,
    p.student_institution,
    p.student_period
  FROM public.professionals p
  WHERE p.id = _professional_id
  LIMIT 1;
$$;
