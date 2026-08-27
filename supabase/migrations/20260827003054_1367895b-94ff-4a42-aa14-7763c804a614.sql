DO $$
DECLARE
  f record;
  allowlist text[] := ARRAY[
    'get_public_clinic_assessment_link',
    'get_public_professional_assessment_link',
    'get_patient_assessment_link_context',
    'get_hep_professional',
    'get_professionals_basic_info',
    'search_marketplace_professionals',
    'get_assessment_progress',
    'save_assessment_progress',
    'clear_assessment_progress'
  ];
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig, p.proname, p.prorettype
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.oid NOT IN (SELECT objid FROM pg_depend WHERE deptype = 'e')
  LOOP
    IF NOT (f.proname = ANY (allowlist)) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.sig);
      -- gatilhos não são chamados pela API; o resto segue disponível a logados
      IF f.prorettype <> 'trigger'::regtype THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.sig);
      END IF;
    END IF;
  END LOOP;
END $$;