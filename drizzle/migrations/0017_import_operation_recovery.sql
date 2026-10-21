ALTER TABLE public.import_batches ADD COLUMN IF NOT EXISTS operation_id uuid;
CREATE INDEX IF NOT EXISTS import_batches_actor_operation ON public.import_batches(user_id, operation_id);
REVOKE INSERT, UPDATE, DELETE ON public.import_batches FROM authenticated, anon;
GRANT SELECT ON public.import_batches TO authenticated;
GRANT ALL ON public.import_batches TO service_role;
COMMENT ON COLUMN public.import_batches.operation_id IS 'Client correlation UUID scoped by authenticated actor for recovering all chunks after an interrupted import; never authorization.';