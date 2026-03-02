
-- Enable pg_cron and pg_net for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create follow_up_emails table
CREATE TABLE public.follow_up_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  week_number INTEGER NOT NULL CHECK (week_number IN (1, 2, 4, 6)),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.follow_up_emails ENABLE ROW LEVEL SECURITY;

-- Users can view their own follow-up records
CREATE POLICY "Users can view their own follow-ups"
  ON public.follow_up_emails FOR SELECT
  USING (auth.uid() = user_id);

-- Users can delete (opt-out) their own pending follow-ups
CREATE POLICY "Users can delete their own pending follow-ups"
  ON public.follow_up_emails FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- Service role inserts via trigger (no user INSERT policy needed)

-- Trigger function to auto-schedule follow-ups when premium assessment completes
CREATE OR REPLACE FUNCTION public.schedule_follow_up_emails()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  weeks INT[] := ARRAY[1, 2, 4, 6];
  days_offset INT[] := ARRAY[7, 14, 28, 42];
  i INT;
BEGIN
  -- Only for premium assessments changing to completed
  IF NEW.type = 'premium' AND NEW.status = 'completed' 
     AND (OLD.status IS NULL OR OLD.status <> 'completed')
     AND NEW.user_id IS NOT NULL THEN
    
    -- Get user email
    SELECT email INTO user_email FROM auth.users WHERE id = NEW.user_id;
    
    IF user_email IS NOT NULL THEN
      FOR i IN 1..4 LOOP
        INSERT INTO public.follow_up_emails (assessment_id, user_id, email, week_number, scheduled_for)
        VALUES (NEW.id, NEW.user_id, user_email, weeks[i], now() + (days_offset[i] || ' days')::INTERVAL);
      END LOOP;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on assessments
CREATE TRIGGER trigger_schedule_follow_ups
  AFTER INSERT OR UPDATE ON public.assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.schedule_follow_up_emails();
