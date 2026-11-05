CREATE TABLE public.physiotech_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  clinic_id uuid,
  professional_id uuid,
  sent_by uuid NOT NULL,
  exam_type text NOT NULL,
  exam_title text,
  exam_date timestamptz,
  conclusion text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  pdf_url text,
  file_id uuid REFERENCES public.patient_files(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.physiotech_reports TO authenticated;
GRANT ALL ON public.physiotech_reports TO service_role;
ALTER TABLE public.physiotech_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team reads physiotech reports" ON public.physiotech_reports
  FOR SELECT TO authenticated USING (public.can_access_patient(patient_id, auth.uid()));
CREATE POLICY "Sender deletes physiotech reports" ON public.physiotech_reports
  FOR DELETE TO authenticated USING (sent_by = auth.uid());
CREATE INDEX physiotech_reports_patient_idx ON public.physiotech_reports(patient_id, created_at DESC);