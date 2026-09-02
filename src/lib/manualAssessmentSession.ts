/**
 * Persistência de sessão da Avaliação Manual.
 *
 * Marca em localStorage que existe um modal de avaliação manual ativo, para
 * que se o app for descarregado pelo SO (tela bloqueada, troca de app na PWA,
 * reload forçado) o usuário seja levado de volta para a mesma avaliação ao
 * reabrir o Alivia — restaurando também o rascunho via `useAutosaveDraft`.
 *
 * Regras de estabilidade (evitam modal "fantasma" reabrindo):
 *  - Só retomamos sessões marcadas como `hasContent` (houve digitação real).
 *  - Fechar/salvar/descartar encerra a sessão explicitamente (`closeSession`),
 *    e uma sessão encerrada nunca é retomada.
 *
 * NÃO toca em service workers, auth, ou rotas. Só itens de localStorage.
 */

const KEY = "alivia:manual-assessment:session";
const CLOSED_KEY = "alivia:manual-assessment:closed";
const TTL_MS = 12 * 60 * 60 * 1000; // 12h

export interface ManualAssessmentSession {
  professionalId: string;
  clinicId?: string | null;
  patientName: string;
  patientEmail?: string | null;
  patientId?: string | null;
  editAssessmentId?: string | null;
  userId?: string | null;
  openedAt: number;
  /** Identificador estável desta abertura do modal. */
  sessionId?: string;
  /** true quando o rascunho já tem conteúdo real digitado pelo usuário. */
  hasContent?: boolean;
}

export const newManualAssessmentSessionId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const saveManualAssessmentSession = (session: ManualAssessmentSession) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    /* quota — ignora */
  }
};

const isClosed = (sessionId?: string) => {
  if (!sessionId) return false;
  try {
    return localStorage.getItem(CLOSED_KEY) === sessionId;
  } catch {
    return false;
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
    if (isClosed(parsed.sessionId)) return null;
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Sessão elegível para retomada automática: além de válida, precisa ter
 * conteúdo real. Abrir o modal e fechar sem digitar nada nunca reabre.
 */
export const getResumableManualAssessmentSession = (): ManualAssessmentSession | null => {
  const s = getManualAssessmentSession();
  if (!s) return null;
  return s.hasContent ? s : null;
};

/** Encerra explicitamente a sessão (fechou, salvou ou descartou). */
export const closeManualAssessmentSession = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ManualAssessmentSession;
      if (parsed?.sessionId) localStorage.setItem(CLOSED_KEY, parsed.sessionId);
    }
  } catch {
    /* noop */
  }
  clearManualAssessmentSession();
};

export const clearManualAssessmentSession = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
};
