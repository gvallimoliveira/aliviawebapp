UPDATE studio_brands
SET audiences = (
  SELECT jsonb_agg(
    CASE
      WHEN a->>'id' = 'esportista-performance' THEN
        jsonb_set(jsonb_set(a, '{label}', '"Performance esportiva"'), '{desires,0}', '"Retornar ao esporte com segurança"')
      WHEN a->>'id' = 'vestibular' THEN
        jsonb_set(jsonb_set(a, '{label}', '"Tonturas/vertigens"'), '{desires,0}', '"Tratar o sistema vestibular"')
      ELSE a
    END
  )
  FROM jsonb_array_elements(audiences) AS a
),
updated_at = now()
WHERE name ILIKE '%vallim%';