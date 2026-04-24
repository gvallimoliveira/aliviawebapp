-- RPC: retorna avaliações do usuário autenticado, incluindo pré-avaliações
-- realizadas via link profissional/clínica (vinculadas apenas por patient_email).
CREATE OR REPLACE FUNCTION public.get_my_assessments()
RETURNS SETOF public.assessments
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT auth.uid() AS uid,
           (SELECT email FROM auth.users WHERE id = auth.uid()) AS email
  )
  SELECT a.*
  FROM public.assessments a, me
  WHERE me.uid IS NOT NULL
    AND (
      a.user_id = me.uid
      OR (
        a.user_id IS NULL
        AND a.patient_email IS NOT NULL
        AND me.email IS NOT NULL
        AND LOWER(TRIM(a.patient_email)) = LOWER(TRIM(me.email))
      )
    )
  ORDER BY a.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_assessments() TO authenticated;