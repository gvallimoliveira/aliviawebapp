-- 1. Tabela para Premium B2C concedido pelo admin (independente de profissional)
CREATE TABLE public.granted_premium_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX idx_granted_premium_users_email_lower ON public.granted_premium_users (LOWER(email));

ALTER TABLE public.granted_premium_users ENABLE ROW LEVEL SECURITY;

-- Apenas admins gerenciam
CREATE POLICY "Admins can view granted premium"
  ON public.granted_premium_users FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert granted premium"
  ON public.granted_premium_users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete granted premium"
  ON public.granted_premium_users FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update granted premium"
  ON public.granted_premium_users FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 2. Coluna que marca alguém como parceiro de forma permanente (independente do PRO estar ativo)
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS is_partner_account boolean NOT NULL DEFAULT false;

-- Backfill: quem já é parceiro hoje fica marcado
UPDATE public.professionals
  SET is_partner_account = true
  WHERE is_partner = true;