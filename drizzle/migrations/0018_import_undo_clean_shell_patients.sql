CREATE OR REPLACE FUNCTION public.import_patient_is_unreferenced_shell(p_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE p record; col record; found boolean;
BEGIN
 SELECT * INTO p FROM public.patients WHERE id=p_id;
 IF NOT FOUND OR p.import_batch_id IS NOT NULL OR p.email IS NOT NULL OR p.cpf IS NOT NULL OR p.phone IS NOT NULL
    OR p.birth_date IS NOT NULL OR p.address IS NOT NULL OR p.notes IS NOT NULL OR p.sex IS NOT NULL OR p.occupation IS NOT NULL THEN RETURN false; END IF;
 IF EXISTS (SELECT 1 FROM public.assessments a WHERE lower(trim(a.patient_name))=lower(trim(p.full_name))
   AND ((p.clinic_id IS NOT NULL AND a.clinic_id=p.clinic_id) OR (p.professional_id IS NOT NULL AND a.professional_id=p.professional_id))) THEN RETURN false; END IF;
 FOR col IN SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='patient_id' AND data_type='uuid' AND table_name<>'patients' LOOP
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE patient_id=$1)',col.table_name) INTO found USING p_id;
  IF found THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.import_patient_is_unreferenced_shell(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.import_undo_batches(p_batches uuid[], p_actor uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE batch_row record; ch record; current_data jsonb; assigns text; total integer:=0; shells integer:=0; sp record;
 removed_names text[]:='{}'; scope_clinics uuid[]:='{}'; scope_pros uuid[]:='{}'; first_at timestamptz;
BEGIN
 IF cardinality(p_batches) IS NULL OR cardinality(p_batches)<1 OR cardinality(p_batches)>100 THEN RAISE EXCEPTION 'invalid_batches'; END IF;
 FOR batch_row IN SELECT * FROM public.import_batches WHERE id=ANY(p_batches) ORDER BY created_at DESC FOR UPDATE LOOP
  IF batch_row.user_id<>p_actor AND NOT EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id=batch_row.clinic_id AND user_id=p_actor AND status='active' AND role IN ('owner','admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF batch_row.undone_at IS NOT NULL OR batch_row.status='running' THEN RAISE EXCEPTION 'batch_not_ready'; END IF;
  IF batch_row.expires_undo_at<now() THEN RAISE EXCEPTION 'undo_window_expired'; END IF;
  IF COALESCE(batch_row.summary->>'journal_version','')<>'1' THEN RAISE EXCEPTION 'legacy_batch_unsafe'; END IF;
  IF batch_row.clinic_id IS NOT NULL THEN scope_clinics:=scope_clinics||batch_row.clinic_id; END IF;
  IF batch_row.professional_id IS NOT NULL THEN scope_pros:=scope_pros||batch_row.professional_id; END IF;
  first_at:=LEAST(COALESCE(first_at,batch_row.created_at),batch_row.created_at);
 END LOOP;
 IF (SELECT count(*) FROM public.import_batches WHERE id=ANY(p_batches))<>(SELECT count(DISTINCT x) FROM unnest(p_batches) x) THEN RAISE EXCEPTION 'batch_not_found'; END IF;
 FOR ch IN SELECT c.* FROM public.import_changes c WHERE c.batch_id=ANY(p_batches) ORDER BY c.id DESC LOOP
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',ch.table_name) INTO current_data USING ch.record_id;
  IF (current_data - 'updated_at') IS DISTINCT FROM (ch.after_data - 'updated_at') THEN RAISE EXCEPTION 'record_changed_after_import'; END IF;
  IF ch.before_data IS NULL THEN
   IF ch.table_name='assessments' AND ch.after_data ? 'patient_name' THEN removed_names:=removed_names||lower(trim(ch.after_data->>'patient_name')); END IF;
   EXECUTE format('DELETE FROM public.%I WHERE id=$1',ch.table_name) USING ch.record_id;
  ELSE
   SELECT string_agg(format('%I=r.%I',k,k),',') INTO assigns FROM jsonb_object_keys(ch.before_data) k WHERE k<>'id';
   EXECUTE format('UPDATE public.%I t SET %s FROM jsonb_populate_record(NULL::public.%I,$1) r WHERE t.id=$2',ch.table_name,assigns,ch.table_name) USING ch.before_data,ch.record_id;
  END IF;
  total:=total+1;
 END LOOP;
 -- Empty patient cards auto-created by the app from imported assessments (no data of their own)
 FOR sp IN SELECT id FROM public.patients WHERE lower(trim(full_name))=ANY(removed_names) AND created_at>=first_at
   AND (clinic_id=ANY(scope_clinics) OR professional_id=ANY(scope_pros)) LOOP
  IF public.import_patient_is_unreferenced_shell(sp.id) THEN DELETE FROM public.patients WHERE id=sp.id; shells:=shells+1; END IF;
 END LOOP;
 UPDATE public.import_batches SET status='undone',undone_at=now() WHERE id=ANY(p_batches);
 RETURN jsonb_build_object('restored_or_deleted',total,'empty_patient_cards_removed',shells);
END $function$;

-- One-off: remove the two empty cards left by the undone test import (only if still unreferenced)
DELETE FROM public.patients WHERE id IN ('5227abbc-b1f1-428b-9984-bae2cbe5b0f1','efc896ab-dde3-433b-9391-45be9f83c9b4')
 AND public.import_patient_is_unreferenced_shell(id);