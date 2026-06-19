/**
 * Persistência de sessão da Avaliação Manual.
 *
 * Marca em localStorage que existe um modal de avaliação manual ativo, para
 * que se o app for descarregado pelo SO (tela bloqueada, troca de app na PWA,
 * reload forçado) o usuário seja levado de volta para a mesma avaliação ao
 * reabrir o Alivia — restaurando também o rascunho via `useAutosaveDraft`.
 *
 * NÃO toca em service workers, auth, ou rotas. Só um único item localStorage.
 */

const KEY = "alivia:manual-assessment:session";
const TTL_MS = 12 * 60 * 60 * 1000; // 12h

export interface ManualAssessmentSession {
  professionalId: string;
  clinicId?: string | null;
  patientName: string;
  patientEmail?: string | null;
  editAssessmentId?: string | null;
  userId?: string | null;
  openedAt: number;
}

export const saveManualAssessmentSession = (session: ManualAssessmentSession) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* quota — ignora */
  }
};

export const getManualAssessmentSession = (): ManualAssessmentSession | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ManualAssessmentSession;
    if (!parsed?.professionalId || !parsed?.patientName || !parsed?.openedAt) return null;
    if (Date.now() - parsed.openedAt > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const clearManualAssessmentSession = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
};
