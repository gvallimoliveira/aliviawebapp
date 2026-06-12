DROP POLICY "Users can check own VIP status" ON public.vip_users;
CREATE POLICY "Users can check own VIP status"
ON public.vip_users
FOR SELECT
TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));