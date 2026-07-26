ALTER TABLE public.hep_templates
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

ALTER TABLE public.hep_templates
  DROP CONSTRAINT IF EXISTS hep_templates_scope_check;
ALTER TABLE public.hep_templates
  ADD CONSTRAINT hep_templates_scope_check
  CHECK (professional_id IS NOT NULL OR clinic_id IS NOT NULL OR is_system = true);

CREATE INDEX IF NOT EXISTS hep_templates_system_idx ON public.hep_templates(is_system) WHERE is_system;

DROP POLICY IF EXISTS "View hep templates (pro or clinic)" ON public.hep_templates;
CREATE POLICY "View hep templates (pro or clinic)"
ON public.hep_templates
FOR SELECT
TO authenticated
USING (
  is_system = true
  OR (professional_id IS NOT NULL AND professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid()))
  OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
);

DROP POLICY IF EXISTS "Insert hep templates (pro or clinic)" ON public.hep_templates;
CREATE POLICY "Insert hep templates (pro or clinic)"
ON public.hep_templates
FOR INSERT
TO authenticated
WITH CHECK (
  (
    is_system = false
    AND (
      (professional_id IS NOT NULL AND professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid()))
      OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
    )
  )
  OR public.is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Update hep templates (pro or clinic)" ON public.hep_templates;
CREATE POLICY "Update hep templates (pro or clinic)"
ON public.hep_templates
FOR UPDATE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (
    is_system = false
    AND (
      (professional_id IS NOT NULL AND professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid()))
      OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
    )
  )
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR (
    is_system = false
    AND (
      (professional_id IS NOT NULL AND professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid()))
      OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
    )
  )
);

DROP POLICY IF EXISTS "Delete hep templates (pro or clinic)" ON public.hep_templates;
CREATE POLICY "Delete hep templates (pro or clinic)"
ON public.hep_templates
FOR DELETE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (
    is_system = false
    AND (
      (professional_id IS NOT NULL AND professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid()))
      OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
    )
  )
);