-- Performance: add indexes on assessments and professional_appointments
-- to speed up common queries used by Pro/Clinic dashboards.
-- All indexes use IF NOT EXISTS, so this migration is purely additive
-- and safe to run on existing data.

CREATE INDEX IF NOT EXISTS idx_assessments_clinic_created
  ON public.assessments (clinic_id, created_at DESC)
  WHERE clinic_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_professional_created
  ON public.assessments (professional_id, created_at DESC)
  WHERE professional_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_user_created
  ON public.assessments (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_assessments_patient_email_lower
  ON public.assessments (lower(patient_email))
  WHERE patient_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date
  ON public.professional_appointments (clinic_id, appointment_date)
  WHERE clinic_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_professional_date
  ON public.professional_appointments (professional_id, appointment_date);

CREATE INDEX IF NOT EXISTS idx_patients_clinic
  ON public.patients (clinic_id)
  WHERE clinic_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_patients_professional
  ON public.patients (professional_id)
  WHERE professional_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages (conversation_id, created_at DESC);