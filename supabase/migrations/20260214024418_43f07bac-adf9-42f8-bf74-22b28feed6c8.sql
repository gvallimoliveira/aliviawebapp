
ALTER TABLE public.assessments DROP CONSTRAINT IF EXISTS assessments_payment_status_check;
ALTER TABLE public.assessments ADD CONSTRAINT assessments_payment_status_check CHECK (payment_status IN ('pending', 'paid', 'covered', 'failed'));
