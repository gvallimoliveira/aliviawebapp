CREATE TABLE public.import_changes (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
 table_name text NOT NULL,
 record_id uuid NOT NULL,
 before_data jsonb,
 after_data jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.import_changes TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.import_changes_id_seq TO service_role;
ALTER TABLE public.import_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_import_changes ON public.import_changes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX import_changes_batch_idx ON public.import_changes(batch_id);
CREATE OR REPLACE FUNCTION public.import_write_record(p_batch uuid, p_table text, p_data jsonb, p_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_data jsonb; new_data jsonb; result_id uuid; cols text; vals text; assigns text;
BEGIN
 IF p_table NOT IN ('patients','assessments','session_notes','professional_appointments','pain_diary_entries') THEN RAISE EXCEPTION 'invalid_import_table'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.import_batches WHERE id=p_batch AND status='running') THEN RAISE EXCEPTION 'invalid_import_batch'; END IF;
 IF p_data ? 'id' OR p_data ? 'import_batch_id' THEN RAISE EXCEPTION 'reserved_import_field'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_data) k WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public' AND c.table_name=p_table AND c.column_name=k)) THEN RAISE EXCEPTION 'invalid_import_field'; END IF;
 p_data := p_data || jsonb_build_object('import_batch_id',p_batch);
 SELECT string_agg(format('%I',k),','), string_agg(format('r.%I',k),','), string_agg(format('%I=r.%I',k,k),',') INTO cols,vals,assigns FROM jsonb_object_keys(p_data) k;
 IF p_id IS NULL THEN
  EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1) r RETURNING id',p_table,cols,vals,p_table) INTO result_id USING p_data;
 ELSE
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',p_table) INTO old_data USING p_id;
  IF old_data IS NULL THEN RAISE EXCEPTION 'record_not_found'; END IF;
  EXECUTE format('UPDATE public.%I t SET %s FROM jsonb_populate_record(NULL::public.%I,$1) r WHERE t.id=$2 RETURNING t.id',p_table,assigns,p_table) INTO result_id USING p_data,p_id;
 END IF;
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1',p_table) INTO new_data USING result_id;
 INSERT INTO public.import_changes(batch_id,table_name,record_id,before_data,after_data) VALUES(p_batch,p_table,result_id,old_data,new_data);
 RETURN result_id;
END $$;
REVOKE ALL ON FUNCTION public.import_write_record(uuid,text,jsonb,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.import_write_record(uuid,text,jsonb,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.import_undo_batches(p_batches uuid[], p_actor uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; ch record; current_data jsonb; assigns text; total integer:=0;
BEGIN
 IF cardinality(p_batches) IS NULL OR cardinality(p_batches)<1 OR cardinality(p_batches)>100 THEN RAISE EXCEPTION 'invalid_batches'; END IF;
 FOR b IN SELECT * FROM public.import_batches WHERE id=ANY(p_batches) ORDER BY created_at DESC FOR UPDATE LOOP
  IF b.user_id<>p_actor AND NOT EXISTS (SELECT 1 FROM public.clinic_members WHERE clinic_id=b.clinic_id AND user_id=p_actor AND status='active' AND role IN ('owner','admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF b.undone_at IS NOT NULL OR b.status='running' THEN RAISE EXCEPTION 'batch_not_ready'; END IF;
  IF b.expires_undo_at<now() THEN RAISE EXCEPTION 'undo_window_expired'; END IF;
  IF COALESCE(b.summary->>'journal_version','')<>'1' THEN RAISE EXCEPTION 'legacy_batch_unsafe'; END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.import_batches WHERE id=ANY(p_batches))<>(SELECT count(DISTINCT x) FROM unnest(p_batches) x) THEN RAISE EXCEPTION 'batch_not_found'; END IF;
 FOR ch IN SELECT c.* FROM public.import_changes c JOIN public.import_batches b ON b.id=c.batch_id WHERE c.batch_id=ANY(p_batches) ORDER BY c.id DESC LOOP
  EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',ch.table_name) INTO current_data USING ch.record_id;
  IF current_data IS DISTINCT FROM ch.after_data THEN RAISE EXCEPTION 'record_changed_after_import'; END IF;
  IF ch.before_data IS NULL THEN
   EXECUTE format('DELETE FROM public.%I WHERE id=$1',ch.table_name) USING ch.record_id;
  ELSE
   SELECT string_agg(format('%I=r.%I',k,k),',') INTO assigns FROM jsonb_object_keys(ch.before_data) k WHERE k<>'id';
   EXECUTE format('UPDATE public.%I t SET %s FROM jsonb_populate_record(NULL::public.%I,$1) r WHERE t.id=$2',ch.table_name,assigns,ch.table_name) USING ch.before_data,ch.record_id;
   -- updated_at triggers may change the timestamp; restore the preceding journal comparison timestamp only for chained imports.
   UPDATE public.import_changes SET after_data=jsonb_set(after_data,'{updated_at}',to_jsonb((SELECT updated_at FROM public.patients WHERE id=ch.record_id))) WHERE false;
  END IF;
  total:=total+1;
 END LOOP;
 UPDATE public.import_batches SET status='undone',undone_at=now() WHERE id=ANY(p_batches);
 RETURN jsonb_build_object('restored_or_deleted',total);
END $$;
REVOKE ALL ON FUNCTION public.import_undo_batches(uuid[],uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.import_undo_batches(uuid[],uuid) TO service_role;