CREATE OR REPLACE FUNCTION public.is_clinic_finance_manager(_user_id uuid, _clinic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.clinic_members WHERE user_id = _user_id AND clinic_id = _clinic_id AND status = 'active' AND role IN ('owner','admin'))
$$;

CREATE TABLE public.clinic_compensation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL,
  session_mode text NOT NULL DEFAULT 'none',
  session_value numeric NOT NULL DEFAULT 0,
  monthly_fixed numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, professional_id),
  CONSTRAINT clinic_compensation_mode CHECK (session_mode IN ('none','percent','fixed')),
  CONSTRAINT clinic_compensation_nonneg CHECK (session_value >= 0 AND monthly_fixed >= 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_compensation TO authenticated;
GRANT ALL ON public.clinic_compensation TO service_role;
ALTER TABLE public.clinic_compensation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance managers manage compensation" ON public.clinic_compensation FOR ALL TO authenticated
  USING (public.is_clinic_finance_manager(auth.uid(), clinic_id)) WITH CHECK (public.is_clinic_finance_manager(auth.uid(), clinic_id));

CREATE TABLE public.clinic_payout_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL,
  month text NOT NULL,
  label text NOT NULL,
  amount numeric NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payout_adj_month CHECK (month ~ '^\d{4}-\d{2}$')
);
CREATE INDEX ON public.clinic_payout_adjustments (clinic_id, month);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_payout_adjustments TO authenticated;
GRANT ALL ON public.clinic_payout_adjustments TO service_role;
ALTER TABLE public.clinic_payout_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "finance managers manage adjustments" ON public.clinic_payout_adjustments FOR ALL TO authenticated
  USING (public.is_clinic_finance_manager(auth.uid(), clinic_id)) WITH CHECK (public.is_clinic_finance_manager(auth.uid(), clinic_id));

ALTER TABLE public.care_services
  ADD COLUMN IF NOT EXISTS deduction_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_mode text,
  ADD COLUMN IF NOT EXISTS payout_value numeric;
COMMENT ON COLUMN public.care_services.deduction_pct IS 'Taxes/fees % removed from the price before computing team payouts';
COMMENT ON COLUMN public.care_services.payout_mode IS 'Optional per-service payout override: percent | fixed; null uses the professional rule';