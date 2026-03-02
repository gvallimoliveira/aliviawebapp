
-- Allow admins (VIP users) to update any professional profile (for approval toggling)
CREATE POLICY "Admins can update any professional"
ON public.professionals
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
