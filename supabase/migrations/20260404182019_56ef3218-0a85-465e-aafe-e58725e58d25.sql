ALTER TABLE public.exercise_program_items ALTER COLUMN exercise_id DROP NOT NULL;
ALTER TABLE public.exercise_program_items ADD COLUMN custom_name text;
ALTER TABLE public.exercise_program_items ADD COLUMN custom_video_url text;