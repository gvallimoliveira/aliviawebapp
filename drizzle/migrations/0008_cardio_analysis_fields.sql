ALTER TABLE public.srpe_entries
  ADD COLUMN IF NOT EXISTS hr_recovery_1min integer,
  ADD COLUMN IF NOT EXISTS distance_km numeric,
  ADD COLUMN IF NOT EXISTS avg_power_w integer;
ALTER TABLE public.srpe_entries DROP CONSTRAINT IF EXISTS srpe_entries_hr_recovery_1min_chk;
ALTER TABLE public.srpe_entries ADD CONSTRAINT srpe_entries_hr_recovery_1min_chk CHECK (hr_recovery_1min IS NULL OR hr_recovery_1min BETWEEN 30 AND 240);
ALTER TABLE public.srpe_entries DROP CONSTRAINT IF EXISTS srpe_entries_distance_km_chk;
ALTER TABLE public.srpe_entries ADD CONSTRAINT srpe_entries_distance_km_chk CHECK (distance_km IS NULL OR (distance_km > 0 AND distance_km <= 500));
ALTER TABLE public.srpe_entries DROP CONSTRAINT IF EXISTS srpe_entries_avg_power_w_chk;
ALTER TABLE public.srpe_entries ADD CONSTRAINT srpe_entries_avg_power_w_chk CHECK (avg_power_w IS NULL OR avg_power_w BETWEEN 1 AND 2500);
COMMENT ON COLUMN public.srpe_entries.hr_recovery_1min IS 'FC (bpm) medida 1 minuto após o fim do esforço; recuperação = hr_max - hr_recovery_1min.';
COMMENT ON COLUMN public.srpe_entries.distance_km IS 'Distância da sessão (km), para ritmo e eficiência cardíaca.';
COMMENT ON COLUMN public.srpe_entries.avg_power_w IS 'Potência média (W) em bicicleta/ergômetro, para eficiência cardíaca.';
ALTER TABLE public.periodization_plans
  ADD COLUMN IF NOT EXISTS beta_blocker boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.periodization_plans.beta_blocker IS 'Paciente usa betabloqueador: análise cardiovascular usa PSE como guia principal.';