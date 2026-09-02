ALTER TABLE public.periodization_cycles
  ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marked_current_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS periodization_cycles_one_current_per_plan
  ON public.periodization_cycles (plan_id, level)
  WHERE is_current;