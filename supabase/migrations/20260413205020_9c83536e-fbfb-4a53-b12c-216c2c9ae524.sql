
-- Create patients table
CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid REFERENCES public.professionals(id) ON DELETE CASCADE,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  cpf text,
  birth_date date,
  phone text,
  address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT patients_has_owner CHECK (professional_id IS NOT NULL OR clinic_id IS NOT NULL)
);

-- Unique constraints to avoid duplicates (only when email is not null)
CREATE UNIQUE INDEX idx_patients_email_professional ON public.patients (email, professional_id) WHERE email IS NOT NULL AND professional_id IS NOT NULL;
CREATE UNIQUE INDEX idx_patients_email_clinic ON public.patients (email, clinic_id) WHERE email IS NOT NULL AND clinic_id IS NOT NULL;

-- Index for lookups
CREATE INDEX idx_patients_professional_id ON public.patients (professional_id);
CREATE INDEX idx_patients_clinic_id ON public.patients (clinic_id);
CREATE INDEX idx_patients_full_name ON public.patients (full_name);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Professionals can view their own patients
CREATE POLICY "Professionals can view their patients"
ON public.patients FOR SELECT
USING (professional_id IN (SELECT p.id FROM professionals p WHERE p.user_id = auth.uid()));

-- Professionals can create their own patients
CREATE POLICY "Professionals can create their patients"
ON public.patients FOR INSERT
WITH CHECK (professional_id IN (SELECT p.id FROM professionals p WHERE p.user_id = auth.uid()));

-- Professionals can update their own patients
CREATE POLICY "Professionals can update their patients"
ON public.patients FOR UPDATE
USING (professional_id IN (SELECT p.id FROM professionals p WHERE p.user_id = auth.uid()));

-- Professionals can delete their own patients
CREATE POLICY "Professionals can delete their patients"
ON public.patients FOR DELETE
USING (professional_id IN (SELECT p.id FROM professionals p WHERE p.user_id = auth.uid()));

-- Clinic members can view clinic patients
CREATE POLICY "Clinic members can view clinic patients"
ON public.patients FOR SELECT
USING (clinic_id IS NOT NULL AND is_clinic_member(auth.uid(), clinic_id));

-- Clinic owners, therapists and secretaries can create clinic patients
CREATE POLICY "Clinic members can create clinic patients"
ON public.patients FOR INSERT
WITH CHECK (clinic_id IS NOT NULL AND is_clinic_member(auth.uid(), clinic_id));

-- Clinic owners and therapists can update clinic patients
CREATE POLICY "Clinic owners and therapists can update clinic patients"
ON public.patients FOR UPDATE
USING (clinic_id IS NOT NULL AND get_clinic_role(auth.uid(), clinic_id) IN ('owner', 'therapist'));

-- Clinic owners and therapists can delete clinic patients
CREATE POLICY "Clinic owners and therapists can delete clinic patients"
ON public.patients FOR DELETE
USING (clinic_id IS NOT NULL AND get_clinic_role(auth.uid(), clinic_id) IN ('owner', 'therapist'));

-- Trigger for updated_at
CREATE TRIGGER update_patients_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Allow anon insert for pre-assessment flow (patient without auth creating their own record)
CREATE POLICY "Anyone can create patient during assessment"
ON public.patients FOR INSERT
WITH CHECK (clinic_id IS NOT NULL OR professional_id IS NOT NULL);
