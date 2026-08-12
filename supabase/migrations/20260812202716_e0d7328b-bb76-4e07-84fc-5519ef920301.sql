-- Inventory of every row tied to a data subject (admin only)
CREATE OR REPLACE FUNCTION public.admin_user_data_inventory(_user_id uuid, _email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n bigint;
  out_items jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public'
      AND c.column_name IN ('user_id','patient_user_id','created_by','professional_user_id','granted_by','handled_by')
      AND c.data_type = 'uuid'
    ORDER BY c.table_name
  LOOP
    BEGIN
      EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = $1', r.table_name, r.column_name)
        INTO n USING _user_id;
    EXCEPTION WHEN others THEN
      n := 0;
    END;
    IF n > 0 THEN
      out_items := out_items || jsonb_build_object('table', r.table_name, 'match', r.column_name, 'count', n);
    END IF;
  END LOOP;

  IF _email IS NOT NULL AND length(trim(_email)) > 0 THEN
    FOR r IN
      SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public'
        AND c.column_name IN ('email','patient_email','subject_email','contact_email')
      ORDER BY c.table_name
    LOOP
      BEGIN
        EXECUTE format('SELECT count(*) FROM public.%I WHERE lower(%I::text) = lower($1)', r.table_name, r.column_name)
          INTO n USING _email;
      EXCEPTION WHEN others THEN
        n := 0;
      END;
      IF n > 0 THEN
        out_items := out_items || jsonb_build_object('table', r.table_name, 'match', r.column_name, 'count', n);
      END IF;
    END LOOP;
  END IF;

  RETURN out_items;
END;
$$;

-- Purge every row tied to a data subject, keeping only legally required audit records
CREATE OR REPLACE FUNCTION public.admin_purge_user_data(_user_id uuid, _email text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n bigint;
  pass int;
  deleted jsonb := '{}'::jsonb;
  errors jsonb := '[]'::jsonb;
  keep_tables text[] := ARRAY[
    'data_subject_requests','consent_records','admin_alert_log',
    'subscription_admin_actions','vip_users','patients','session_notes','professional_notes'
  ];
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR pass IN 1..3 LOOP
    FOR r IN
      SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public'
        AND c.column_name IN ('user_id','patient_user_id','created_by','professional_user_id')
        AND c.data_type = 'uuid'
        AND NOT (c.table_name = ANY(keep_tables))
      ORDER BY c.table_name
    LOOP
      BEGIN
        EXECUTE format('WITH d AS (DELETE FROM public.%I WHERE %I = $1 RETURNING 1) SELECT count(*) FROM d',
                       r.table_name, r.column_name)
          INTO n USING _user_id;
        IF n > 0 THEN
          deleted := deleted || jsonb_build_object(r.table_name, coalesce((deleted->>r.table_name)::bigint, 0) + n);
        END IF;
      EXCEPTION WHEN others THEN
        IF pass = 3 THEN
          errors := errors || jsonb_build_object('table', r.table_name, 'error', SQLERRM);
        END IF;
      END;
    END LOOP;
  END LOOP;

  IF _email IS NOT NULL AND length(trim(_email)) > 0 THEN
    FOR r IN
      SELECT * FROM (VALUES
        ('follow_up_emails','email'),
        ('granted_premium_users','email'),
        ('clinic_invitations','email')
      ) AS v(table_name, column_name)
    LOOP
      BEGIN
        EXECUTE format('WITH d AS (DELETE FROM public.%I WHERE lower(%I::text) = lower($1) RETURNING 1) SELECT count(*) FROM d',
                       r.table_name, r.column_name)
          INTO n USING _email;
        IF n > 0 THEN
          deleted := deleted || jsonb_build_object(r.table_name, coalesce((deleted->>r.table_name)::bigint, 0) + n);
        END IF;
      EXCEPTION WHEN others THEN
        errors := errors || jsonb_build_object('table', r.table_name, 'error', SQLERRM);
      END;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'deleted', deleted,
    'errors', errors,
    'retained_tables', to_jsonb(keep_tables)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_user_data_inventory(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_purge_user_data(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_user_data_inventory(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_purge_user_data(uuid, text) TO authenticated, service_role;