CREATE POLICY "Care team reads diary entries linked to accessible assessments"
ON public.pain_diary_entries FOR SELECT TO authenticated
USING (
  assessment_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = pain_diary_entries.assessment_id)
);