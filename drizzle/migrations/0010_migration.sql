CREATE TABLE public.cardio_functional_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  test_date date NOT NULL,
  test_type text NOT NULL CHECK (test_type IN ('tsl1','tc6m','td6m')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cardio_functional_tests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cardio_functional_tests TO authenticated;
CREATE POLICY "cft access" ON public.cardio_functional_tests FOR ALL TO authenticated
  USING (public.can_access_patient(patient_id, auth.uid()))
  WITH CHECK (public.can_access_patient(patient_id, auth.uid()));
CREATE INDEX cft_patient_idx ON public.cardio_functional_tests(patient_id, test_date DESC);