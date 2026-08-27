ALTER TABLE public.studio_creations ADD COLUMN IF NOT EXISTS folder text NOT NULL DEFAULT 'Geral';
ALTER TABLE public.studio_photos ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.studio_brands(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_studio_creations_user_brand ON public.studio_creations(user_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_studio_photos_owner_brand ON public.studio_photos(owner_id, brand_id);

CREATE OR REPLACE FUNCTION public.is_studio_vip()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vip_users v
    WHERE lower(v.email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  ) OR lower(coalesce((auth.jwt() ->> 'email'), '')) IN ('gvallimoliveira@gmail.com', 'gvallim.fisio@gmail.com')
$$;

CREATE TABLE IF NOT EXISTS public.studio_granted_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'solo',
  granted_by uuid,
  note text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_granted_access TO authenticated;
GRANT ALL ON public.studio_granted_access TO service_role;

ALTER TABLE public.studio_granted_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "VIP manages studio grants"
ON public.studio_granted_access FOR ALL TO authenticated
USING (public.is_studio_vip())
WITH CHECK (public.is_studio_vip());

CREATE POLICY "Beneficiary reads own grant"
ON public.studio_granted_access FOR SELECT TO authenticated
USING (lower(email) = lower(coalesce((auth.jwt() ->> 'email'), '')));