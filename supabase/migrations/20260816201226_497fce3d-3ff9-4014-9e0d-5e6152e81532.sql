-- Passo A3: colunas opcionais em assessments (nenhuma escrita ainda)
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS pain_mechanism jsonb,
  ADD COLUMN IF NOT EXISTS pain_extent numeric;

COMMENT ON COLUMN public.assessments.pain_mechanism IS 'Mecanismo de dor (nociceptivo/neuropatico/nociplastico/misto) + eixo, confianca e sinais. Preenchido a partir de src/lib/painMechanism.ts. Nullable por design.';
COMMENT ON COLUMN public.assessments.pain_extent IS 'Pain extent: percentual estimado de superficie corporal marcada no mapa (0-100). Nullable por design.';

-- Passo A4: tabela de triagem de mecanismo / sensibilizacao central
CREATE TABLE IF NOT EXISTS public.pain_mechanism_screenings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  created_by uuid,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  csi_score integer,
  csi_band text,
  result jsonb,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pain_mechanism_screenings_assessment_idx
  ON public.pain_mechanism_screenings (assessment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pain_mechanism_screenings TO authenticated;
GRANT ALL ON public.pain_mechanism_screenings TO service_role;

ALTER TABLE public.pain_mechanism_screenings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mechanism screenings: select by owner or admin"
  ON public.pain_mechanism_screenings FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Mechanism screenings: insert by owner"
  ON public.pain_mechanism_screenings FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Mechanism screenings: update by owner"
  ON public.pain_mechanism_screenings FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Mechanism screenings: delete by owner"
  ON public.pain_mechanism_screenings FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE TRIGGER pain_mechanism_screenings_updated_at
  BEFORE UPDATE ON public.pain_mechanism_screenings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();