ALTER TABLE public.patients ADD COLUMN prescribed_weekly_frequency integer;
ALTER TABLE public.patients ADD CONSTRAINT patients_prescribed_weekly_frequency_check CHECK (prescribed_weekly_frequency IS NULL OR prescribed_weekly_frequency BETWEEN 1 AND 7);
ALTER TABLE public.patients ADD COLUMN referral_source text;
ALTER TABLE public.patients ADD CONSTRAINT patients_referral_source_check CHECK (referral_source IS NULL OR referral_source IN ('patient', 'social', 'doctor', 'other'));
COMMENT ON COLUMN public.patients.prescribed_weekly_frequency IS 'Frequência semanal de fisioterapia sugerida pelo profissional (1-7x). Alimenta o insight de frequência real vs prescrita.';
COMMENT ON COLUMN public.patients.referral_source IS 'Origem da indicação: patient (outro cliente), social (redes sociais), doctor (médico), other (outra).';

ALTER TABLE public.clinics ADD COLUMN rooms_count integer;
ALTER TABLE public.clinics ADD CONSTRAINT clinics_rooms_count_check CHECK (rooms_count IS NULL OR rooms_count > 0);
COMMENT ON COLUMN public.clinics.rooms_count IS 'Número de macas/boxes disponíveis; usado no índice de gargalo operacional.';

ALTER TABLE public.professional_appointments ADD COLUMN status_changed_at timestamptz;
COMMENT ON COLUMN public.professional_appointments.status_changed_at IS 'Carimbo da última mudança de status (trigger); usado para medir cancelamento tardio (<2h). Nulo em registros antigos.';

CREATE OR REPLACE FUNCTION public.touch_appointment_status_changed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_appt_status_changed
BEFORE UPDATE ON public.professional_appointments
FOR EACH ROW EXECUTE FUNCTION public.touch_appointment_status_changed_at();