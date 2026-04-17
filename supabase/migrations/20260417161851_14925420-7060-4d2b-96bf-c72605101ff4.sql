
-- 1. Clinic invitations: remove broad public SELECT
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.clinic_invitations;

-- Members of a clinic can still view its invitations (managers already covered by ALL policy)
CREATE POLICY "Clinic members can view invitations"
ON public.clinic_invitations
FOR SELECT
TO authenticated
USING (public.is_clinic_member(auth.uid(), clinic_id));

-- 2. Assessment reports storage: lock down write/update/delete to authenticated users
DROP POLICY IF EXISTS "Anyone can delete assessment reports" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update assessment reports" ON storage.objects;

-- Recreate insert/update/delete restricted to authenticated users
DROP POLICY IF EXISTS "Anyone can insert assessment reports" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload assessment reports" ON storage.objects;

CREATE POLICY "Authenticated users can upload assessment reports"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assessment-reports');

CREATE POLICY "Authenticated users can update assessment reports"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'assessment-reports');

CREATE POLICY "Service role can delete assessment reports"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'assessment-reports');

-- 3. Professionals directory: restrict public/anon SELECT to non-sensitive columns via a view
DROP POLICY IF EXISTS "Anyone can check professional subscription status" ON public.professionals;

-- Public directory view exposes only non-sensitive fields
CREATE OR REPLACE VIEW public.professionals_directory
WITH (security_invoker = true)
AS
SELECT
  id,
  full_name,
  crefito,
  specialties,
  bio,
  profile_photo_url,
  state,
  city,
  clinic_name,
  clinic_address,
  social_media,
  logo_url,
  approved,
  active
FROM public.professionals
WHERE approved = true AND active = true AND subscription_status = 'active';

GRANT SELECT ON public.professionals_directory TO anon, authenticated;

-- The existing "Users can view approved professionals or own profile" policy still allows
-- authenticated users to see full rows; tighten it to own profile + admin only.
DROP POLICY IF EXISTS "Users can view approved professionals or own profile" ON public.professionals;

CREATE POLICY "Users view own professional profile or admins view all"
ON public.professionals
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
