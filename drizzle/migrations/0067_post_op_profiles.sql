CREATE OR REPLACE FUNCTION public.can_use_post_op_beta()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) IN ('gvallimoliveira@gmail.com', 'gvallim.fisio@gmail.com')
$$;

CREATE TABLE public.post_op_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  surgery_type text NOT NULL DEFAULT 'acl_reconstruction',
  surgery_date date NOT NULL,
  graft_type text,
  meniscal_repair boolean NOT NULL DEFAULT false,
  surgeon_restrictions text,
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_op_profiles TO authenticated;
GRANT ALL ON public.post_op_profiles TO service_role;
ALTER TABLE public.post_op_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post-op beta access" ON public.post_op_profiles FOR ALL TO authenticated
USING (public.can_use_post_op_beta() AND public.can_access_patient(patient_id, auth.uid()))
WITH CHECK (public.can_use_post_op_beta() AND public.can_access_patient(patient_id, auth.uid()));

CREATE TRIGGER post_op_profiles_updated BEFORE UPDATE ON public.post_op_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();