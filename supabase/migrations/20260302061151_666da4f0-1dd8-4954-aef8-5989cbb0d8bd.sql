
-- Pain diary entries table
CREATE TABLE public.pain_diary_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  pain_score INTEGER NOT NULL CHECK (pain_score >= 0 AND pain_score <= 10),
  notes TEXT,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_daily_entry UNIQUE (user_id, logged_at)
);

-- Enable RLS
ALTER TABLE public.pain_diary_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own diary entries"
ON public.pain_diary_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own diary entries"
ON public.pain_diary_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diary entries"
ON public.pain_diary_entries FOR UPDATE
USING (auth.uid() = user_id);
