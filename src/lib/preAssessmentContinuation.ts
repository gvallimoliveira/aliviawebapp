/**
 * Continuação da pré-avaliação (link do paciente) pela avaliação manual.
 * Funções puras: detectar pré-avaliação pendente e mesclar o anamnesis_data
 * salvo sem perder as respostas originais do paciente.
 */

export type AnyAssessment = { id: string; created_at?: string; anamnesis_data?: any };

/** Avaliação vinda do link do paciente (não manual, não upload externo). */
export function isLinkPreAssessment(a: AnyAssessment | null | undefined): boolean {
  const an = a?.anamnesis_data || {};
  if (an.manualEntry && !an.patientSnapshot) return false;
  if (an.source === "external_upload") return false;
  return true;
}

/** Pré-avaliação do link ainda não complementada em consulta e mais recente que qualquer avaliação manual. */
export function findPendingPreAssessment<T extends AnyAssessment>(assessments: T[]): T | null {
  const sorted = [...(assessments || [])].sort(
    (x, y) => new Date(y.created_at || 0).getTime() - new Date(x.created_at || 0).getTime(),
  );
  for (const a of sorted) {
    const an = a.anamnesis_data || {};
    if (an.completedInPerson) return null; // a mais recente já foi complementada
    if (an.manualEntry || an.source === "external_upload") return null; // manual mais recente
    return a;
  }
  return null;
}

function mergeSpecialty(prev: any[] | undefined, next: any[] | undefined): any[] | undefined {
  const all = [...(Array.isArray(prev) ? prev : []), ...(Array.isArray(next) ? next : [])];
  if (all.length === 0) return undefined;
  const seen = new Set<string>();
  const out: any[] = [];
  for (const r of all) {
    const key = JSON.stringify([r?.questionnaireId ?? r?.id, r?.appliedAt ?? r?.date, r?.totalScore ?? r?.score]);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/**
 * Mescla o anamnesis_data ao salvar uma edição. Preserva chaves que o formulário
 * manual não conhece (respostas do link), acumula questionários específicos e,
 * em continuação, grava o snapshot original uma única vez + carimbo de consulta.
 */
export function mergeAnamnesisOnUpdate(
  previous: any,
  built: any,
  opts: { continuation: boolean; userId?: string | null; now?: string },
): any {
  const prev = previous && typeof previous === "object" ? previous : {};
  const merged: any = { ...prev, ...built };
  merged.specialtyResults = mergeSpecialty(prev.specialtyResults, built?.specialtyResults);
  if (merged.specialtyResults === undefined) delete merged.specialtyResults;
  if (opts.continuation) {
    if (!prev.patientSnapshot) {
      const { patientSnapshot: _s, completedInPerson: _c, ...original } = prev;
      merged.patientSnapshot = original;
    }
    merged.completedInPerson = { at: opts.now || new Date().toISOString(), by: opts.userId || null };
  }
  return merged;
}
