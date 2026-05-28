
CREATE TABLE public.hep_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  body_region TEXT NOT NULL DEFAULT 'general',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX hep_templates_professional_idx ON public.hep_templates(professional_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hep_templates TO authenticated;
GRANT ALL ON public.hep_templates TO service_role;

ALTER TABLE public.hep_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pros manage own hep templates"
ON public.hep_templates
FOR ALL
TO authenticated
USING (professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid()))
WITH CHECK (professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid()));
