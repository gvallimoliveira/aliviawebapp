ALTER TABLE public.srpe_entries
  ADD COLUMN IF NOT EXISTS hr_avg integer,
  ADD COLUMN IF NOT EXISTS hr_max integer,
  ADD COLUMN IF NOT EXISTS zone_minutes jsonb,
  ADD COLUMN IF NOT EXISTS spo2_min integer,
  ADD COLUMN IF NOT EXISTS trimp numeric,
  ADD COLUMN IF NOT EXISTS patient_rpe numeric,
  ADD COLUMN IF NOT EXISTS monitor_source text;
COMMENT ON COLUMN public.srpe_entries.patient_rpe IS 'PSE informada pelo paciente no check-in quando a sessão foi lançada pelo profissional com monitor cardíaco.';
COMMENT ON COLUMN public.srpe_entries.monitor_source IS 'manual | print: origem dos dados do monitor cardíaco lançados pelo profissional.';