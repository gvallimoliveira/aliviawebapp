CREATE OR REPLACE FUNCTION public.has_active_pro_subscription(_professional_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.professionals p
    WHERE p.id = _professional_id
      AND (
        -- Paid PRO access: a real active subscription/payment marker must exist.
        (
          p.subscription_status = 'active'
          AND (
            p.subscription_stripe_id IS NOT NULL
            OR (p.pro_access_expires_at IS NOT NULL AND p.pro_access_expires_at > now())
          )
        )
        -- Only admin-granted Academic Partners keep free access.
        OR (COALESCE(p.is_partner, false) = true AND COALESCE(p.is_student, false) = true)
        OR public.is_admin(p.user_id)
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.user_has_active_pro_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.professionals p
    WHERE p.user_id = _user_id
      AND public.has_active_pro_subscription(p.id)
  );
$function$;

DROP FUNCTION IF EXISTS public.get_public_professional_assessment_link(uuid);

CREATE OR REPLACE FUNCTION public.get_public_professional_assessment_link(_professional_id uuid)
RETURNS TABLE(
  id uuid, user_id uuid, full_name text, logo_url text,
  approved boolean, active boolean, has_access boolean,
  is_student boolean, student_institution text, student_period text,
  active_profile_mode text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    p.id,
    p.user_id,
    p.full_name,
    p.logo_url,
    p.approved,
    p.active,
    public.has_active_pro_subscription(p.id) AS has_access,
    COALESCE(p.is_student, false) AS is_student,
    p.student_institution,
    p.student_period,
    COALESCE(p.active_profile_mode, CASE WHEN p.is_student THEN 'student' ELSE 'professional' END) AS active_profile_mode
  FROM public.professionals p
  WHERE p.id = _professional_id;
$function$;

-- Assessments: public professional link + professional owner access must require active PRO entitlement.
DROP POLICY IF EXISTS "Anyone can create professional assessments" ON public.assessments;
CREATE POLICY "Anyone can create professional assessments"
ON public.assessments
FOR INSERT
TO public
WITH CHECK (
  type = 'professional'
  AND user_id IS NULL
  AND professional_id IS NOT NULL
  AND public.has_active_pro_subscription(professional_id)
);

DROP POLICY IF EXISTS "Anyone can view professional assessments for flow" ON public.assessments;
CREATE POLICY "Anyone can view professional assessments for flow"
ON public.assessments
FOR SELECT
TO anon, authenticated
USING (
  type = 'professional'
  AND user_id IS NULL
  AND professional_id IS NOT NULL
  AND public.has_active_pro_subscription(professional_id)
);

DROP POLICY IF EXISTS "Anyone can update professional assessments" ON public.assessments;
CREATE POLICY "Anyone can update professional assessments"
ON public.assessments
FOR UPDATE
TO anon, authenticated
USING (
  type = 'professional'
  AND user_id IS NULL
  AND professional_id IS NOT NULL
  AND public.has_active_pro_subscription(professional_id)
);

DROP POLICY IF EXISTS "Professionals can view their linked assessments" ON public.assessments;
CREATE POLICY "Professionals can view their linked assessments"
ON public.assessments
FOR SELECT
TO public
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can update their linked assessments" ON public.assessments;
CREATE POLICY "Professionals can update their linked assessments"
ON public.assessments
FOR UPDATE
TO authenticated
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can delete their linked assessments" ON public.assessments;
CREATE POLICY "Professionals can delete their linked assessments"
ON public.assessments
FOR DELETE
TO authenticated
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

-- Patients: direct professional CRUD must require active PRO entitlement.
DROP POLICY IF EXISTS "Anyone can create patient during assessment" ON public.patients;
CREATE POLICY "Anyone can create patient during assessment"
ON public.patients
FOR INSERT
TO public
WITH CHECK (
  clinic_id IS NOT NULL
  OR (professional_id IS NOT NULL AND public.has_active_pro_subscription(professional_id))
);

DROP POLICY IF EXISTS "Professionals can create their patients" ON public.patients;
CREATE POLICY "Professionals can create their patients"
ON public.patients
FOR INSERT
TO public
WITH CHECK (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can view their patients" ON public.patients;
CREATE POLICY "Professionals can view their patients"
ON public.patients
FOR SELECT
TO public
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can update their patients" ON public.patients;
CREATE POLICY "Professionals can update their patients"
ON public.patients
FOR UPDATE
TO public
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can delete their patients" ON public.patients;
CREATE POLICY "Professionals can delete their patients"
ON public.patients
FOR DELETE
TO public
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

-- Exercise programs and items.
DROP POLICY IF EXISTS "Professionals manage own programs" ON public.exercise_programs;
CREATE POLICY "Professionals manage own programs"
ON public.exercise_programs
FOR ALL
TO authenticated
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
)
WITH CHECK (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can delete their programs" ON public.exercise_programs;
CREATE POLICY "Professionals can delete their programs"
ON public.exercise_programs
FOR DELETE
TO authenticated
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals manage own program items" ON public.exercise_program_items;
CREATE POLICY "Professionals manage own program items"
ON public.exercise_program_items
FOR ALL
TO authenticated
USING (
  program_id IN (
    SELECT ep.id
    FROM public.exercise_programs ep
    JOIN public.professionals p ON ep.professional_id = p.id
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
)
WITH CHECK (
  program_id IN (
    SELECT ep.id
    FROM public.exercise_programs ep
    JOIN public.professionals p ON ep.professional_id = p.id
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can delete their program items" ON public.exercise_program_items;
CREATE POLICY "Professionals can delete their program items"
ON public.exercise_program_items
FOR DELETE
TO authenticated
USING (
  program_id IN (
    SELECT ep.id
    FROM public.exercise_programs ep
    JOIN public.professionals p ON ep.professional_id = p.id
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

-- Appointments, notes and templates.
DROP POLICY IF EXISTS "Professionals can manage their own appointments" ON public.professional_appointments;
CREATE POLICY "Professionals can manage their own appointments"
ON public.professional_appointments
FOR ALL
TO public
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
)
WITH CHECK (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Pros can manage own notes" ON public.professional_notes;
CREATE POLICY "Pros can manage own notes"
ON public.professional_notes
FOR ALL
TO authenticated
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
)
WITH CHECK (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can delete their own notes" ON public.professional_notes;
CREATE POLICY "Professionals can delete their own notes"
ON public.professional_notes
FOR DELETE
TO authenticated
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can manage their own session notes" ON public.session_notes;
CREATE POLICY "Professionals can manage their own session notes"
ON public.session_notes
FOR ALL
TO public
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
)
WITH CHECK (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "View hep templates (pro or clinic)" ON public.hep_templates;
CREATE POLICY "View hep templates (pro or clinic)"
ON public.hep_templates
FOR SELECT
TO authenticated
USING (
  (
    professional_id IS NOT NULL
    AND professional_id IN (
      SELECT p.id FROM public.professionals p
      WHERE p.user_id = auth.uid()
        AND public.has_active_pro_subscription(p.id)
    )
  )
  OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
);

DROP POLICY IF EXISTS "Insert hep templates (pro or clinic)" ON public.hep_templates;
CREATE POLICY "Insert hep templates (pro or clinic)"
ON public.hep_templates
FOR INSERT
TO authenticated
WITH CHECK (
  (
    professional_id IS NOT NULL
    AND professional_id IN (
      SELECT p.id FROM public.professionals p
      WHERE p.user_id = auth.uid()
        AND public.has_active_pro_subscription(p.id)
    )
  )
  OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
);

DROP POLICY IF EXISTS "Update hep templates (pro or clinic)" ON public.hep_templates;
CREATE POLICY "Update hep templates (pro or clinic)"
ON public.hep_templates
FOR UPDATE
TO authenticated
USING (
  (
    professional_id IS NOT NULL
    AND professional_id IN (
      SELECT p.id FROM public.professionals p
      WHERE p.user_id = auth.uid()
        AND public.has_active_pro_subscription(p.id)
    )
  )
  OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
)
WITH CHECK (
  (
    professional_id IS NOT NULL
    AND professional_id IN (
      SELECT p.id FROM public.professionals p
      WHERE p.user_id = auth.uid()
        AND public.has_active_pro_subscription(p.id)
    )
  )
  OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
);

DROP POLICY IF EXISTS "Delete hep templates (pro or clinic)" ON public.hep_templates;
CREATE POLICY "Delete hep templates (pro or clinic)"
ON public.hep_templates
FOR DELETE
TO authenticated
USING (
  (
    professional_id IS NOT NULL
    AND professional_id IN (
      SELECT p.id FROM public.professionals p
      WHERE p.user_id = auth.uid()
        AND public.has_active_pro_subscription(p.id)
    )
  )
  OR (clinic_id IS NOT NULL AND public.is_clinic_member(auth.uid(), clinic_id))
);

-- Files/photos in solo professional mode.
DROP POLICY IF EXISTS "Professionals can view their patient files" ON public.patient_files;
CREATE POLICY "Professionals can view their patient files"
ON public.patient_files
FOR SELECT
TO authenticated
USING (
  clinic_id IS NULL
  AND professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can upload their patient files" ON public.patient_files;
CREATE POLICY "Professionals can upload their patient files"
ON public.patient_files
FOR INSERT
TO authenticated
WITH CHECK (
  clinic_id IS NULL
  AND professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
  AND uploaded_by = auth.uid()
);

DROP POLICY IF EXISTS "Professionals can update their patient files" ON public.patient_files;
CREATE POLICY "Professionals can update their patient files"
ON public.patient_files
FOR UPDATE
TO authenticated
USING (
  clinic_id IS NULL
  AND professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
)
WITH CHECK (
  clinic_id IS NULL
  AND professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can delete their patient files" ON public.patient_files;
CREATE POLICY "Professionals can delete their patient files"
ON public.patient_files
FOR DELETE
TO authenticated
USING (
  clinic_id IS NULL
  AND professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can view their patient photos" ON public.patient_photos;
CREATE POLICY "Professionals can view their patient photos"
ON public.patient_photos
FOR SELECT
TO authenticated
USING (
  clinic_id IS NULL
  AND professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can upload their patient photos" ON public.patient_photos;
CREATE POLICY "Professionals can upload their patient photos"
ON public.patient_photos
FOR INSERT
TO authenticated
WITH CHECK (
  clinic_id IS NULL
  AND professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
  AND uploaded_by = auth.uid()
);

DROP POLICY IF EXISTS "Professionals can update their patient photos" ON public.patient_photos;
CREATE POLICY "Professionals can update their patient photos"
ON public.patient_photos
FOR UPDATE
TO authenticated
USING (
  clinic_id IS NULL
  AND professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
)
WITH CHECK (
  clinic_id IS NULL
  AND professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can delete their patient photos" ON public.patient_photos;
CREATE POLICY "Professionals can delete their patient photos"
ON public.patient_photos
FOR DELETE
TO authenticated
USING (
  clinic_id IS NULL
  AND professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

-- Referrals connected to professional accounts.
DROP POLICY IF EXISTS "Professionals can view their referrals" ON public.professional_referrals;
CREATE POLICY "Professionals can view their referrals"
ON public.professional_referrals
FOR SELECT
TO public
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can update referral status" ON public.professional_referrals;
CREATE POLICY "Professionals can update referral status"
ON public.professional_referrals
FOR UPDATE
TO public
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);

DROP POLICY IF EXISTS "Professionals can delete their referrals" ON public.professional_referrals;
CREATE POLICY "Professionals can delete their referrals"
ON public.professional_referrals
FOR DELETE
TO authenticated
USING (
  professional_id IN (
    SELECT p.id FROM public.professionals p
    WHERE p.user_id = auth.uid()
      AND public.has_active_pro_subscription(p.id)
  )
);