UPDATE public.assessments
SET diagnosis = jsonb_set(diagnosis::jsonb, '{hypothesis}', '"Dor femoropatelar no joelho direito, possivelmente relacionada a fatores mecânicos e de carga."'::jsonb)
WHERE id = '5d8633cb-2353-4284-bf42-1e25ae581fa7';