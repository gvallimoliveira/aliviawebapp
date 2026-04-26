-- Migrate legacy snake_case anamnesis fields to camelCase for manual assessments
DO $$
DECLARE
  rec RECORD;
  ad jsonb;
  new_ad jsonb;
  tr jsonb;
  pairs text[][] := ARRAY[
    ['chief_complaint','chiefComplaint'],
    ['custom_complaint','customComplaint'],
    ['pain_type','painType'],
    ['pain_types','painTypes'],
    ['pain_duration','painDuration'],
    ['aggravating_factors','aggravatingFactors'],
    ['relieving_factors','relievingFactors'],
    ['previous_surgeries','previousSurgeries'],
    ['previous_treatments','previousTreatments'],
    ['activity_level','activityLevel'],
    ['has_gym_access','hasGymAccess'],
    ['has_edema','hasEdema'],
    ['had_twist','hadTwist'],
    ['functional_tests','functionalTests'],
    ['patient_name','patientName'],
    ['patient_email','patientEmail'],
    ['manual_entry','manualEntry']
  ];
  p text[];
BEGIN
  FOR rec IN
    SELECT id, anamnesis_data, test_results
    FROM public.assessments
    WHERE anamnesis_data ? 'chief_complaint'
       OR anamnesis_data ? 'aggravating_factors'
       OR anamnesis_data ? 'relieving_factors'
       OR anamnesis_data ? 'pain_type'
       OR anamnesis_data ? 'previous_surgeries'
       OR anamnesis_data ? 'functional_tests'
  LOOP
    new_ad := COALESCE(rec.anamnesis_data, '{}'::jsonb);
    FOREACH p SLICE 1 IN ARRAY pairs LOOP
      IF (new_ad ? p[1]) AND NOT (new_ad ? p[2]) THEN
        new_ad := new_ad || jsonb_build_object(p[2], new_ad -> p[1]);
      END IF;
    END LOOP;
    -- Backfill chiefComplaints array
    IF NOT (new_ad ? 'chiefComplaints')
       AND (new_ad ? 'chiefComplaint')
       AND jsonb_typeof(new_ad -> 'chiefComplaint') = 'string'
       AND length(new_ad ->> 'chiefComplaint') > 0 THEN
      new_ad := new_ad || jsonb_build_object('chiefComplaints', jsonb_build_array(new_ad -> 'chiefComplaint'));
    END IF;
    -- Backfill painTypes array
    IF NOT (new_ad ? 'painTypes')
       AND (new_ad ? 'painType')
       AND jsonb_typeof(new_ad -> 'painType') = 'string'
       AND length(new_ad ->> 'painType') > 0 THEN
      new_ad := new_ad || jsonb_build_object('painTypes', jsonb_build_array(new_ad -> 'painType'));
    END IF;

    -- Normalize test_results: object {questionnaires: [...]} -> array
    tr := rec.test_results;
    IF tr IS NOT NULL AND jsonb_typeof(tr) = 'object' AND tr ? 'questionnaires'
       AND jsonb_typeof(tr -> 'questionnaires') = 'array' THEN
      -- Move free-text functional_tests into anamnesis_data if not already present
      IF (tr ? 'functional_tests') AND NOT (new_ad ? 'functionalTests') THEN
        new_ad := new_ad || jsonb_build_object('functionalTests', tr -> 'functional_tests');
      END IF;
      UPDATE public.assessments
        SET anamnesis_data = new_ad,
            test_results = tr -> 'questionnaires'
        WHERE id = rec.id;
    ELSE
      UPDATE public.assessments
        SET anamnesis_data = new_ad
        WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;
