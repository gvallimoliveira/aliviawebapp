ALTER TABLE public.periodization_plans
  ADD COLUMN IF NOT EXISTS cardio_profile text,
  ADD COLUMN IF NOT EXISTS hr_ceiling_override smallint;
ALTER TABLE public.periodization_plans DROP CONSTRAINT IF EXISTS periodization_plans_cardio_profile_chk;
ALTER TABLE public.periodization_plans ADD CONSTRAINT periodization_plans_cardio_profile_chk
  CHECK (cardio_profile IS NULL OR cardio_profile IN ('athletic','healthy','sedentary','hypertensive','cardiac'));
ALTER TABLE public.periodization_plans ADD CONSTRAINT periodization_plans_hr_ceiling_chk
  CHECK (hr_ceiling_override IS NULL OR hr_ceiling_override BETWEEN 60 AND 230);
ALTER TABLE public.readiness_checkins
  ADD COLUMN IF NOT EXISTS peak_hr smallint,
  ADD COLUMN IF NOT EXISTS spo2 smallint;
ALTER TABLE public.readiness_checkins ADD CONSTRAINT readiness_checkins_peak_hr_chk CHECK (peak_hr IS NULL OR peak_hr BETWEEN 40 AND 240);
ALTER TABLE public.readiness_checkins ADD CONSTRAINT readiness_checkins_spo2_chk CHECK (spo2 IS NULL OR spo2 BETWEEN 70 AND 100);