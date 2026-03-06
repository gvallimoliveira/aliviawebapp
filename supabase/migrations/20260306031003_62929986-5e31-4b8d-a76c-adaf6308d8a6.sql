CREATE POLICY "Professionals can update their linked assessments"
ON public.assessments
FOR UPDATE
TO authenticated
USING (
  professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  )
);