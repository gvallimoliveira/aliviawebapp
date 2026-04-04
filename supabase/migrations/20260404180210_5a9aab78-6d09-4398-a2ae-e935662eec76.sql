
-- Exercise Library
CREATE TABLE public.exercise_library (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_pt text NOT NULL,
  name_en text NOT NULL DEFAULT '',
  name_es text NOT NULL DEFAULT '',
  description_pt text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  description_es text NOT NULL DEFAULT '',
  body_region text NOT NULL DEFAULT 'general',
  category text NOT NULL DEFAULT 'strengthening',
  video_url text,
  thumbnail_url text,
  difficulty text NOT NULL DEFAULT 'beginner',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read exercises"
  ON public.exercise_library FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage exercises"
  ON public.exercise_library FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Exercise Programs
CREATE TABLE public.exercise_programs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  patient_name text NOT NULL DEFAULT '',
  token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '90 days')
);

ALTER TABLE public.exercise_programs ENABLE ROW LEVEL SECURITY;

-- Professionals can manage their own programs
CREATE POLICY "Professionals manage own programs"
  ON public.exercise_programs FOR ALL
  TO authenticated
  USING (professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()))
  WITH CHECK (professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()));

-- Public read by token (for the HEP page)
CREATE POLICY "Anyone can read programs by token"
  ON public.exercise_programs FOR SELECT
  TO anon, authenticated
  USING (true);

-- Exercise Program Items
CREATE TABLE public.exercise_program_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES public.exercise_programs(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercise_library(id) ON DELETE CASCADE,
  sets text NOT NULL DEFAULT '3',
  reps text NOT NULL DEFAULT '10',
  frequency text NOT NULL DEFAULT '3x/semana',
  observations text,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.exercise_program_items ENABLE ROW LEVEL SECURITY;

-- Professionals can manage items of their programs
CREATE POLICY "Professionals manage own program items"
  ON public.exercise_program_items FOR ALL
  TO authenticated
  USING (program_id IN (
    SELECT ep.id FROM public.exercise_programs ep
    JOIN public.professionals p ON ep.professional_id = p.id
    WHERE p.user_id = auth.uid()
  ))
  WITH CHECK (program_id IN (
    SELECT ep.id FROM public.exercise_programs ep
    JOIN public.professionals p ON ep.professional_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- Public read for HEP page
CREATE POLICY "Anyone can read program items"
  ON public.exercise_program_items FOR SELECT
  TO anon, authenticated
  USING (true);
