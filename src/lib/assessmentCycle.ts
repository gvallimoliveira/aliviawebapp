/**
 * Gaveta do ciclo de tratamento: agrupa avaliações que tratam a mesma queixa
 * (compartilham ao menos uma região de dor) e define a janela de datas do ciclo.
 * Puro e sem escrita — só decide o que o prontuário exibe.
 */
export interface CycleAssessment { id: string; created_at: string; pain_regions?: string[] | null }

const regionsOf = (a: CycleAssessment) => new Set((a.pain_regions || []).filter(Boolean));

export function cycleAssessments<T extends CycleAssessment>(all: T[], anchor: T | null | undefined): T[] {
  if (!anchor) return all;
  const own = regionsOf(anchor);
  if (own.size === 0) return all.filter((a) => a.id === anchor.id);
  return all.filter((a) => a.id === anchor.id || [...regionsOf(a)].some((r) => own.has(r)));
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
