
ALTER TABLE public.agent_threads ADD COLUMN IF NOT EXISTS mentor_mode boolean NOT NULL DEFAULT false;

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS is_study_case boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_patients_study_case ON public.patients(professional_id, is_study_case) WHERE is_study_case = true;

CREATE TABLE IF NOT EXISTS public.academic_quiz_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id uuid REFERENCES public.agent_threads(id) ON DELETE SET NULL,
  topic text NOT NULL DEFAULT 'Geral',
  total_questions int NOT NULL CHECK (total_questions > 0),
  correct int NOT NULL CHECK (correct >= 0),
  score_pct numeric(5,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.academic_quiz_results TO authenticated;
GRANT ALL ON public.academic_quiz_results TO service_role;

ALTER TABLE public.academic_quiz_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own quiz results"
  ON public.academic_quiz_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quiz results"
  ON public.academic_quiz_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_academic_quiz_user_date ON public.academic_quiz_results(user_id, created_at DESC);
