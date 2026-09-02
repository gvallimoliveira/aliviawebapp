-- Helper: quem pode acessar um paciente (fisio responsável ou membro ativo da clínica)
CREATE OR REPLACE FUNCTION public.can_access_patient(_patient_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients pt
    WHERE pt.id = _patient_id
      AND (
        pt.professional_id IN (SELECT p.id FROM public.professionals p WHERE p.user_id = _user_id)
        OR (pt.clinic_id IS NOT NULL AND public.is_clinic_member(_user_id, pt.clinic_id))
      )
  )
$$;

-- 1) Planos
CREATE TABLE public.periodization_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES public.professionals(id) ON DELETE SET NULL,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE SET NULL,
  created_by uuid,
  title text NOT NULL DEFAULT 'Periodização',
  sport text,
  injured_limb text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.periodization_plans TO authenticated;
GRANT ALL ON public.periodization_plans TO service_role;
ALTER TABLE public.periodization_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team manages periodization plans"
ON public.periodization_plans FOR ALL TO authenticated
USING (public.can_access_patient(patient_id, auth.uid()))
WITH CHECK (public.can_access_patient(patient_id, auth.uid()));

-- 2) Ciclos
CREATE TABLE public.periodization_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.periodization_plans(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.periodization_cycles(id) ON DELETE CASCADE,
  level text NOT NULL,
  name text NOT NULL,
  goal text,
  exit_criteria text,
  start_date date,
  end_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.periodization_cycles TO authenticated;
GRANT ALL ON public.periodization_cycles TO service_role;
ALTER TABLE public.periodization_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team manages periodization cycles"
ON public.periodization_cycles FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.periodization_plans pl WHERE pl.id = plan_id AND public.can_access_patient(pl.patient_id, auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.periodization_plans pl WHERE pl.id = plan_id AND public.can_access_patient(pl.patient_id, auth.uid())));

-- 3) Sessões planejadas
CREATE TABLE public.periodization_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.periodization_plans(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES public.periodization_cycles(id) ON DELETE SET NULL,
  session_date date NOT NULL,
  track text NOT NULL DEFAULT 'physio',
  planned_load text NOT NULL DEFAULT 'moderate',
  title text,
  exercise_program_id uuid REFERENCES public.exercise_programs(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.periodization_sessions TO authenticated;
GRANT ALL ON public.periodization_sessions TO service_role;
ALTER TABLE public.periodization_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team manages periodization sessions"
ON public.periodization_sessions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.periodization_plans pl WHERE pl.id = plan_id AND public.can_access_patient(pl.patient_id, auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.periodization_plans pl WHERE pl.id = plan_id AND public.can_access_patient(pl.patient_id, auth.uid())));

-- 4) sRPE
CREATE TABLE public.srpe_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.periodization_plans(id) ON DELETE SET NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  track text NOT NULL DEFAULT 'physio',
  duration_min integer NOT NULL,
  rpe numeric NOT NULL,
  training_load numeric GENERATED ALWAYS AS (duration_min * rpe) STORED,
  source text NOT NULL DEFAULT 'professional',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.srpe_entries TO authenticated;
GRANT ALL ON public.srpe_entries TO service_role;
ALTER TABLE public.srpe_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team manages srpe entries"
ON public.srpe_entries FOR ALL TO authenticated
USING (public.can_access_patient(patient_id, auth.uid()))
WITH CHECK (public.can_access_patient(patient_id, auth.uid()));
CREATE INDEX srpe_entries_patient_date_idx ON public.srpe_entries (patient_id, session_date);

-- 5) Check-in diário de prontidão
CREATE TABLE public.readiness_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.periodization_plans(id) ON DELETE SET NULL,
  checkin_date date NOT NULL DEFAULT CURRENT_DATE,
  soreness integer,
  sleep integer,
  stress integer,
  fatigue integer,
  readiness integer,
  pain integer,
  note text,
  source text NOT NULL DEFAULT 'patient',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (patient_id, checkin_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.readiness_checkins TO authenticated;
GRANT ALL ON public.readiness_checkins TO service_role;
ALTER TABLE public.readiness_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team manages readiness checkins"
ON public.readiness_checkins FOR ALL TO authenticated
USING (public.can_access_patient(patient_id, auth.uid()))
WITH CHECK (public.can_access_patient(patient_id, auth.uid()));
CREATE INDEX readiness_checkins_patient_date_idx ON public.readiness_checkins (patient_id, checkin_date);

-- 6) Checklist de liberação
CREATE TABLE public.clearance_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.periodization_plans(id) ON DELETE CASCADE,
  phase text NOT NULL DEFAULT 'return_to_sport',
  item_key text NOT NULL,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  value text,
  evaluated_by uuid,
  evaluated_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clearance_items TO authenticated;
GRANT ALL ON public.clearance_items TO service_role;
ALTER TABLE public.clearance_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team manages clearance items"
ON public.clearance_items FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.periodization_plans pl WHERE pl.id = plan_id AND public.can_access_patient(pl.patient_id, auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.periodization_plans pl WHERE pl.id = plan_id AND public.can_access_patient(pl.patient_id, auth.uid())));

-- 7) Restrições compartilháveis
CREATE TABLE public.plan_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.periodization_plans(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'avoid',
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_restrictions TO authenticated;
GRANT ALL ON public.plan_restrictions TO service_role;
ALTER TABLE public.plan_restrictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team manages plan restrictions"
ON public.plan_restrictions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.periodization_plans pl WHERE pl.id = plan_id AND public.can_access_patient(pl.patient_id, auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.periodization_plans pl WHERE pl.id = plan_id AND public.can_access_patient(pl.patient_id, auth.uid())));

-- 8) Links por token (paciente / treinador) — leitura pública só via service role
CREATE TABLE public.periodization_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.periodization_plans(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  audience text NOT NULL DEFAULT 'patient',
  label text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.periodization_links TO authenticated;
GRANT ALL ON public.periodization_links TO service_role;
ALTER TABLE public.periodization_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Care team manages periodization links"
ON public.periodization_links FOR ALL TO authenticated
USING (public.can_access_patient(patient_id, auth.uid()))
WITH CHECK (public.can_access_patient(patient_id, auth.uid()));

-- Triggers de updated_at
CREATE TRIGGER trg_periodization_plans_updated BEFORE UPDATE ON public.periodization_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_periodization_cycles_updated BEFORE UPDATE ON public.periodization_cycles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_periodization_sessions_updated BEFORE UPDATE ON public.periodization_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_srpe_entries_updated BEFORE UPDATE ON public.srpe_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_readiness_checkins_updated BEFORE UPDATE ON public.readiness_checkins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_clearance_items_updated BEFORE UPDATE ON public.clearance_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_plan_restrictions_updated BEFORE UPDATE ON public.plan_restrictions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_periodization_links_updated BEFORE UPDATE ON public.periodization_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();