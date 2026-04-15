
-- Add new clinic roles
ALTER TYPE public.clinic_role ADD VALUE IF NOT EXISTS 'osteopath';
ALTER TYPE public.clinic_role ADD VALUE IF NOT EXISTS 'pilates_instructor';
ALTER TYPE public.clinic_role ADD VALUE IF NOT EXISTS 'doctor';
ALTER TYPE public.clinic_role ADD VALUE IF NOT EXISTS 'rpg_specialist';
ALTER TYPE public.clinic_role ADD VALUE IF NOT EXISTS 'massage_therapist';

-- Add service_type to professional_appointments
ALTER TABLE public.professional_appointments
ADD COLUMN IF NOT EXISTS service_type text NOT NULL DEFAULT 'fisioterapia';
