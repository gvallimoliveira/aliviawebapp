-- Fix CHECK constraints to include professional type and red_flagged status
ALTER TABLE public.assessments DROP CONSTRAINT assessments_type_check;
ALTER TABLE public.assessments ADD CONSTRAINT assessments_type_check 
  CHECK (type = ANY (ARRAY['basic'::text, 'premium'::text, 'professional'::text]));

ALTER TABLE public.assessments DROP CONSTRAINT assessments_status_check;
ALTER TABLE public.assessments ADD CONSTRAINT assessments_status_check 
  CHECK (status = ANY (ARRAY['in_progress'::text, 'diagnosis_complete'::text, 'completed'::text, 'red_flagged'::text]));
