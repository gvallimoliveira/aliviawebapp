ALTER TABLE public.studio_brands
  ADD COLUMN IF NOT EXISTS audiences jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS positioning text,
  ADD COLUMN IF NOT EXISTS strategy_notes text;

COMMENT ON COLUMN public.studio_brands.audiences IS 'Segmentos/nichos da marca: [{id,label,description,pains,desires,proof,cta}]. Vazio = apenas conteúdo global 360.';
COMMENT ON COLUMN public.studio_brands.positioning IS 'Leitura do produto/empresa que alimenta o conteúdo global 360.';
COMMENT ON COLUMN public.studio_brands.strategy_notes IS 'Notas de estratégia de conteúdo (informar, desejo, dor, venda).';