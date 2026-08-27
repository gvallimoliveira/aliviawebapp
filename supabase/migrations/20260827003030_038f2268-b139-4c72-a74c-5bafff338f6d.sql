-- 1. RLS sem política: tabela de auditoria de decisões de crédito (escrita por service_role)
GRANT SELECT ON public.ai_credit_decisions TO authenticated;
GRANT ALL ON public.ai_credit_decisions TO service_role;
CREATE POLICY "Admins can view credit decisions"
  ON public.ai_credit_decisions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 2. search_path fixo
ALTER FUNCTION public.touch_updated_at() SET search_path = public;

-- 3. Revoga EXECUTE de anon em funções SECURITY DEFINER, exceto as realmente públicas
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
    SELECT p.oid::regprocedure AS sig, p.proname
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.oid NOT IN (SELECT objid FROM pg_depend WHERE deptype = 'e')
  LOOP
    IF NOT (f.proname = ANY (allowlist)) THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f.sig);
    END IF;
  END LOOP;
END $$;

-- 4. Funções de gatilho não precisam ser chamáveis pela API
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prorettype = 'trigger'::regtype
      AND p.oid NOT IN (SELECT objid FROM pg_depend WHERE deptype = 'e')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon, authenticated', f.sig);
  END LOOP;
END $$;