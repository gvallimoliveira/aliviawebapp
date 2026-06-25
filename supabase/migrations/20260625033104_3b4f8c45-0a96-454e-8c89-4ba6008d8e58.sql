
-- 1. import_batches table
CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  source_filename text NOT NULL,
  source_format text,
  status text NOT NULL DEFAULT 'pending',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_undo_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  undone_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_batches TO authenticated;
GRANT ALL ON public.import_batches TO service_role;

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own import batches"
  ON public.import_batches FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Clinic admins view clinic batches"
  ON public.import_batches FOR SELECT
  USING (clinic_id IS NOT NULL AND public.can_manage_clinic(auth.uid(), clinic_id));

CREATE INDEX idx_import_batches_user ON public.import_batches(user_id);
CREATE INDEX idx_import_batches_clinic ON public.import_batches(clinic_id) WHERE clinic_id IS NOT NULL;

CREATE TRIGGER update_import_batches_updated_at
  BEFORE UPDATE ON public.import_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. external_import_data + import_batch_id columns
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS external_import_data jsonb,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES public.import_batches(id) ON DELETE SET NULL;

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS external_import_data jsonb,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES public.import_batches(id) ON DELETE SET NULL;

ALTER TABLE public.session_notes
  ADD COLUMN IF NOT EXISTS external_import_data jsonb,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES public.import_batches(id) ON DELETE SET NULL;

ALTER TABLE public.pain_diary_entries
  ADD COLUMN IF NOT EXISTS external_import_data jsonb,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES public.import_batches(id) ON DELETE SET NULL;

ALTER TABLE public.professional_appointments
  ADD COLUMN IF NOT EXISTS external_import_data jsonb,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid REFERENCES public.import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patients_import_batch ON public.patients(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assessments_import_batch ON public.assessments(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_session_notes_import_batch ON public.session_notes(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pain_diary_entries_import_batch ON public.pain_diary_entries(import_batch_id) WHERE import_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_professional_appointments_import_batch ON public.professional_appointments(import_batch_id) WHERE import_batch_id IS NOT NULL;
