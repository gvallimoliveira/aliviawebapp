/**
 * Gaveta do ciclo de tratamento: agrupa avaliações que tratam a mesma queixa
 * (compartilham ao menos uma região de dor) e define a janela de datas do ciclo.
 * Puro e sem escrita — só decide o que o prontuário exibe.
 */
export interface CycleAssessment { id: string; created_at: string; pain_regions?: string[] | null }

const rawRegions = (a: CycleAssessment) => (a.pain_regions || []).filter(Boolean);

/** Reavaliações sem mapa de dor herdam as regiões da avaliação anterior mais próxima (mesmo caso). */
function effectiveRegions<T extends CycleAssessment>(all: T[]): Map<string, Set<string>> {
  const sorted = [...all].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const out = new Map<string, Set<string>>();
  let last = new Set<string>();
  for (const a of sorted) {
    const own = rawRegions(a);
    if (own.length) last = new Set(own);
    out.set(a.id, own.length ? new Set(own) : new Set(last));
  }
  return out;
}

export function cycleAssessments<T extends CycleAssessment>(all: T[], anchor: T | null | undefined): T[] {
  if (!anchor) return all;
  const eff = effectiveRegions(all);
  const own = eff.get(anchor.id) ?? new Set(rawRegions(anchor));
  if (own.size === 0) return all.filter((a) => a.id === anchor.id || (eff.get(a.id)?.size ?? 0) === 0);
  return all.filter((a) => a.id === anchor.id || [...(eff.get(a.id) ?? [])].some((r) => own.has(r)));
}

/** Janela: da 1ª avaliação do ciclo até a próxima avaliação de outra queixa depois da âncora (exclusiva). */
export function cycleWindow<T extends CycleAssessment>(all: T[], anchor: T | null | undefined): { start: string | null; end: string | null } {
  if (!anchor) return { start: null, end: null };
  const inCycle = new Set(cycleAssessments(all, anchor).map((a) => a.id));
  const sorted = [...all].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const start = sorted.find((a) => inCycle.has(a.id))?.created_at ?? anchor.created_at;
  const end = sorted.find((a) => !inCycle.has(a.id) && Date.parse(a.created_at) > Date.parse(anchor.created_at))?.created_at ?? null;
  return { start: start.slice(0, 10), end: end ? end.slice(0, 10) : null };
}

export const inWindow = (date: string, w: { start: string | null; end: string | null }) =>
  (!w.start || date.slice(0, 10) >= w.start) && (!w.end || date.slice(0, 10) < w.end);
