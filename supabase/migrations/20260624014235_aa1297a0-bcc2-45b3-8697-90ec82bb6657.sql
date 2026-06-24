ALTER TABLE public.knowledge_articles
  ADD COLUMN IF NOT EXISTS pedro_score_status text NOT NULL DEFAULT 'needs_review',
  ADD COLUMN IF NOT EXISTS pedro_score_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS pedro_score_source text,
  ADD COLUMN IF NOT EXISTS pedro_record_id text,
  ADD COLUMN IF NOT EXISTS pedro_score_reason text;

ALTER TABLE public.knowledge_articles
  DROP CONSTRAINT IF EXISTS knowledge_articles_pedro_score_status_check;

ALTER TABLE public.knowledge_articles
  ADD CONSTRAINT knowledge_articles_pedro_score_status_check
  CHECK (pedro_score_status IN ('verified', 'not_applicable', 'unscored', 'mismatch', 'not_found', 'needs_review'));

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_pedro_score_status
  ON public.knowledge_articles(pedro_score_status);

UPDATE public.knowledge_articles
SET pedro_score_status = CASE
    WHEN pedro_score IS NULL THEN 'unscored'
    ELSE 'needs_review'
  END,
  pedro_score_reason = CASE
    WHEN pedro_score IS NULL THEN COALESCE(pedro_score_reason, 'Sem nota PEDro cadastrada.')
    ELSE COALESCE(pedro_score_reason, 'Nota PEDro ainda não revalidada na base PEDro.')
  END,
  updated_at = now()
WHERE pedro_score_status = 'needs_review'
  AND pedro_score_verified_at IS NULL;