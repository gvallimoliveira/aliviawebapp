CREATE OR REPLACE FUNCTION public.import_undo_batches(p_batches uuid[], p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE batch_row record; ch record; current_data jsonb; assigns text; total integer:=0;
BEGIN
 IF cardinality(p_batches) IS NULL OR cardinality(p_batches)<1 OR cardinality(p_batches)>100 THEN RAISE EXCEPTION 'invalid_batches'; END IF;
 FOR batch_row IN SELECT * FROM public.import_batches WHERE id=ANY(p_batches) ORDER BY created_at DESC FOR UPDATE LOOP
  IF batch_row.user_id<>p_actor AND NOT EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id=batch_row.clinic_id AND user_id=p_actor AND status='active' AND role IN ('owner','admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF batch_row.undone_at IS NOT NULL OR batch_row.status='running' THEN RAISE EXCEPTION 'batch_not_ready'; END IF;
  IF batch_row.expires_undo_at<now() THEN RAISE EXCEPTION 'undo_window_expired'; END IF;
  IF COALESCE(batch_row.summary->>'journal_version','')<>'1' THEN RAISE EXCEPTION 'legacy_batch_unsafe'; END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.import_batches WHERE id=ANY(p_batches))<>(SELECT count(DISTINCT x) FROM unnest(p_batches) x) THEN RAISE EXCEPTION 'batch_not_found'; END IF;
 FOR ch IN SELECT c.* FROM public.import_changes c WHERE c.batch_id=ANY(p_batches) ORDER BY c.id DESC LOOP
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',ch.table_name) INTO current_data USING ch.record_id;
  IF (current_data - 'updated_at') IS DISTINCT FROM (ch.after_data - 'updated_at') THEN RAISE EXCEPTION 'record_changed_after_import'; END IF;
  IF ch.before_data IS NULL THEN
   EXECUTE format('DELETE FROM public.%I WHERE id=$1',ch.table_name) USING ch.record_id;
  ELSE
   SELECT string_agg(format('%I=r.%I',k,k),',') INTO assigns FROM jsonb_object_keys(ch.before_data) k WHERE k<>'id';
   EXECUTE format('UPDATE public.%I t SET %s FROM jsonb_populate_record(NULL::public.%I,$1) r WHERE t.id=$2',ch.table_name,assigns,ch.table_name) USING ch.before_data,ch.record_id;
  END IF;
  total:=total+1;
 END LOOP;
 UPDATE public.import_batches SET status='undone',undone_at=now() WHERE id=ANY(p_batches);
 RETURN jsonb_build_object('restored_or_deleted',total);
END $$;
REVOKE ALL ON FUNCTION public.import_undo_batches(uuid[],uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.import_undo_batches(uuid[],uuid) TO service_role;