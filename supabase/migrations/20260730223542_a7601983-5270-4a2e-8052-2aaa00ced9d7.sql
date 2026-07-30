CREATE TABLE public.consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  consent_type text NOT NULL,
  policy_version text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  subject_email text,
  subject_name text,
  scope_ref text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT, SELECT ON public.consent_records TO anon;
GRANT INSERT, SELECT ON public.consent_records TO authenticated;
GRANT ALL ON public.consent_records TO service_role;

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log their own consent"
  ON public.consent_records FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users read own consents"
  ON public.consent_records FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE INDEX idx_consent_records_user ON public.consent_records(user_id);
CREATE INDEX idx_consent_records_email ON public.consent_records(subject_email);

CREATE TABLE public.data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  details text,
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.data_subject_requests TO authenticated;
GRANT ALL ON public.data_subject_requests TO service_role;

ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own DSR"
  ON public.data_subject_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read own DSR"
  ON public.data_subject_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins update DSR"
  ON public.data_subject_requests FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER data_subject_requests_set_updated_at
  BEFORE UPDATE ON public.data_subject_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();