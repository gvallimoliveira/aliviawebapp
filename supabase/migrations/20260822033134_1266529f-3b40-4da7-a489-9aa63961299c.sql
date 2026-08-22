CREATE TABLE public.patient_health_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_email text,
  patient_name text,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  author_name text,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  health_conditions text[] NOT NULL DEFAULT '{}',
  health_conditions_other text,
  health_conditions_other_onset text,
  health_conditions_other_control text,
  uses_continuous_medication text,
  continuous_medications text,
  change_summary text,
  observations text,
  suggestions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_phr_patient_id ON public.patient_health_records (patient_id);
CREATE INDEX idx_phr_patient_email ON public.patient_health_records (lower(patient_email));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_health_records TO authenticated;
GRANT ALL ON public.patient_health_records TO service_role;

ALTER TABLE public.patient_health_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "phr_select" ON public.patient_health_records FOR SELECT TO authenticated
USING (created_by = auth.uid() OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id)));

CREATE POLICY "phr_insert" ON public.patient_health_records FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "phr_update" ON public.patient_health_records FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id)))
WITH CHECK (created_by = auth.uid() OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id)));

CREATE POLICY "phr_delete" ON public.patient_health_records FOR DELETE TO authenticated
USING (created_by = auth.uid());

CREATE TRIGGER trg_phr_updated_at BEFORE UPDATE ON public.patient_health_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();