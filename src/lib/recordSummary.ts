/** Pure rules for the patient-record "Resumo" dialog. */
import { isHealthHistoryEmpty, normalizeHealthHistory } from "@/lib/healthHistory";

/** Preserve every recorded warning and its explicit dismissal; absence on a newer exam is not resolution. */
export function summaryClinicalAlerts(assessments: any[]) {
  return assessments.flatMap((a) => {
    const raw = a.red_flags;
    const diagnosisFlags = a.diagnosis?.redFlags ?? a.diagnosis?.red_flags;
    const flags = Array.isArray(raw?.detected) ? raw.detected
      : Array.isArray(raw) ? raw
      : Array.isArray(diagnosisFlags) ? diagnosisFlags
      : raw && typeof raw === "object" ? Object.entries(raw).filter(([k, v]) => k.startsWith("redflags.") && v === true).map(([k]) => k) : [];
    const items = [...new Set<string>(flags.filter((f: unknown): f is string => typeof f === "string" && !!f.trim()))];
    if (!items.length) return [];
    return [{ id: a.id, date: raw?.answered_at || a.created_at, items, dismissedAt: a.red_flags_dismissed_at || null, dismissedBy: a.red_flags_dismissed_by_name || null, reason: a.red_flags_dismissed_reason || null }];
  }).sort((a, b) => Number(!!a.dismissedAt) - Number(!!b.dismissedAt) || (b.date || "").localeCompare(a.date || ""));
}

/** Same recency policy as Saúde geral: latest day, manual precedence, latest edit as tie-breaker. */
export function summaryHealthRecord(assessments: any[], manual: any[]) {
  const records = [
    ...assessments.map((a) => ({ date: a.created_at, source: "assessment", data: normalizeHealthHistory(a.anamnesis_data), tie: a.created_at })),
    ...manual.map((r) => ({ date: `${r.recorded_at}T12:00:00`, source: "manual", data: normalizeHealthHistory(r), tie: r.updated_at || r.created_at || `${r.recorded_at}T12:00:00` })),
  ].filter((r) => !isHealthHistoryEmpty(r.data));
  return records.sort((a, b) => {
    const dayA = new Date(a.date).setHours(0, 0, 0, 0);
    const dayB = new Date(b.date).setHours(0, 0, 0, 0);
    return dayB - dayA || (a.source !== b.source ? a.source === "manual" ? -1 : 1 : new Date(b.tie).getTime() - new Date(a.tie).getTime());
  })[0] || null;
}

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
