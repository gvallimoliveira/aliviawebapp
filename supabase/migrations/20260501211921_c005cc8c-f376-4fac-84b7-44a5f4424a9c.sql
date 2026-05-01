-- Table to track patients hidden/archived at the clinic level
CREATE TABLE IF NOT EXISTS public.clinic_hidden_patients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid NOT NULL,
  patient_email text NOT NULL,
  hidden_by uuid,
  hidden_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, patient_email)
);

CREATE INDEX IF NOT EXISTS idx_clinic_hidden_patients_clinic
  ON public.clinic_hidden_patients (clinic_id);

ALTER TABLE public.clinic_hidden_patients ENABLE ROW LEVEL SECURITY;

-- Any active clinic member can see the hidden list
CREATE POLICY "Clinic members can view hidden patients"
  ON public.clinic_hidden_patients
  FOR SELECT
  TO authenticated
  USING (public.is_clinic_member(auth.uid(), clinic_id));

-- Any active clinic member can hide a patient
CREATE POLICY "Clinic members can hide patients"
  ON public.clinic_hidden_patients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_clinic_member(auth.uid(), clinic_id)
    AND hidden_by = auth.uid()
  );

-- Any active clinic member can restore (delete the row)
CREATE POLICY "Clinic members can restore patients"
  ON public.clinic_hidden_patients
  FOR DELETE
  TO authenticated
  USING (public.is_clinic_member(auth.uid(), clinic_id));
