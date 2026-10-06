ALTER TABLE public.exercise_program_items
  ADD COLUMN IF NOT EXISTS load_kg numeric,
  ADD COLUMN IF NOT EXISTS load_type text,
  ADD COLUMN IF NOT EXISTS body_region text;