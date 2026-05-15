
-- Voice notes table
CREATE TABLE public.assessment_voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','ready','failed')),
  transcript TEXT,
  summary JSONB,
  duration_seconds INTEGER,
  language TEXT DEFAULT 'pt',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_notes_assessment ON public.assessment_voice_notes(assessment_id);
CREATE INDEX idx_voice_notes_patient ON public.assessment_voice_notes(patient_id);
CREATE INDEX idx_voice_notes_professional ON public.assessment_voice_notes(professional_id);
CREATE INDEX idx_voice_notes_clinic ON public.assessment_voice_notes(clinic_id);

ALTER TABLE public.assessment_voice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voice notes: select by owner or clinic member"
ON public.assessment_voice_notes FOR SELECT
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = professional_id AND p.user_id = auth.uid()
  )
  OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
);

CREATE POLICY "Voice notes: insert by professional or clinic member"
ON public.assessment_voice_notes FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND (
    EXISTS (SELECT 1 FROM public.professionals p WHERE p.id = professional_id AND p.user_id = auth.uid())
    OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
  )
);

CREATE POLICY "Voice notes: update by owner or clinic member"
ON public.assessment_voice_notes FOR UPDATE
USING (
  created_by = auth.uid()
  OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
);

CREATE POLICY "Voice notes: delete by owner"
ON public.assessment_voice_notes FOR DELETE
USING (created_by = auth.uid());

CREATE TRIGGER update_assessment_voice_notes_updated_at
BEFORE UPDATE ON public.assessment_voice_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.assessment_voice_notes;
ALTER TABLE public.assessment_voice_notes REPLICA IDENTITY FULL;

-- Temporary audio bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-notes-tmp', 'voice-notes-tmp', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "voice-notes-tmp: authenticated upload own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voice-notes-tmp' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "voice-notes-tmp: authenticated read own folder"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'voice-notes-tmp' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "voice-notes-tmp: authenticated delete own folder"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'voice-notes-tmp' AND auth.uid()::text = (storage.foldername(name))[1]);
