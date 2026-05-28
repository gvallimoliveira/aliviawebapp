
-- Make hep_templates shareable across clinic members
ALTER TABLE public.hep_templates
  ADD COLUMN IF NOT EXISTS clinic_id UUID;

ALTER TABLE public.hep_templates
  ALTER COLUMN professional_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS hep_templates_clinic_idx ON public.hep_templates(clinic_id);

-- Ensure at least one scope is set
ALTER TABLE public.hep_templates
  DROP CONSTRAINT IF EXISTS hep_templates_scope_check;
ALTER TABLE public.hep_templates
  ADD CONSTRAINT hep_templates_scope_check
  CHECK (professional_id IS NOT NULL OR clinic_id IS NOT NULL);

-- Refresh RLS policies
DROP POLICY IF EXISTS "Pros manage own hep templates" ON public.hep_templates;
DROP POLICY IF EXISTS "View hep templates (pro or clinic)" ON public.hep_templates;
DROP POLICY IF EXISTS "Insert hep templates (pro or clinic)" ON public.hep_templates;
DROP POLICY IF EXISTS "Update hep templates (pro or clinic)" ON public.hep_templates;
DROP POLICY IF EXISTS "Delete hep templates (pro or clinic)" ON public.hep_templates;

CREATE POLICY "View hep templates (pro or clinic)"
ON public.hep_templates
FOR SELECT
TO authenticated
USING (
  (professional_id IS NOT NULL AND professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid()))
  OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
);

CREATE POLICY "Insert hep templates (pro or clinic)"
ON public.hep_templates
FOR INSERT
TO authenticated
WITH CHECK (
  (professional_id IS NOT NULL AND professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid()))
  OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
);

CREATE POLICY "Update hep templates (pro or clinic)"
ON public.hep_templates
FOR UPDATE
TO authenticated
USING (
  (professional_id IS NOT NULL AND professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid()))
  OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
)
WITH CHECK (
  (professional_id IS NOT NULL AND professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid()))
  OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
);

CREATE POLICY "Delete hep templates (pro or clinic)"
ON public.hep_templates
FOR DELETE
TO authenticated
USING (
  (professional_id IS NOT NULL AND professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid()))
  OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
);
