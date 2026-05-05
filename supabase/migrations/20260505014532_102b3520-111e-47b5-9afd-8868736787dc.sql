ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS final_hypothesis text,
  ADD COLUMN IF NOT EXISTS final_hypothesis_by uuid,
  ADD COLUMN IF NOT EXISTS final_hypothesis_at timestamptz;