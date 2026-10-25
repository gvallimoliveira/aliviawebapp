CREATE TABLE public.patient_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid,
  professional_id uuid,
  author_user_id uuid NOT NULL,
  category text NOT NULL DEFAULT 'notice' CHECK (category IN ('notice','holiday','education','reminder','service')),
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','active','inactive')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  cta_label text,
  cta_url text,
  expires_at date,
  published_at timestamptz NOT NULL DEFAULT now(),
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (clinic_id IS NOT NULL OR professional_id IS NOT NULL)
);
CREATE INDEX patient_announcements_clinic_idx ON public.patient_announcements (clinic_id, published_at DESC);
CREATE INDEX patient_announcements_pro_idx ON public.patient_announcements (professional_id, published_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_announcements TO authenticated;
GRANT ALL ON public.patient_announcements TO service_role;
ALTER TABLE public.patient_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage scoped announcements" ON public.patient_announcements FOR ALL TO authenticated
  USING (public.can_handle_appointment_request(auth.uid(), clinic_id, professional_id))
  WITH CHECK (public.can_handle_appointment_request(auth.uid(), clinic_id, professional_id) AND author_user_id = auth.uid()
    AND (clinic_id IS NOT NULL OR professional_id IS NOT NULL));

CREATE TABLE public.announcement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid,
  professional_id uuid,
  created_by uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  category text NOT NULL DEFAULT 'notice' CHECK (category IN ('notice','holiday','education','reminder','service')),
  title text NOT NULL,
  body text NOT NULL,
  cta_label text,
  cta_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (clinic_id IS NOT NULL OR professional_id IS NOT NULL)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_templates TO authenticated;
GRANT ALL ON public.announcement_templates TO service_role;
ALTER TABLE public.announcement_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage scoped templates" ON public.announcement_templates FOR ALL TO authenticated
  USING (public.can_handle_appointment_request(auth.uid(), clinic_id, professional_id))
  WITH CHECK (public.can_handle_appointment_request(auth.uid(), clinic_id, professional_id) AND created_by = auth.uid());

CREATE TABLE public.announcement_reads (
  announcement_id uuid NOT NULL REFERENCES public.patient_announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.announcement_reads TO authenticated;
GRANT ALL ON public.announcement_reads TO service_role;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own reads" ON public.announcement_reads FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Emails of patients in a scope matching a predefined list
CREATE OR REPLACE FUNCTION public.announcement_audience_emails(_clinic_id uuid, _professional_id uuid, _audience text)
RETURNS TABLE(email text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH linked AS (
    SELECT lower(trim(pt.email)) AS email FROM public.patients pt
      WHERE pt.email IS NOT NULL AND trim(pt.email) <> ''
        AND ((_clinic_id IS NOT NULL AND pt.clinic_id = _clinic_id)
          OR (_clinic_id IS NULL AND pt.clinic_id IS NULL AND pt.professional_id = _professional_id))
    UNION SELECT lower(trim(a.patient_email)) FROM public.assessments a
      WHERE a.patient_email IS NOT NULL AND trim(a.patient_email) <> ''
        AND ((_clinic_id IS NOT NULL AND a.clinic_id = _clinic_id)
          OR (_clinic_id IS NULL AND a.clinic_id IS NULL AND a.professional_id = _professional_id))
  ),
  active AS (
    SELECT DISTINCT lower(trim(ap.patient_email)) AS email FROM public.professional_appointments ap
      WHERE ap.patient_email IS NOT NULL
        AND ap.appointment_date >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date - 60)
        AND COALESCE(ap.status,'') NOT IN ('cancelled')
        AND ((_clinic_id IS NOT NULL AND ap.clinic_id = _clinic_id)
          OR (_clinic_id IS NULL AND ap.clinic_id IS NULL AND ap.professional_id = _professional_id))
  )
  SELECT l.email FROM linked l
  WHERE _audience = 'all'
     OR (_audience = 'active' AND l.email IN (SELECT email FROM active))
     OR (_audience = 'inactive' AND l.email NOT IN (SELECT email FROM active))
$$;
REVOKE EXECUTE ON FUNCTION public.announcement_audience_emails(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.announcement_audience_emails(uuid, uuid, text) TO service_role;

-- Staff preview: how many patients (with app account) the list reaches
CREATE OR REPLACE FUNCTION public.count_announcement_audience(_clinic_id uuid, _professional_id uuid, _audience text)
RETURNS TABLE(patients int, with_app int) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_handle_appointment_request(auth.uid(), _clinic_id, _professional_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT count(*)::int,
    (SELECT count(*)::int FROM auth.users u WHERE lower(u.email) IN (SELECT e.email FROM public.announcement_audience_emails(_clinic_id, _professional_id, _audience) e))
  FROM public.announcement_audience_emails(_clinic_id, _professional_id, _audience);
END $$;
GRANT EXECUTE ON FUNCTION public.count_announcement_audience(uuid, uuid, text) TO authenticated;

-- Patient feed: announcements from linked providers whose list includes the caller
CREATE OR REPLACE FUNCTION public.get_my_announcements()
RETURNS TABLE(id uuid, provider_name text, provider_logo text, category text, title text, body text,
  cta_label text, cta_url text, published_at timestamptz, is_read boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT id, lower(email) AS email FROM auth.users WHERE id = auth.uid()),
  prov AS (SELECT * FROM public.get_my_care_providers())
  SELECT a.id, prov.name, prov.logo_url, a.category, a.title, a.body, a.cta_label, a.cta_url, a.published_at,
    EXISTS (SELECT 1 FROM public.announcement_reads r WHERE r.announcement_id = a.id AND r.user_id = auth.uid())
  FROM public.patient_announcements a
  JOIN prov ON (prov.kind = 'clinic' AND a.clinic_id = prov.provider_id)
            OR (prov.kind = 'professional' AND a.clinic_id IS NULL AND a.professional_id = prov.provider_id)
  CROSS JOIN me
  WHERE NOT a.archived
    AND (a.expires_at IS NULL OR a.expires_at >= (now() AT TIME ZONE 'America/Sao_Paulo')::date)
    AND me.email IN (SELECT e.email FROM public.announcement_audience_emails(a.clinic_id, a.professional_id, a.audience) e)
  ORDER BY a.published_at DESC
  LIMIT 50
$$;
GRANT EXECUTE ON FUNCTION public.get_my_announcements() TO authenticated;