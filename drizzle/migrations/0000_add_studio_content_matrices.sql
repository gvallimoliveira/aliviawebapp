ALTER TABLE public.studio_brands
  ADD COLUMN IF NOT EXISTS keyword_matrix jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reasoning_matrix jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.studio_brands.keyword_matrix IS 'Matriz lexical estruturada: termo técnico, percepção humana, associações, públicos e tema.';
COMMENT ON COLUMN public.studio_brands.reasoning_matrix IS 'Matriz narrativa estruturada: cena/sintoma, mecanismo, ponte/prova, consequência/desejo e CTA.';