
-- Enable pgvector for semantic search of knowledge articles
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================================================================
-- app_config: global server-side feature flags / config
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read app_config"
  ON public.app_config FOR SELECT TO authenticated USING (true);

-- Seed: clinical agent disabled globally by default (VIPs bypass in code)
INSERT INTO public.app_config (key, value)
VALUES ('clinical_agent_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- =========================================================================
-- agent_threads
-- =========================================================================
CREATE TABLE public.agent_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_threads_user ON public.agent_threads(user_id, updated_at DESC);
CREATE INDEX idx_agent_threads_patient ON public.agent_threads(patient_id) WHERE patient_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_threads TO authenticated;
GRANT ALL ON public.agent_threads TO service_role;

ALTER TABLE public.agent_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agent threads"
  ON public.agent_threads FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- agent_messages
-- =========================================================================
CREATE TABLE public.agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.agent_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  tokens_in INTEGER,
  tokens_out INTEGER,
  citations JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_messages_thread ON public.agent_messages(thread_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_messages TO authenticated;
GRANT ALL ON public.agent_messages TO service_role;

ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access messages of own threads"
  ON public.agent_messages FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_threads t
      WHERE t.id = thread_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agent_threads t
      WHERE t.id = thread_id AND t.user_id = auth.uid()
    )
  );

-- =========================================================================
-- agent_usage_daily
-- =========================================================================
CREATE TABLE public.agent_usage_daily (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

GRANT SELECT ON public.agent_usage_daily TO authenticated;
GRANT ALL ON public.agent_usage_daily TO service_role;

ALTER TABLE public.agent_usage_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own usage"
  ON public.agent_usage_daily FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- =========================================================================
-- agent_settings
-- =========================================================================
CREATE TABLE public.agent_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  anonymize_enabled BOOLEAN NOT NULL DEFAULT true,
  preferred_niches TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_settings TO authenticated;
GRANT ALL ON public.agent_settings TO service_role;

ALTER TABLE public.agent_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agent settings"
  ON public.agent_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- knowledge_articles (RAG base)
-- =========================================================================
CREATE TABLE public.knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  authors TEXT,
  year INTEGER,
  journal TEXT,
  pedro_score INTEGER CHECK (pedro_score IS NULL OR (pedro_score >= 0 AND pedro_score <= 10)),
  study_type TEXT,
  niche_tags TEXT[] NOT NULL DEFAULT '{}',
  abstract TEXT,
  key_findings TEXT,
  doi TEXT,
  source_url TEXT,
  embedding vector(3072),
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_niche ON public.knowledge_articles USING GIN (niche_tags);
CREATE INDEX idx_knowledge_pedro ON public.knowledge_articles(pedro_score DESC) WHERE approved = true;

GRANT SELECT ON public.knowledge_articles TO authenticated;
GRANT ALL ON public.knowledge_articles TO service_role;

ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read approved articles"
  ON public.knowledge_articles FOR SELECT TO authenticated
  USING (approved = true);

-- Admin write via service_role only (admin UI calls edge function)

-- =========================================================================
-- updated_at trigger function (shared, idempotent)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_agent_threads_updated_at
  BEFORE UPDATE ON public.agent_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_agent_settings_updated_at
  BEFORE UPDATE ON public.agent_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_knowledge_articles_updated_at
  BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_agent_usage_updated_at
  BEFORE UPDATE ON public.agent_usage_daily
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_app_config_updated_at
  BEFORE UPDATE ON public.app_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- Semantic search function for knowledge_articles
-- =========================================================================
CREATE OR REPLACE FUNCTION public.match_knowledge_articles(
  query_embedding vector(3072),
  match_count INT DEFAULT 5,
  niche_filter TEXT[] DEFAULT NULL,
  min_pedro INT DEFAULT 7
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  authors TEXT,
  year INTEGER,
  journal TEXT,
  pedro_score INTEGER,
  study_type TEXT,
  key_findings TEXT,
  doi TEXT,
  source_url TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    a.id, a.title, a.authors, a.year, a.journal,
    a.pedro_score, a.study_type, a.key_findings, a.doi, a.source_url,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_articles a
  WHERE a.approved = true
    AND a.embedding IS NOT NULL
    AND (a.pedro_score IS NULL OR a.pedro_score >= min_pedro)
    AND (niche_filter IS NULL OR a.niche_tags && niche_filter)
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
$$;
