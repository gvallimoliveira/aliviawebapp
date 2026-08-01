ALTER TABLE public.pain_diary_entries ADD COLUMN IF NOT EXISTS condition_key text;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'pain_diary_entries' AND c.contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.pain_diary_entries DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

DROP INDEX IF EXISTS public.pain_diary_entries_user_id_logged_at_key;
DROP INDEX IF EXISTS public.pain_diary_entries_user_day_uniq;

CREATE UNIQUE INDEX IF NOT EXISTS pain_diary_entries_user_day_condition_uniq
  ON public.pain_diary_entries (user_id, logged_at, coalesce(condition_key, ''));

CREATE INDEX IF NOT EXISTS pain_diary_entries_user_condition_logged_idx
  ON public.pain_diary_entries (user_id, condition_key, logged_at);