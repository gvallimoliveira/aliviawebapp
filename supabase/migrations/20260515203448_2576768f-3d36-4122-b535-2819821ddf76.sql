
REVOKE EXECUTE ON FUNCTION public.get_patient_churn_risk(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_discharge_predictions(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_patient_adherence_scores(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_clinic_benchmarks(uuid) FROM anon;
