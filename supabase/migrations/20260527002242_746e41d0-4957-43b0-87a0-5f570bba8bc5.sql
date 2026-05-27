
CREATE POLICY "Admins can delete any professional"
ON public.professionals
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));
