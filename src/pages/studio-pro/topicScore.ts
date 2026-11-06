/**
 * VALOR DE VENDA DO ASSUNTO
 *
 * O lote deixa de ser sorteado: cada assunto candidato é pontuado com o que o
 * próprio manual oferece — recorrência da dor, existência de objeção para
 * derrubar, prova para sustentar, especificidade do recorte — e desconto para
 * assunto que já circulou. Determinístico: mesma entrada, mesma ordem.
 */

export type TopicCandidate = {
  id: string;
  /** Quantas vezes a dor desse assunto aparece nas fontes do manual. */
  painFrequency: number;
  /** 1 quando existe objeção real ligada ao assunto. */
  objectionProximity: number;
  hasProof: boolean;
  /** 0..1 — quanto o recorte é concreto (termo técnico, cena, gatilho). */
  specificity: number;
  /** 0..1 — quanto esse assunto já foi usado pela marca. */
  coverageUsed: number;
  /** Editorial relevance to a desired benefit, not predicted conversion. */
  benefitRelevance?: number;
};

export const SALES_VALUE_WEIGHTS = {
  painFrequency: 3,
  objectionProximity: 2.5,
  proofBonus: 2,
  specificity: 1.5,
  coveragePenalty: -4,
  benefitRelevance: 8,
} as const;

export const salesValueScore = (candidate: TopicCandidate): number =>
  Math.min(3, candidate.painFrequency) * SALES_VALUE_WEIGHTS.painFrequency +
  Math.min(1, candidate.objectionProximity) * SALES_VALUE_WEIGHTS.objectionProximity +
  (candidate.hasProof ? SALES_VALUE_WEIGHTS.proofBonus : 0) +
  Math.min(1, Math.max(0, candidate.specificity)) * SALES_VALUE_WEIGHTS.specificity +
  Math.min(1, Math.max(0, candidate.benefitRelevance ?? 0)) * SALES_VALUE_WEIGHTS.benefitRelevance +
  Math.min(1, Math.max(0, candidate.coverageUsed)) * SALES_VALUE_WEIGHTS.coveragePenalty;

/** Ordena do assunto mais vendável ao menos; empate resolve pelo id. */
export const rankTopics = <T extends TopicCandidate>(candidates: T[]): T[] =>
  [...candidates].sort(
    (a, b) => salesValueScore(b) - salesValueScore(a) || a.id.localeCompare(b.id),
  );
