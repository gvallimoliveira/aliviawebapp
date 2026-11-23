-- Authorized one-off merge. Keep the original UUID, plan, sessions and link.
-- The duplicate is removed only if it has no patient-ID dependents or import journal.
WITH pair AS (
 SELECT original.id AS keep_id,duplicate.id AS remove_id,duplicate.email,original.professional_id
 FROM patients original JOIN patients duplicate ON duplicate.professional_id=original.professional_id
 WHERE original.id='3a12e64e-4a7d-4cb3-b8a2-2c5cffeb50f6' AND duplicate.id='c92bcae1-c1ca-4bc0-89f5-c97c13eaab9e'
 AND original.professional_id='f67ae246-40d0-4339-ada5-5d718a422224' AND original.clinic_id IS NULL AND duplicate.clinic_id IS NULL
 AND original.full_name='Rafael Lobianco' AND duplicate.full_name=original.full_name AND original.email IS NULL AND duplicate.email='rafalvamorim@gmail.com'
 AND duplicate.import_batch_id IS NULL
 AND NOT EXISTS (
   SELECT patient_id FROM assessment_voice_notes WHERE patient_id=duplicate.id
   UNION ALL SELECT patient_id FROM agent_threads WHERE patient_id=duplicate.id
   UNION ALL SELECT patient_id FROM post_op_profiles WHERE patient_id=duplicate.id
   UNION ALL SELECT patient_id FROM pre_op_profiles WHERE patient_id=duplicate.id
   UNION ALL SELECT patient_id FROM patient_health_records WHERE patient_id=duplicate.id
   UNION ALL SELECT patient_id FROM periodization_plans WHERE patient_id=duplicate.id
   UNION ALL SELECT patient_id FROM periodization_sessions WHERE patient_id=duplicate.id
   UNION ALL SELECT patient_id FROM srpe_entries WHERE patient_id=duplicate.id
   UNION ALL SELECT patient_id FROM readiness_checkins WHERE patient_id=duplicate.id
   UNION ALL SELECT patient_id FROM periodization_links WHERE patient_id=duplicate.id
   UNION ALL SELECT patient_id FROM physiotech_reports WHERE patient_id=duplicate.id
   UNION ALL SELECT patient_id FROM patient_files WHERE patient_id=duplicate.id OR patient_email='patient:'||duplicate.id
   UNION ALL SELECT patient_id FROM cardio_functional_tests WHERE patient_id=duplicate.id
   UNION ALL SELECT patient_id FROM pending_questionnaires WHERE patient_id=duplicate.id
   UNION ALL SELECT record_id FROM import_changes WHERE record_id=duplicate.id
 )
 FOR UPDATE OF original,duplicate
), removed AS (
 DELETE FROM patients p USING pair WHERE p.id=pair.remove_id RETURNING p.id
), kept AS (
 UPDATE patients p SET email=pair.email,notes=concat_ws(E'\n',nullif(p.notes,''),'Cadastros unificados em 23/11/2026 com confirmação do proprietário: mantido cadastro original e vínculos; cadastro duplicado c92bcae1-c1ca-4bc0-89f5-c97c13eaab9e sem dependentes clínicos.'),updated_at=now()
 FROM pair JOIN removed ON removed.id=pair.remove_id WHERE p.id=pair.keep_id RETURNING p.id
), assessments_joined AS (
 UPDATE assessments a SET patient_email=pair.email FROM pair WHERE a.id='9f29f7cf-16d6-4c2f-8ad5-fbbc0c8ec187' AND a.professional_id=pair.professional_id AND a.clinic_id IS NULL AND a.patient_name='Rafael Lobianco' AND a.patient_email IS NULL RETURNING a.id
), appointments_joined AS (
 UPDATE professional_appointments a SET patient_email=pair.email FROM pair WHERE a.professional_id=pair.professional_id AND a.clinic_id IS NULL AND a.patient_name='Rafael Lobianco' AND coalesce(a.patient_email,'')='' RETURNING a.id
)
SELECT (SELECT count(*) FROM kept) kept,(SELECT count(*) FROM assessments_joined) assessments_linked,(SELECT count(*) FROM appointments_joined) appointments_linked,(SELECT count(*) FROM removed) empty_duplicates_removed;