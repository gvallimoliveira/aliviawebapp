CREATE TABLE IF NOT EXISTS public.studio_copy_learning (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  brand_id UUID NOT NULL,
  signature TEXT NOT NULL,
  original_text TEXT NOT NULL,
  edited_text TEXT NOT NULL,
  uses INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, signature)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_copy_learning TO authenticated;
GRANT ALL ON public.studio_copy_learning TO service_role;
ALTER TABLE public.studio_copy_learning ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own copy learning" ON public.studio_copy_learning FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS studio_copy_learning_brand_idx ON public.studio_copy_learning (brand_id);

CREATE TABLE IF NOT EXISTS public.studio_brand_briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  brand_id UUID NOT NULL,
  kit_version TEXT NOT NULL,
  brief JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, kit_version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_brand_briefs TO authenticated;
GRANT ALL ON public.studio_brand_briefs TO service_role;
ALTER TABLE public.studio_brand_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own brand briefs" ON public.studio_brand_briefs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS studio_brand_briefs_brand_idx ON public.studio_brand_briefs (brand_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.studio_director_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  brand_id UUID NOT NULL,
  batch_key TEXT NOT NULL,
  ai_on BOOLEAN NOT NULL DEFAULT false,
  arts INTEGER NOT NULL DEFAULT 0,
  distinct_copy INTEGER NOT NULL DEFAULT 0,
  repeated_copy INTEGER NOT NULL DEFAULT 0,
  learned_applied INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, batch_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_director_runs TO authenticated;
GRANT ALL ON public.studio_director_runs TO service_role;
ALTER TABLE public.studio_director_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own director runs" ON public.studio_director_runs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);