CREATE TABLE public.form_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  form_key text NOT NULL,
  scope_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, form_key, scope_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_drafts TO authenticated;
GRANT ALL ON public.form_drafts TO service_role;

ALTER TABLE public.form_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own drafts" ON public.form_drafts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own drafts" ON public.form_drafts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own drafts" ON public.form_drafts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own drafts" ON public.form_drafts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_form_drafts_user_form ON public.form_drafts(user_id, form_key);

CREATE TRIGGER trg_form_drafts_updated_at
  BEFORE UPDATE ON public.form_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();