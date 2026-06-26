
-- =============================================
-- FASE 1: FUNDAÇÃO DO SISTEMA DE CRÉDITOS AI
-- Zero impacto operacional: tabelas e funções de leitura.
-- Nenhuma trava é ativada nesta migração.
-- =============================================

-- 1. Colunas extras em professionals
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS is_partner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS academic_period int NULL;

COMMENT ON COLUMN public.professionals.is_partner IS 'Parceiro divulgador: chat do agente liberado consumindo créditos do PRO pessoal.';
COMMENT ON COLUMN public.professionals.academic_period IS 'Período acadêmico (1-10). Acima de 10, regras de PRO se aplicam ao chat/transcrição.';

-- 2. Quotas mensais por usuário
CREATE TABLE IF NOT EXISTS public.ai_credit_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier text NOT NULL,
  included_credits int NOT NULL DEFAULT 0,
  included_transcriptions int NOT NULL DEFAULT 0,
  rollover_credits int NOT NULL DEFAULT 0,
  used_credits int NOT NULL DEFAULT 0,
  used_transcriptions int NOT NULL DEFAULT 0,
  period_start timestamptz NOT NULL DEFAULT date_trunc('month', now()),
  period_end timestamptz NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  clinic_id uuid NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);

GRANT SELECT, INSERT, UPDATE ON public.ai_credit_quotas TO authenticated;
GRANT ALL ON public.ai_credit_quotas TO service_role;
ALTER TABLE public.ai_credit_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own quotas" ON public.ai_credit_quotas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages quotas" ON public.ai_credit_quotas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ai_quotas_user_period ON public.ai_credit_quotas(user_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_ai_quotas_clinic ON public.ai_credit_quotas(clinic_id) WHERE clinic_id IS NOT NULL;

-- 3. Log granular de uso de IA
CREATE TABLE IF NOT EXISTS public.ai_credit_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name text NOT NULL,
  credits_used numeric(8,2) NOT NULL DEFAULT 0,
  transcriptions_used int NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  was_blocked boolean NOT NULL DEFAULT false,
  was_bypassed boolean NOT NULL DEFAULT false,
  bypass_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_credit_usage TO authenticated;
GRANT ALL ON public.ai_credit_usage TO service_role;
ALTER TABLE public.ai_credit_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own usage" ON public.ai_credit_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages usage" ON public.ai_credit_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON public.ai_credit_usage(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_function ON public.ai_credit_usage(function_name, created_at DESC);

-- 4. Pacotes comprados (créditos extras e transcrições avulsas)
CREATE TABLE IF NOT EXISTS public.ai_credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id uuid NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  package_type text NOT NULL,
  credits_total int NOT NULL DEFAULT 0,
  credits_remaining int NOT NULL DEFAULT 0,
  transcriptions_total int NOT NULL DEFAULT 0,
  transcriptions_remaining int NOT NULL DEFAULT 0,
  price_paid numeric(10,2) NOT NULL,
  stripe_session_id text NULL,
  stripe_payment_intent_id text NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 months'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_credit_packages TO authenticated;
GRANT ALL ON public.ai_credit_packages TO service_role;
ALTER TABLE public.ai_credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own packages" ON public.ai_credit_packages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages packages" ON public.ai_credit_packages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_ai_packages_user_active ON public.ai_credit_packages(user_id) WHERE credits_remaining > 0 OR transcriptions_remaining > 0;

-- 5. Histórico de transações (auditoria financeira)
CREATE TABLE IF NOT EXISTS public.ai_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id uuid NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  transaction_type text NOT NULL,
  product_key text NOT NULL,
  amount_brl numeric(10,2) NOT NULL DEFAULT 0,
  credits_delta int NOT NULL DEFAULT 0,
  transcriptions_delta int NOT NULL DEFAULT 0,
  stripe_session_id text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_credit_transactions TO authenticated;
GRANT ALL ON public.ai_credit_transactions TO service_role;
ALTER TABLE public.ai_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own transactions" ON public.ai_credit_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages transactions" ON public.ai_credit_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. Add-ons recorrentes do profissional (Chat Agente etc.)
CREATE TABLE IF NOT EXISTS public.professional_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addon_type text NOT NULL,
  status text NOT NULL DEFAULT 'inactive',
  stripe_subscription_id text NULL,
  stripe_customer_id text NULL,
  current_period_end timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, addon_type)
);

