CREATE POLICY "Professionals can create conversations with referred patients"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = professional_id AND p.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.professional_referrals pr
    WHERE pr.professional_id = professional_id
    AND pr.patient_user_id = patient_user_id
  )
);