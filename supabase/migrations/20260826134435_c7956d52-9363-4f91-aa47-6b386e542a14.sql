-- ============================================================
-- ALIV.IA STUDIO PÚBLICO — base multimarca
-- Produto separado do app clínico: qualquer nicho, marca do cliente.
-- ============================================================

CREATE TABLE public.studio_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  niche TEXT,
  logo_url TEXT,
  -- Kit visual: cores em HSL/HEX e fontes escolhidas no onboarding.
  colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  fonts JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Tom de voz e temas recorrentes guiam o conteúdo gerado.
  tone TEXT,
  topics TEXT[] NOT NULL DEFAULT '{}',
  source_url TEXT,
  instagram_handle TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_studio_brands_user ON public.studio_brands(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_brands TO authenticated;
GRANT ALL ON public.studio_brands TO service_role;
ALTER TABLE public.studio_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_brands_owner_all" ON public.studio_brands
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------
-- Saldo de artes: 5 gratuitas no cadastro (com marca d'água),
-- depois plano mensal + créditos extras avulsos.
-- ------------------------------------------------------------
CREATE TABLE public.studio_credits (
  user_id UUID NOT NULL PRIMARY KEY,
  plan TEXT NOT NULL DEFAULT 'free',
  free_credits INTEGER NOT NULL DEFAULT 5,
  plan_credits INTEGER NOT NULL DEFAULT 0,
  extra_credits INTEGER NOT NULL DEFAULT 0,
  used_this_period INTEGER NOT NULL DEFAULT 0,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  stripe_customer_id TEXT,
  subscription_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.studio_credits TO authenticated;
GRANT ALL ON public.studio_credits TO service_role;
ALTER TABLE public.studio_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_credits_owner_read" ON public.studio_credits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ------------------------------------------------------------
-- Galeria persistida (favoritos deixam de viver só no navegador).
-- ------------------------------------------------------------
CREATE TABLE public.studio_creations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  brand_id UUID REFERENCES public.studio_brands(id) ON DELETE CASCADE,
  seed TEXT NOT NULL,
  block_kind TEXT,
  format TEXT,
  headline TEXT,
  caption TEXT,
  thumb TEXT,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  watermarked BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_studio_creations_user ON public.studio_creations(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_creations TO authenticated;
GRANT ALL ON public.studio_creations TO service_role;
ALTER TABLE public.studio_creations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_creations_owner_all" ON public.studio_creations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------
-- updated_at automático
-- ------------------------------------------------------------
CREATE TRIGGER trg_studio_brands_updated_at
  BEFORE UPDATE ON public.studio_brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_studio_credits_updated_at
  BEFORE UPDATE ON public.studio_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- Garante o saldo inicial na primeira visita ao Studio.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_studio_credits()
RETURNS public.studio_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.studio_credits;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.studio_credits (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_row FROM public.studio_credits WHERE user_id = auth.uid();
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_studio_credits() TO authenticated;