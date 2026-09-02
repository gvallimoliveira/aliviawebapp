ALTER TABLE public.exercise_library
  ADD COLUMN IF NOT EXISTS video_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS video_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS video_check_note text;

CREATE TABLE IF NOT EXISTS public.exercise_video_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'cron',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  checked_count integer NOT NULL DEFAULT 0,
  ok_count integer NOT NULL DEFAULT 0,
  broken_count integer NOT NULL DEFAULT 0,
  mismatch_count integer NOT NULL DEFAULT 0,
  fixed_count integer NOT NULL DEFAULT 0,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text
);

GRANT SELECT ON public.exercise_video_audit_runs TO authenticated;
GRANT ALL ON public.exercise_video_audit_runs TO service_role;

ALTER TABLE public.exercise_video_audit_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view video audit runs" ON public.exercise_video_audit_runs;
CREATE POLICY "Admins can view video audit runs"
  ON public.exercise_video_audit_runs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS exercise_video_audit_runs_started_idx
  ON public.exercise_video_audit_runs (started_at DESC);