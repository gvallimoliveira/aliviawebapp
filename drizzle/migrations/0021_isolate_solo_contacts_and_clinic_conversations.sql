CREATE OR REPLACE FUNCTION public.get_professional_all_patients(_professional_id uuid)
RETURNS TABLE(user_id uuid, full_name text, email text, has_account boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
WITH pro_check AS (SELECT 1 FROM public.professionals p WHERE p.id = _professional_id AND p.user_id = auth.uid()),
contacts AS (
 SELECT a.patient_email AS email, a.patient_name AS name FROM public.assessments a WHERE a.professional_id = _professional_id AND a.clinic_id IS NULL AND EXISTS (SELECT 1 FROM pro_check)
 UNION
 SELECT p.email, p.full_name FROM public.patients p WHERE p.professional_id = _professional_id AND p.clinic_id IS NULL AND EXISTS (SELECT 1 FROM pro_check)
),
resolved AS (
 SELECT DISTINCT u.id AS uid, u.email::text AS email FROM auth.users u JOIN contacts c ON lower(c.email)=lower(u.email)
 UNION
 SELECT u.id, u.email::text FROM public.professional_referrals r JOIN auth.users u ON u.id=r.patient_user_id WHERE r.professional_id=_professional_id AND EXISTS (SELECT 1 FROM pro_check)
)
SELECT r.uid, COALESCE(p.full_name,r.email,'Paciente'), COALESCE(r.email,''), true FROM resolved r LEFT JOIN public.profiles p ON p.user_id=r.uid
UNION ALL
SELECT NULL::uuid, COALESCE(c.name,c.email,'Paciente'), COALESCE(c.email,''), false FROM contacts c WHERE c.email IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email)=lower(c.email));
$function$;
CREATE OR REPLACE FUNCTION public.create_conversation_for_clinic_patient(_clinic_id uuid, _professional_id uuid, _patient_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _conv_id uuid; _user_email text; _pro_user_id uuid;
BEGIN
IF NOT EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id=_clinic_id AND user_id=auth.uid() AND status='active') THEN RAISE EXCEPTION 'Not a clinic member'; END IF;
SELECT user_id INTO _pro_user_id FROM public.professionals WHERE id=_professional_id;
IF _pro_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id=_clinic_id AND user_id=_pro_user_id AND status='active') THEN RAISE EXCEPTION 'Professional is not a member of this clinic'; END IF;
SELECT email INTO _user_email FROM auth.users WHERE id=_patient_user_id;
IF NOT EXISTS (SELECT 1 FROM public.assessments WHERE clinic_id=_clinic_id AND (user_id=_patient_user_id OR lower(patient_email)=lower(_user_email))) AND NOT EXISTS (SELECT 1 FROM public.patients WHERE clinic_id=_clinic_id AND lower(email)=lower(_user_email)) THEN RAISE EXCEPTION 'Patient not linked to this clinic'; END IF;
SELECT id INTO _conv_id FROM public.conversations WHERE clinic_id=_clinic_id AND professional_id=_professional_id AND patient_user_id=_patient_user_id LIMIT 1;
IF _conv_id IS NOT NULL THEN UPDATE public.conversations SET hidden_by_professional=false,hidden_by_patient=false WHERE id=_conv_id; RETURN _conv_id; END IF;
INSERT INTO public.conversations(professional_id,patient_user_id,clinic_id) VALUES(_professional_id,_patient_user_id,_clinic_id) RETURNING id INTO _conv_id;
RETURN _conv_id;
END;
$function$;