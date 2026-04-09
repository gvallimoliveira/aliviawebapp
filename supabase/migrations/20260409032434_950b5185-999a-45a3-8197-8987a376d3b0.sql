
-- Table: professional_appointments
CREATE TABLE public.professional_appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  patient_email text,
  patient_name text NOT NULL DEFAULT '',
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 50,
  notes text,
  type text NOT NULL DEFAULT 'in_person',
  status text NOT NULL DEFAULT 'scheduled',
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.professional_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can manage their own appointments"
  ON public.professional_appointments FOR ALL
  USING (professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()))
  WITH CHECK (professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()));

CREATE INDEX idx_appointments_professional_date ON public.professional_appointments(professional_id, appointment_date);

-- Table: session_notes
CREATE TABLE public.session_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  patient_email text NOT NULL,
  appointment_id uuid REFERENCES public.professional_appointments(id) ON DELETE SET NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can manage their own session notes"
  ON public.session_notes FOR ALL
  USING (professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()))
  WITH CHECK (professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()));

CREATE INDEX idx_session_notes_professional_patient ON public.session_notes(professional_id, patient_email);

CREATE TRIGGER update_session_notes_updated_at
  BEFORE UPDATE ON public.session_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
