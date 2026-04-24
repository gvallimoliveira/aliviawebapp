CREATE OR REPLACE FUNCTION public.get_professionals_basic_info(_professional_ids uuid[])
RETURNS TABLE(id uuid, full_name text, logo_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_email AS (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ),
  eligible AS (
    SELECT DISTINCT a.professional_id AS pid
    FROM public.assessments a
    WHERE a.user_id = auth.uid() AND a.professional_id IS NOT NULL
    UNION
    SELECT DISTINCT a.professional_id
    FROM public.assessments a, user_email ue
    WHERE a.professional_id IS NOT NULL
      AND a.patient_email IS NOT NULL
      AND LOWER(a.patient_email) = LOWER(ue.email)
    UNION
    SELECT DISTINCT pt.professional_id
    FROM public.patients pt, user_email ue
    WHERE pt.professional_id IS NOT NULL
      AND pt.email IS NOT NULL
      AND LOWER(pt.email) = LOWER(ue.email)
    UNION
    SELECT DISTINCT c.professional_id
    FROM public.conversations c
    WHERE c.patient_user_id = auth.uid()
    UNION
    SELECT DISTINCT pr.professional_id
    FROM public.professional_referrals pr
    WHERE pr.patient_user_id = auth.uid()
  )
  SELECT p.id, p.full_name, p.logo_url
  FROM public.professionals p
  INNER JOIN eligible e ON e.pid = p.id
  WHERE p.id = ANY(_professional_ids);
$$;