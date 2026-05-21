-- 1. Add 'admin' value to clinic_role enum
ALTER TYPE public.clinic_role ADD VALUE IF NOT EXISTS 'admin';