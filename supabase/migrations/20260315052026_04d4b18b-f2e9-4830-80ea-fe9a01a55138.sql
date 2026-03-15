CREATE TABLE public.professional_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(professional_id, assessment_id)
);

ALTER TABLE public.professional_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pros can manage own notes" ON public.professional_notes
  FOR ALL TO authenticated
  USING (professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()))
  WITH CHECK (professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));