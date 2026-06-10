UPDATE public.knowledge_articles
SET source_url = CASE
  WHEN doi IS NOT NULL AND btrim(doi) <> '' THEN
    'https://doi.org/' || regexp_replace(doi, '^https?://(dx\.)?doi\.org/', '', 'i')
  ELSE
    'https://pubmed.ncbi.nlm.nih.gov/?term=' || replace(replace(replace(title, ' ', '+'), '&', '%26'), '#', '%23')
END
WHERE source_url IS NULL
   OR source_url ILIKE '%pedro.org.au%'
   OR source_url ILIKE '%search.pedro.org.au%';