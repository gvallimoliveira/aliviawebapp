CREATE TABLE public.public_basic_assessment_usage (assessment_id uuid PRIMARY KEY, email_key text NOT NULL, used_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.public_basic_assessment_usage TO service_role;
ALTER TABLE public.public_basic_assessment_usage ENABLE ROW LEVEL SECURITY;
CREATE INDEX public_basic_usage_email_time ON public.public_basic_assessment_usage(email_key, used_at);
INSERT INTO public.public_basic_assessment_usage(assessment_id,email_key,used_at) SELECT id,md5(lower(btrim(patient_email))),created_at FROM public.assessments WHERE type='basic' AND patient_email IS NOT NULL ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.reserve_public_basic_assessment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE normalized_email text; email_hash text; used_count integer;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF OLD.type='basic' AND current_user IS NOT NULL AND coalesce(auth.role(),'') <> 'service_role' AND (NEW.patient_email IS DISTINCT FROM OLD.patient_email OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.type IS DISTINCT FROM OLD.type OR NEW.professional_id IS DISTINCT FROM OLD.professional_id OR NEW.clinic_id IS DISTINCT FROM OLD.clinic_id) THEN
   RAISE EXCEPTION 'basic_assessment_identity_locked' USING ERRCODE='P0001';
  END IF;
  RETURN NEW;
 END IF;
 IF NEW.type <> 'basic' THEN RETURN NEW; END IF;
 normalized_email := lower(btrim(coalesce(NEW.patient_email,'')));
 IF length(normalized_email)>254 OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'basic_assessment_email_required' USING ERRCODE='P0001'; END IF;
 email_hash := md5(normalized_email);
 PERFORM pg_advisory_xact_lock(hashtextextended('public-basic:' || email_hash,0));
 SELECT count(*) INTO used_count FROM public.public_basic_assessment_usage WHERE email_key=email_hash AND used_at > now()-interval '30 days';
 IF used_count >= 2 THEN RAISE EXCEPTION 'free_assessment_limit' USING ERRCODE='P0001'; END IF;
 NEW.patient_email := normalized_email;
 NEW.created_at := now();
 INSERT INTO public.public_basic_assessment_usage(assessment_id,email_key,used_at) VALUES (NEW.id,email_hash,now());
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.reserve_public_basic_assessment() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER reserve_public_basic_assessment BEFORE INSERT OR UPDATE ON public.assessments FOR EACH ROW EXECUTE FUNCTION public.reserve_public_basic_assessment();