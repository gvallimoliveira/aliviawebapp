DROP POLICY IF EXISTS "Professionals can delete their linked assessments" ON public.assessments;
CREATE POLICY "Professionals can delete their linked assessments"
ON public.assessments
FOR DELETE
TO authenticated
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()
  )
);