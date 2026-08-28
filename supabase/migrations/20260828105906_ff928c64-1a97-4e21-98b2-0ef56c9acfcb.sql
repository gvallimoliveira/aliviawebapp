-- Restrict auth-only policies to the authenticated role so anonymous
-- assessment-link flows don't evaluate functions they can't execute.
DROP POLICY IF EXISTS "Clinic managers and therapists can update clinic assessments" ON public.assessments;
CREATE POLICY "Clinic managers and therapists can update clinic assessments"
ON public.assessments FOR UPDATE TO authenticated
USING (clinic_id IS NOT NULL AND get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role,'admin'::clinic_role,'secretary'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

DROP POLICY IF EXISTS "Clinic owners and therapists can delete clinic assessments" ON public.assessments;
CREATE POLICY "Clinic owners and therapists can delete clinic assessments"
ON public.assessments FOR DELETE TO authenticated
USING (clinic_id IS NOT NULL AND get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role,'admin'::clinic_role,'therapist'::clinic_role,'intern'::clinic_role]));

DROP POLICY IF EXISTS "Professionals can view their linked assessments" ON public.assessments;
CREATE POLICY "Professionals can view their linked assessments"
ON public.assessments FOR SELECT TO authenticated
USING (professional_id IN (SELECT p.id FROM professionals p WHERE p.user_id = auth.uid() AND has_active_pro_subscription(p.id)));

DROP POLICY IF EXISTS "Users can view their own assessments" ON public.assessments;
CREATE POLICY "Users can view their own assessments"
ON public.assessments FOR SELECT TO authenticated
USING (auth.uid() = user_id);
