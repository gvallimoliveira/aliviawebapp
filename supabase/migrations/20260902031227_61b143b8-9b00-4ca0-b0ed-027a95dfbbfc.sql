-- Dose planejada (prescrita) x carga percebida (sRPE do paciente).
-- O sRPE segue exclusivo do paciente; o preparador/fisio prescreve a dose alvo.

ALTER TABLE public.periodization_sessions
  ADD COLUMN IF NOT EXISTS patient_id uuid,
  ADD COLUMN IF NOT EXISTS planned_duration_min integer,
  ADD COLUMN IF NOT EXISTS planned_rpe numeric,
  ADD COLUMN IF NOT EXISTS created_source text NOT NULL DEFAULT 'professional';

-- Carga alvo derivada (duração planejada × RPE alvo).
ALTER TABLE public.periodization_sessions
  ADD COLUMN IF NOT EXISTS planned_target_load numeric
  GENERATED ALWAYS AS (COALESCE(planned_duration_min, 0) * COALESCE(planned_rpe, 0)) STORED;

UPDATE public.periodization_sessions s
SET patient_id = pl.patient_id
FROM public.periodization_plans pl
WHERE pl.id = s.plan_id AND s.patient_id IS NULL;

-- Sessões prescritas pelo preparador podem existir sem plano estruturado.
ALTER TABLE public.periodization_sessions ALTER COLUMN plan_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS periodization_sessions_patient_date_idx
  ON public.periodization_sessions (patient_id, session_date);

-- Pareamento explícito entre a sessão prescrita e o sRPE relatado.
ALTER TABLE public.srpe_entries
  ADD COLUMN IF NOT EXISTS session_id uuid
  REFERENCES public.periodization_sessions(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Care team manages periodization sessions" ON public.periodization_sessions;
CREATE POLICY "Care team manages periodization sessions"
ON public.periodization_sessions
FOR ALL
TO authenticated
USING (
  public.can_access_patient(periodization_sessions.patient_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.periodization_plans pl
    WHERE pl.id = periodization_sessions.plan_id
      AND public.can_access_patient(pl.patient_id, auth.uid())
  )
)
WITH CHECK (
  public.can_access_patient(periodization_sessions.patient_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.periodization_plans pl
    WHERE pl.id = periodization_sessions.plan_id
      AND public.can_access_patient(pl.patient_id, auth.uid())
  )
);