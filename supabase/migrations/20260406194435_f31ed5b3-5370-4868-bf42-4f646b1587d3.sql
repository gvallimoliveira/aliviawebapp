
-- Table for tracking daily exercise completion
CREATE TABLE public.exercise_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  program_id UUID REFERENCES public.exercise_programs(id) ON DELETE CASCADE NOT NULL,
  exercise_item_id UUID REFERENCES public.exercise_program_items(id) ON DELETE CASCADE NOT NULL,
  completed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, exercise_item_id, completed_at)
);

ALTER TABLE public.exercise_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own completions"
  ON public.exercise_completions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completions"
  ON public.exercise_completions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completions"
  ON public.exercise_completions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Professionals can view completions for their programs
CREATE POLICY "Professionals can view completions for their programs"
  ON public.exercise_completions FOR SELECT
  TO authenticated
  USING (program_id IN (
    SELECT ep.id FROM exercise_programs ep
    JOIN professionals p ON ep.professional_id = p.id
    WHERE p.user_id = auth.uid()
  ));
