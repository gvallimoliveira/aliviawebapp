ALTER TABLE public.knowledge_articles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'needs_review',
  ADD COLUMN IF NOT EXISTS verification_checked_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS verification_source text,
  ADD COLUMN IF NOT EXISTS verification_matched_title text,
  ADD COLUMN IF NOT EXISTS verification_similarity numeric,
  ADD COLUMN IF NOT EXISTS verification_reason text;

ALTER TABLE public.knowledge_articles
  DROP CONSTRAINT IF EXISTS knowledge_articles_verification_status_check;

ALTER TABLE public.knowledge_articles
  ADD CONSTRAINT knowledge_articles_verification_status_check
  CHECK (verification_status IN ('verified', 'invalid', 'needs_review'));

CREATE INDEX IF NOT EXISTS idx_knowledge_articles_verification_status
  ON public.knowledge_articles(verification_status);

UPDATE public.knowledge_articles
SET verification_status = CASE WHEN approved THEN 'needs_review' ELSE 'invalid' END,
    verification_reason = CASE WHEN approved THEN COALESCE(verification_reason, 'awaiting_strict_revalidation') ELSE COALESCE(verification_reason, 'not_verified') END
WHERE verification_status IS NULL OR verification_status = 'needs_review';