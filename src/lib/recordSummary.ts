/** Pure rules for the patient-record "Resumo" dialog. */

/** Hypothesis in force: professional override wins over the AI hypothesis. */
export function effectiveHypothesis(a: { final_hypothesis?: string | null; diagnosis?: { hypothesis?: string | null } | null } | null | undefined): string | null {
  if (!a) return null;
  const override = (a.final_hypothesis || "").trim();
  if (override) return override;
  const ai = (a.diagnosis?.hypothesis || "").trim();
  return ai || null;
}

/** Most recent non-empty evolution note (by session_date, then created_at). */
export function latestEvolution<T extends { session_date?: string | null; created_at?: string | null; content?: string | null; observation?: string | null }>(notes: T[]): T | null {
  const filled = notes.filter((n) => ((n.content || "") + (n.observation || "")).trim().length > 0);
  if (!filled.length) return null;
  const key = (n: T) => `${n.session_date || ""}|${n.created_at || ""}`;
  return filled.reduce((best, n) => (key(n) > key(best) ? n : best));
}

/** Most recently created item (e.g. last exercise program sent). */
export function latestByCreated<T extends { created_at?: string | null }>(items: T[]): T | null {
  if (!items.length) return null;
  return items.reduce((best, n) => ((n.created_at || "") > (best.created_at || "") ? n : best));
}
