
-- Create patient_files table
CREATE TABLE public.patient_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES public.professionals(id) ON DELETE CASCADE,
  patient_email text NOT NULL,
  patient_name text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size_bytes integer NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'application/pdf',
  description text,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patient_files ENABLE ROW LEVEL SECURITY;

-- Clinic members can view their clinic's patient files
CREATE POLICY "Clinic members can view clinic patient files"
ON public.patient_files FOR SELECT
TO authenticated
USING (clinic_id IS NOT NULL AND is_clinic_member(auth.uid(), clinic_id));

-- Clinic members can upload patient files
CREATE POLICY "Clinic members can upload patient files"
ON public.patient_files FOR INSERT
TO authenticated
WITH CHECK (
  (clinic_id IS NOT NULL AND is_clinic_member(auth.uid(), clinic_id) AND uploaded_by = auth.uid())
);

-- Clinic owners and therapists can delete patient files
CREATE POLICY "Clinic owners and therapists can delete patient files"
ON public.patient_files FOR DELETE
TO authenticated
USING (
  clinic_id IS NOT NULL AND get_clinic_role(auth.uid(), clinic_id) IN ('owner', 'therapist')
);

-- Solo professionals can manage their own patient files
CREATE POLICY "Professionals can view their patient files"
ON public.patient_files FOR SELECT
TO authenticated
USING (
  clinic_id IS NULL AND professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid())
);

CREATE POLICY "Professionals can upload their patient files"
ON public.patient_files FOR INSERT
TO authenticated
WITH CHECK (
  clinic_id IS NULL AND professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()) AND uploaded_by = auth.uid()
);

CREATE POLICY "Professionals can delete their patient files"
ON public.patient_files FOR DELETE
TO authenticated
USING (
  clinic_id IS NULL AND professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid())
);

-- Create storage bucket for patient files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('patient-files', 'patient-files', false, 20971520);

-- Storage policies
CREATE POLICY "Authenticated users can upload patient files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'patient-files');

CREATE POLICY "Authenticated users can view patient files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'patient-files');

CREATE POLICY "Authenticated users can delete patient files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'patient-files');
