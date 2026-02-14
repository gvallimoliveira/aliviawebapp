
-- Drop the existing status check constraint and add the correct one
ALTER TABLE public.assessments DROP CONSTRAINT IF EXISTS assessments_status_check;
ALTER TABLE public.assessments ADD CONSTRAINT assessments_status_check CHECK (status IN ('in_progress', 'diagnosis_complete', 'completed'));
