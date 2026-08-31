DROP POLICY IF EXISTS "Assessment owners and pros can view addenda" ON public.assessment_addenda;
DROP POLICY IF EXISTS "Assessment owners and pros can create addenda" ON public.assessment_addenda;
DROP POLICY IF EXISTS "Pros can update addenda" ON public.assessment_addenda;
DROP POLICY IF EXISTS "Pros can delete addenda" ON public.assessment_addenda;

CREATE OR REPLACE FUNCTION public.can_access_assessment_addenda(_assessment_id uuid, _user_id uuid, _pro_only boolean DEFAULT false)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = _assessment_id
      AND (
        (NOT _pro_only AND a.user_id = _user_id)
        OR a.professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = _user_id)
        OR (a.clinic_id IS NOT NULL AND public.is_clinic_member(_user_id, a.clinic_id))
      )
  )
$$;

CREATE POLICY "Assessment owners and pros can view addenda"
ON public.assessment_addenda FOR SELECT TO authenticated
USING (public.can_access_assessment_addenda(assessment_id, auth.uid(), false));

CREATE POLICY "Assessment owners and pros can create addenda"
ON public.assessment_addenda FOR INSERT TO authenticated
WITH CHECK (public.can_access_assessment_addenda(assessment_id, auth.uid(), false));

CREATE POLICY "Pros can update addenda"
ON public.assessment_addenda FOR UPDATE TO authenticated
USING (public.can_access_assessment_addenda(assessment_id, auth.uid(), true))
WITH CHECK (public.can_access_assessment_addenda(assessment_id, auth.uid(), true));

CREATE POLICY "Pros can delete addenda"
ON public.assessment_addenda FOR DELETE TO authenticated
USING (public.can_access_assessment_addenda(assessment_id, auth.uid(), true));