DROP FUNCTION IF EXISTS public.admin_list_patient_users();

CREATE OR REPLACE FUNCTION public.admin_list_patient_users()
 RETURNS TABLE(user_id uuid, full_name text, email text, created_at timestamp with time zone, signup_origin text, basic_count bigint, premium_count bigint, paid_premium boolean, granted_premium boolean, last_assessment_at timestamp with time zone, linked_assessment_count bigint, linked_professional_names text[], linked_clinic_names text[], link_source text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    p.full_name,
    u.email::text,
    p.created_at,
    p.signup_origin,
    COALESCE(a.basic_count, 0) AS basic_count,
    COALESCE(a.premium_count, 0) AS premium_count,
    COALESCE(a.paid_premium, false) AS paid_premium,
    (gp.email IS NOT NULL) AS granted_premium,
    a.last_assessment_at,
    COALESCE(la.linked_count, 0) AS linked_assessment_count,
    COALESCE(
      (SELECT array_agg(DISTINCT n) FROM (
         SELECT unnest(COALESCE(la.pro_names, '{}'::text[])) AS n
         UNION
         SELECT unnest(COALESCE(pr2.pro_names, '{}'::text[])) AS n
       ) s WHERE n IS NOT NULL AND n <> ''),
      '{}'::text[]
    ) AS linked_professional_names,
    COALESCE(
      (SELECT array_agg(DISTINCT n) FROM (
         SELECT unnest(COALESCE(la.clinic_names, '{}'::text[])) AS n
         UNION
         SELECT unnest(COALESCE(pr2.clinic_names, '{}'::text[])) AS n
       ) s2 WHERE n IS NOT NULL AND n <> ''),
      '{}'::text[]
    ) AS linked_clinic_names,
    CASE
      WHEN COALESCE(la.linked_count, 0) > 0 AND pr2.pro_names IS NOT NULL THEN 'both'
      WHEN COALESCE(la.linked_count, 0) > 0 THEN 'assessment'
      WHEN pr2.pro_names IS NOT NULL OR pr2.clinic_names IS NOT NULL THEN 'patient_record'
      ELSE 'none'
    END AS link_source
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN LATERAL (
    SELECT
      count(*) FILTER (WHERE asm.type = 'basic') AS basic_count,
      count(*) FILTER (WHERE asm.type = 'premium') AS premium_count,
      bool_or(asm.type = 'premium' AND asm.payment_status IN ('paid','treatment_paid')) AS paid_premium,
      max(asm.created_at) AS last_assessment_at
    FROM public.assessments asm
    WHERE asm.user_id = p.user_id
      AND asm.professional_id IS NULL
      AND asm.clinic_id IS NULL
  ) a ON true
  LEFT JOIN LATERAL (
    SELECT
      count(*) AS linked_count,
      array_remove(array_agg(DISTINCT prof.full_name), NULL) AS pro_names,
      array_remove(array_agg(DISTINCT cl.name), NULL) AS clinic_names
    FROM public.assessments asm2
    LEFT JOIN public.professionals prof ON prof.id = asm2.professional_id
    LEFT JOIN public.clinics cl ON cl.id = asm2.clinic_id
    WHERE asm2.user_id = p.user_id
      AND (asm2.professional_id IS NOT NULL OR asm2.clinic_id IS NOT NULL)
  ) la ON true
  LEFT JOIN LATERAL (
    SELECT
      NULLIF(array_remove(array_agg(DISTINCT prof2.full_name), NULL), '{}') AS pro_names,
      NULLIF(array_remove(array_agg(DISTINCT cl2.name), NULL), '{}') AS clinic_names
    FROM public.patients pt
    LEFT JOIN public.professionals prof2 ON prof2.id = pt.professional_id
    LEFT JOIN public.clinics cl2 ON cl2.id = pt.clinic_id
    WHERE pt.email IS NOT NULL AND lower(pt.email) = lower(u.email::text)
  ) pr2 ON true
  LEFT JOIN public.granted_premium_users gp ON lower(gp.email) = lower(u.email::text)
  WHERE NOT EXISTS (
      SELECT 1 FROM public.professionals pr WHERE pr.user_id = p.user_id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.clinic_members cm WHERE cm.user_id = p.user_id AND cm.status = 'active'
    )
  ORDER BY p.created_at DESC;
END;
$function$;