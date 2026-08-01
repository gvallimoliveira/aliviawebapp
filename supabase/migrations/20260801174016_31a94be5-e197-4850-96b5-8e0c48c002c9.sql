DROP POLICY IF EXISTS "Users can delete their own assessments" ON public.assessments;
CREATE POLICY "Users can delete their own assessments"
ON public.assessments
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    user_id IS NULL
    AND patient_email IS NOT NULL
    AND LOWER(TRIM(patient_email)) = LOWER(TRIM((SELECT u.email FROM auth.users u WHERE u.id = auth.uid())))
  )
);