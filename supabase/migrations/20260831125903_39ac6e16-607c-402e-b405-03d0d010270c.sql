CREATE TABLE public.assessment_addenda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  author_type TEXT NOT NULL DEFAULT 'professional',
  author_user_id UUID,
  author_name TEXT,
  token TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'submitted',
  considered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessment_addenda_assessment ON public.assessment_addenda(assessment_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_addenda TO authenticated;
GRANT ALL ON public.assessment_addenda TO service_role;

ALTER TABLE public.assessment_addenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assessment owners and pros can view addenda"
ON public.assessment_addenda FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_addenda.assessment_id
      AND (
        a.user_id = auth.uid()
        OR a.professional_id = auth.uid()
        OR (a.clinic_id IS NOT NULL AND public.is_clinic_member(a.clinic_id, auth.uid()))
      )
  )
);

CREATE POLICY "Assessment owners and pros can create addenda"
ON public.assessment_addenda FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_addenda.assessment_id
      AND (
        a.user_id = auth.uid()
        OR a.professional_id = auth.uid()
        OR (a.clinic_id IS NOT NULL AND public.is_clinic_member(a.clinic_id, auth.uid()))
      )
  )
);

CREATE POLICY "Pros can update addenda"
ON public.assessment_addenda FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_addenda.assessment_id
      AND (
        a.professional_id = auth.uid()
        OR (a.clinic_id IS NOT NULL AND public.is_clinic_member(a.clinic_id, auth.uid()))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_addenda.assessment_id
      AND (
        a.professional_id = auth.uid()
        OR (a.clinic_id IS NOT NULL AND public.is_clinic_member(a.clinic_id, auth.uid()))
      )
  )
);

CREATE POLICY "Pros can delete addenda"
ON public.assessment_addenda FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_addenda.assessment_id
      AND (
        a.professional_id = auth.uid()
        OR (a.clinic_id IS NOT NULL AND public.is_clinic_member(a.clinic_id, auth.uid()))
      )
  )
);

CREATE TRIGGER update_assessment_addenda_updated_at
BEFORE UPDATE ON public.assessment_addenda
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();