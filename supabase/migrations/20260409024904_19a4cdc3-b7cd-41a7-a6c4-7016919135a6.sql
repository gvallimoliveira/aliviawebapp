
-- Allow professionals to delete their linked assessments
CREATE POLICY "Professionals can delete their linked assessments"
ON public.assessments
FOR DELETE
TO authenticated
USING (professional_id IN (
  SELECT id FROM public.professionals WHERE user_id = auth.uid()
));

-- Allow professionals to delete exercise programs they own
CREATE POLICY "Professionals can delete their programs"
ON public.exercise_programs
FOR DELETE
TO authenticated
USING (professional_id IN (
  SELECT id FROM public.professionals WHERE user_id = auth.uid()
));

-- Allow professionals to delete exercise program items of their programs
CREATE POLICY "Professionals can delete their program items"
ON public.exercise_program_items
FOR DELETE
TO authenticated
USING (program_id IN (
  SELECT ep.id FROM public.exercise_programs ep
  JOIN public.professionals p ON ep.professional_id = p.id
  WHERE p.user_id = auth.uid()
));

-- Allow professionals to delete professional notes they own
CREATE POLICY "Professionals can delete their own notes"
ON public.professional_notes
FOR DELETE
TO authenticated
USING (professional_id IN (
  SELECT id FROM public.professionals WHERE user_id = auth.uid()
));

-- Allow professionals to delete referrals they own
CREATE POLICY "Professionals can delete their referrals"
ON public.professional_referrals
FOR DELETE
TO authenticated
USING (professional_id IN (
  SELECT id FROM public.professionals WHERE user_id = auth.uid()
));

-- Allow professionals to delete follow-up emails for their assessments
CREATE POLICY "Professionals can delete follow-ups for their assessments"
ON public.follow_up_emails
FOR DELETE
TO authenticated
USING (assessment_id IN (
  SELECT a.id FROM public.assessments a
  WHERE a.professional_id IN (
    SELECT id FROM public.professionals WHERE user_id = auth.uid()
  )
));
