
CREATE TABLE public.professional_hidden_patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  patient_email text NOT NULL,
  hidden_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (professional_id, patient_email)
);

ALTER TABLE public.professional_hidden_patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can manage their hidden patients"
  ON public.professional_hidden_patients FOR ALL
  TO authenticated
  USING (
    professional_id IN (
      SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    professional_id IN (
      SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()
    )
  );
