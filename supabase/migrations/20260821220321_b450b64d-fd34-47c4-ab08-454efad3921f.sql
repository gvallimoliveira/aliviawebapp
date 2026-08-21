ALTER TABLE public.session_notes ADD COLUMN IF NOT EXISTS observation text;

CREATE TABLE IF NOT EXISTS public.session_note_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  content text NOT NULL DEFAULT '',
  observation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_note_templates TO authenticated;
GRANT ALL ON public.session_note_templates TO service_role;

ALTER TABLE public.session_note_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own evolution templates"
ON public.session_note_templates FOR ALL TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS session_note_templates_owner_idx ON public.session_note_templates (owner_user_id, created_at DESC);