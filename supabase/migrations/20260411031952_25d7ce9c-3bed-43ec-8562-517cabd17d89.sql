
DROP POLICY "Anyone can insert clinic logs" ON public.clinic_assessment_logs;

CREATE POLICY "Insert logs for active clinics"
ON public.clinic_assessment_logs
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clinics
    WHERE id = clinic_id
    AND subscription_status IN ('active', 'trialing')
  )
);
