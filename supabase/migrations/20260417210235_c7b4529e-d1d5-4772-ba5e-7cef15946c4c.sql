CREATE POLICY "Clinic members can view clinic professionals"
ON public.professionals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.clinic_members cm_self
    JOIN public.clinic_members cm_target
      ON cm_target.clinic_id = cm_self.clinic_id
    WHERE cm_self.user_id = auth.uid()
      AND cm_self.status = 'active'
      AND cm_target.user_id = professionals.user_id
      AND cm_target.status = 'active'
  )
);