ALTER TABLE public.knowledge_articles ADD COLUMN IF NOT EXISTS pmid text;
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_pmid ON public.knowledge_articles(pmid);