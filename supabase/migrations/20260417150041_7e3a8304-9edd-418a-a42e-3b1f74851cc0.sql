-- Table
CREATE TABLE public.patient_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES public.professionals(id) ON DELETE CASCADE,
  patient_email text NOT NULL,
  patient_name text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size_bytes integer NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'image/jpeg',
  category text NOT NULL DEFAULT 'postural',
  description text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_photos_clinic ON public.patient_photos(clinic_id, patient_email);
CREATE INDEX idx_patient_photos_pro ON public.patient_photos(professional_id, patient_email);

ALTER TABLE public.patient_photos ENABLE ROW LEVEL SECURITY;

-- RLS: clinic
CREATE POLICY "Clinic members can view clinic patient photos"
ON public.patient_photos FOR SELECT TO authenticated
USING (clinic_id IS NOT NULL AND is_clinic_member(auth.uid(), clinic_id));

CREATE POLICY "Clinic members can upload patient photos"
ON public.patient_photos FOR INSERT TO authenticated
WITH CHECK (clinic_id IS NOT NULL AND is_clinic_member(auth.uid(), clinic_id) AND uploaded_by = auth.uid());

CREATE POLICY "Clinic owners and therapists can delete patient photos"
ON public.patient_photos FOR DELETE TO authenticated
USING (clinic_id IS NOT NULL AND get_clinic_role(auth.uid(), clinic_id) = ANY (ARRAY['owner'::clinic_role, 'therapist'::clinic_role]));

-- RLS: solo professionals
CREATE POLICY "Professionals can view their patient photos"
ON public.patient_photos FOR SELECT TO authenticated
USING (clinic_id IS NULL AND professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));

CREATE POLICY "Professionals can upload their patient photos"
ON public.patient_photos FOR INSERT TO authenticated
WITH CHECK (clinic_id IS NULL AND professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()) AND uploaded_by = auth.uid());

CREATE POLICY "Professionals can delete their patient photos"
ON public.patient_photos FOR DELETE TO authenticated
USING (clinic_id IS NULL AND professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));

-- Bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('patient-photos', 'patient-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS (mirror patient-files structure: prefix is "clinic/<id>/..." or "pro/<id>/...")
CREATE POLICY "Clinic members read patient-photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'patient-photos'
  AND (storage.foldername(name))[1] = 'clinic'
  AND is_clinic_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Clinic members upload patient-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'patient-photos'
  AND (storage.foldername(name))[1] = 'clinic'
  AND is_clinic_member(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Clinic managers delete patient-photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'patient-photos'
  AND (storage.foldername(name))[1] = 'clinic'
  AND get_clinic_role(auth.uid(), ((storage.foldername(name))[2])::uuid) = ANY (ARRAY['owner'::clinic_role, 'therapist'::clinic_role])
);

CREATE POLICY "Pros read own patient-photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'patient-photos'
  AND (storage.foldername(name))[1] = 'pro'
  AND ((storage.foldername(name))[2])::uuid IN (SELECT id FROM professionals WHERE user_id = auth.uid())
);

CREATE POLICY "Pros upload own patient-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'patient-photos'
  AND (storage.foldername(name))[1] = 'pro'
  AND ((storage.foldername(name))[2])::uuid IN (SELECT id FROM professionals WHERE user_id = auth.uid())
);

CREATE POLICY "Pros delete own patient-photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'patient-photos'
  AND (storage.foldername(name))[1] = 'pro'
  AND ((storage.foldername(name))[2])::uuid IN (SELECT id FROM professionals WHERE user_id = auth.uid())
);