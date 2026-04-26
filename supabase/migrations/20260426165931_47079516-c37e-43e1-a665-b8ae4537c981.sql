ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS idx_assessments_archived_at ON public.assessments(archived_at);