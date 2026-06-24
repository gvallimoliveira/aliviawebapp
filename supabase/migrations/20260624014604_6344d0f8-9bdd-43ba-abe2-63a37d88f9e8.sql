CREATE OR REPLACE FUNCTION public.match_knowledge_articles(
  query_embedding vector(3072),
  match_count INT DEFAULT 5,
  niche_filter TEXT[] DEFAULT NULL,
  min_pedro INT DEFAULT 7
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  authors TEXT,
  year INTEGER,
  journal TEXT,
  pedro_score INTEGER,
  study_type TEXT,
  key_findings TEXT,
  doi TEXT,
  source_url TEXT,
  similarity FLOAT
)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    a.id, a.title, a.authors, a.year, a.journal,
    a.pedro_score, a.study_type, a.key_findings, a.doi, a.source_url,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_articles a
  WHERE a.approved = true
    AND a.embedding IS NOT NULL
    AND a.verification_status = 'verified'
    AND (
      (a.pedro_score_status = 'verified' AND a.pedro_score >= min_pedro)
      OR a.pedro_score_status = 'not_applicable'
    )
    AND (niche_filter IS NULL OR a.niche_tags && niche_filter)
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
$$;