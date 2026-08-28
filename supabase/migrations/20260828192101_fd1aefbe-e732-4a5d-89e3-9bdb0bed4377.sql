CREATE TABLE public.studio_phrase_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.studio_brands(id) ON DELETE CASCADE,
  signature text NOT NULL,
  kind text NOT NULL DEFAULT 'copy',
  uses integer NOT NULL DEFAULT 1,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_id, signature)
);

CREATE INDEX idx_studio_phrase_memory_brand ON public.studio_phrase_memory(brand_id, last_used_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_phrase_memory TO authenticated;
GRANT ALL ON public.studio_phrase_memory TO service_role;

ALTER TABLE public.studio_phrase_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "studio_phrase_memory_owner_all" ON public.studio_phrase_memory
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.studio_phrase_memory IS 'Memória anti-repetição do motor criativo: assinaturas de frases já expostas por marca.';