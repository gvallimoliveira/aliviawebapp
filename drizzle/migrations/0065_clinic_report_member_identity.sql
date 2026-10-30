ALTER TABLE public.clinic_members ADD COLUMN IF NOT EXISTS report_full_name text, ADD COLUMN IF NOT EXISTS council_type text, ADD COLUMN IF NOT EXISTS council_number text;
COMMENT ON COLUMN public.clinic_members.report_full_name IS 'Clinic-scoped report issuer name; falls back to existing professional/profile name until provided.';
CREATE OR REPLACE FUNCTION public.get_clinic_report_members(_clinic_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id', cm.id, 'user_id', cm.user_id, 'full_name', COALESCE(NULLIF(cm.report_full_name,''),pr.full_name,p.full_name), 'council_type', COALESCE(cm.council_type, CASE WHEN pr.crefito IS NOT NULL AND pr.crefito NOT IN ('','0-X','0','000000') THEN 'CREFITO' END), 'council_number', COALESCE(cm.council_number,CASE WHEN pr.crefito NOT IN ('','0-X','0','000000') THEN pr.crefito END))), '[]'::jsonb)
 FROM public.clinic_members cm LEFT JOIN public.professionals pr ON pr.user_id=cm.user_id LEFT JOIN public.profiles p ON p.user_id=cm.user_id
 WHERE cm.clinic_id=_clinic_id AND cm.status='active' AND public.is_clinic_member(auth.uid(),_clinic_id);
$$;
CREATE OR REPLACE FUNCTION public.save_clinic_report_identity(_member_id uuid, _full_name text, _council_type text DEFAULT NULL, _council_number text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m public.clinic_members; ct text := NULLIF(trim(_council_type),''); cn text := NULLIF(trim(_council_number),'');
BEGIN
 SELECT * INTO m FROM public.clinic_members WHERE id=_member_id AND status='active' FOR UPDATE;
 IF auth.uid() IS NULL OR m.id IS NULL OR NOT public.is_clinic_member(auth.uid(),m.clinic_id) OR NOT (m.user_id=auth.uid() OR public.get_clinic_role(auth.uid(),m.clinic_id) IN ('owner','admin')) THEN RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501'; END IF;
 IF length(trim(_full_name)) < 3 OR length(trim(_full_name)) > 160 THEN RAISE EXCEPTION 'Informe o nome completo (3 a 160 caracteres).'; END IF;
 IF ct IS NOT NULL AND ct NOT IN ('CREFITO','CREF','CRM','OTHER') THEN RAISE EXCEPTION 'Conselho inválido'; END IF;
 IF (ct IS NULL) <> (cn IS NULL) OR length(cn)>60 OR cn IN ('0-X','0','000000') THEN RAISE EXCEPTION 'Informe o conselho e o número real, ou deixe ambos vazios.'; END IF;
 UPDATE public.clinic_members SET report_full_name=trim(_full_name), council_type=ct, council_number=cn WHERE id=m.id;
END;
$$;
CREATE OR REPLACE FUNCTION public.get_clinic_report_issuer(_clinic_id uuid, _user_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('full_name',COALESCE(NULLIF(cm.report_full_name,''),pr.full_name,p.full_name), 'council_type',COALESCE(cm.council_type,CASE WHEN pr.crefito NOT IN ('','0-X','0','000000') THEN 'CREFITO' END), 'council_number',COALESCE(cm.council_number,CASE WHEN pr.crefito NOT IN ('','0-X','0','000000') THEN pr.crefito END),'signature_image_url',pr.signature_image_url,'is_student',pr.is_student,'active_profile_mode',pr.active_profile_mode,'student_institution',pr.student_institution,'student_period',pr.student_period)
 FROM public.clinic_members cm LEFT JOIN public.professionals pr ON pr.user_id=cm.user_id LEFT JOIN public.profiles p ON p.user_id=cm.user_id
 WHERE cm.clinic_id=_clinic_id AND cm.user_id=_user_id AND cm.status='active' AND public.is_clinic_member(auth.uid(),_clinic_id) LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_clinic_report_members(uuid), public.save_clinic_report_identity(uuid,text,text,text), public.get_clinic_report_issuer(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_clinic_report_members(uuid), public.save_clinic_report_identity(uuid,text,text,text), public.get_clinic_report_issuer(uuid,uuid) TO authenticated, service_role;