ALTER TABLE public.pending_questionnaires DROP CONSTRAINT IF EXISTS pending_questionnaires_domain_check;
ALTER TABLE public.pending_questionnaires ADD CONSTRAINT pending_questionnaires_domain_check CHECK (domain = ANY (ARRAY['general'::text, 'cardio'::text, 'geri'::text]));

ALTER TABLE public.pending_questionnaires DROP CONSTRAINT IF EXISTS pending_questionnaires_status_check;
ALTER TABLE public.pending_questionnaires ADD CONSTRAINT pending_questionnaires_status_check CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'skipped'::text, 'cancelled'::text]));