GRANT SELECT ON public.professional_addons TO authenticated;
GRANT ALL ON public.professional_addons TO service_role;
ALTER TABLE public.professional_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own addons" ON public.professional_addons
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role manages addons" ON public.professional_addons
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. Add-ons da clínica (uma assinatura libera para todos os membros)
CREATE TABLE IF NOT EXISTS public.clinic_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addon_type text NOT NULL,
  status text NOT NULL DEFAULT 'inactive',
  stripe_subscription_id text NULL,
  stripe_customer_id text NULL,
  current_period_end timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, addon_type)
);

GRANT SELECT ON public.clinic_addons TO authenticated;
GRANT ALL ON public.clinic_addons TO service_role;
ALTER TABLE public.clinic_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clinic members read clinic addons" ON public.clinic_addons
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.clinic_members cm
      WHERE cm.clinic_id = clinic_addons.clinic_id
        AND cm.user_id = auth.uid()
    )
  );
CREATE POLICY "Service role manages clinic addons" ON public.clinic_addons
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. Flag global de enforcement (rollback instantâneo)
INSERT INTO public.app_config (key, value)
VALUES ('ai_credits_enforced', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_config (key, value)
VALUES ('ai_credits_block_on_limit', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 9. Função de classificação de tier (apenas leitura, sem efeito colateral)
CREATE OR REPLACE FUNCTION public.get_user_ai_tier(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _is_vip boolean;
  _professional record;
  _clinic_member record;
BEGIN
  -- 1. Email
  SELECT email INTO _email FROM auth.users WHERE id = _user_id;
  IF _email IS NULL THEN RETURN 'unknown'; END IF;

  -- 2. Admin / VIP → unlimited
  SELECT EXISTS(SELECT 1 FROM public.vip_users WHERE lower(email) = lower(_email)) INTO _is_vip;
  IF _is_vip OR lower(_email) = 'gvallimoliveira@gmail.com' THEN
    RETURN 'unlimited';
  END IF;

  -- 3. Membro de clínica ativa?
  SELECT cm.clinic_id, c.subscription_tier, c.subscription_status
    INTO _clinic_member
    FROM public.clinic_members cm
    JOIN public.clinics c ON c.id = cm.clinic_id
    WHERE cm.user_id = _user_id
      AND c.subscription_status IN ('active', 'trialing')
    LIMIT 1;
  IF FOUND THEN
    RETURN 'clinic_' || COALESCE(_clinic_member.subscription_tier, 'small');
  END IF;

  -- 4. Perfil profissional
  SELECT id, plan_type, is_partner, academic_period, is_student
    INTO _professional
    FROM public.professionals
    WHERE user_id = _user_id
    LIMIT 1;

  IF FOUND THEN
    -- Acadêmico ativo (período 1-10)
    IF _professional.is_student AND COALESCE(_professional.academic_period, 0) BETWEEN 1 AND 10 THEN
      RETURN CASE WHEN _professional.plan_type = 'annual' THEN 'academic_annual' ELSE 'academic_monthly' END;
    END IF;
    -- Pro normal (inclui acadêmico além do 10º período)
    IF _professional.plan_type = 'annual' THEN RETURN 'pro_annual'; END IF;
    RETURN 'pro_monthly';
  END IF;

  -- 5. Default: paciente B2C
  RETURN 'premium_b2c';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_ai_tier(uuid) TO authenticated, service_role;

-- 10. Triggers updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_ai_quotas_touch ON public.ai_credit_quotas;
CREATE TRIGGER trg_ai_quotas_touch BEFORE UPDATE ON public.ai_credit_quotas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_professional_addons_touch ON public.professional_addons;
CREATE TRIGGER trg_professional_addons_touch BEFORE UPDATE ON public.professional_addons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_clinic_addons_touch ON public.clinic_addons;
CREATE TRIGGER trg_clinic_addons_touch BEFORE UPDATE ON public.clinic_addons
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
