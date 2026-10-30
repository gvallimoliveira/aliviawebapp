CREATE TABLE public.pre_op_profiles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 patient_id uuid NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
 surgery_type text NOT NULL DEFAULT 'acl_reconstruction' CHECK (surgery_type = 'acl_reconstruction'),
 planned_surgery_date date,
 graft_type text,
 meniscal_repair boolean NOT NULL DEFAULT false,
 surgeon_restrictions text,
 criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pre_op_profiles TO authenticated;
GRANT ALL ON public.pre_op_profiles TO service_role;
ALTER TABLE public.pre_op_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pre-op beta access" ON public.pre_op_profiles FOR ALL TO authenticated
 USING (public.can_use_post_op_beta() AND public.can_access_patient(patient_id, auth.uid()))
 WITH CHECK (public.can_use_post_op_beta() AND public.can_access_patient(patient_id, auth.uid()));
CREATE TRIGGER pre_op_profiles_updated BEFORE UPDATE ON public.pre_op_profiles
 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
COMMENT ON TABLE public.pre_op_profiles IS 'ACL preparation distinct from performed surgery; planned date optional, no automatic transition to postoperative care.';