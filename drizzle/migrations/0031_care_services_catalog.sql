CREATE TABLE public.care_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES public.professionals(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  billing_type text NOT NULL DEFAULT 'per_session',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.care_services TO authenticated;
GRANT ALL ON public.care_services TO service_role;

ALTER TABLE public.care_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY care_services_read ON public.care_services
FOR SELECT TO authenticated
USING (
  (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
  OR (professional_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.professionals p WHERE p.id = care_services.professional_id AND p.user_id = auth.uid()
  ))
);

CREATE POLICY care_services_clinic_write ON public.care_services
FOR ALL TO authenticated
USING (clinic_id IS NOT NULL AND public.can_manage_clinic(auth.uid(), clinic_id))
WITH CHECK (clinic_id IS NOT NULL AND public.can_manage_clinic(auth.uid(), clinic_id));

CREATE POLICY care_services_pro_write ON public.care_services
FOR ALL TO authenticated
USING (
  clinic_id IS NULL AND EXISTS (
    SELECT 1 FROM public.professionals p WHERE p.id = care_services.professional_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  clinic_id IS NULL AND EXISTS (
    SELECT 1 FROM public.professionals p WHERE p.id = care_services.professional_id AND p.user_id = auth.uid()
  )
);

ALTER TABLE public.professional_appointments ADD COLUMN service_id uuid REFERENCES public.care_services(id) ON DELETE SET NULL;