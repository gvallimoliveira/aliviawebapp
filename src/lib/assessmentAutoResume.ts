/**
 * Retomada automática de avaliações interrompidas (fluxo do paciente).
 *
 * Guarda um "snapshot" do progresso da avaliação (identificação, red flags,
 * anamnese concluída, questionários respondidos e a etapa atual) em
 * localStorage, com validade de 24h. Ao reabrir o mesmo link de avaliação
 * dentro dessa janela, o paciente é levado direto para a tela de retomada e
 * segue de onde parou — sem redigitar nada.
 *
 * O texto livre digitado *durante* a anamnese continua protegido pelo
 * `useAutosaveDraft` (chave `alivia:draft:anamnesis:<scope>`), que usa o mesmo
 * scopeKey — por isso `clearAssessmentProgress` também limpa o rascunho.
 */

const PREFIX = "alivia:assessment-progress:";
export const ASSESSMENT_PROGRESS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export type ResumableStep =
  | "patient_info"
  | "redflags"
  | "redflag_continue"
  | "anamnesis"
  | "questionnaire";

export const RESUMABLE_STEPS: ResumableStep[] = [
  "patient_info",
  "redflags",
  "redflag_continue",
  "anamnesis",
  "questionnaire",
];

export interface AssessmentProgressSnapshot {
  step: ResumableStep;
  assessmentId: string | null;
  patientName: string;
  patientEmail: string;
  anamnesisData: any | null;
  questionnaireResults: any[];
  redFlagData: Record<string, boolean> | null;
  savedAt: number;
}

const key = (scopeKey: string) => `${PREFIX}${scopeKey}`;

export const saveAssessmentProgress = (
  scopeKey: string,
  snapshot: Omit<AssessmentProgressSnapshot, "savedAt">,
) => {
  try {
    localStorage.setItem(
      key(scopeKey),
      JSON.stringify({ ...snapshot, savedAt: Date.now() }),
    );
  } catch {
    /* quota cheia — ignora */
  }
};

export const getAssessmentProgress = (
  scopeKey: string,
): AssessmentProgressSnapshot | null => {
  try {
    const raw = localStorage.getItem(key(scopeKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AssessmentProgressSnapshot;
    if (!parsed?.step || !parsed?.savedAt) return null;
    if (Date.now() - parsed.savedAt > ASSESSMENT_PROGRESS_TTL_MS) {
      localStorage.removeItem(key(scopeKey));
      return null;
    }
    if (!RESUMABLE_STEPS.includes(parsed.step)) return null;
    return parsed;
  } catch {
    return null;
  }
};

/** Existe algo que valha a pena retomar? (evita abrir retomada "vazia") */
export const hasMeaningfulProgress = (s: AssessmentProgressSnapshot | null) => {
  if (!s) return false;
  if (s.anamnesisData && Object.keys(s.anamnesisData).length > 0) return true;
  if (s.questionnaireResults?.length) return true;
  if (s.redFlagData && Object.keys(s.redFlagData).length > 0) return true;
  return !!(s.assessmentId || s.patientName?.trim());
};

export const clearAssessmentProgress = (scopeKey: string) => {
  try {
    localStorage.removeItem(key(scopeKey));
    // limpa também o rascunho local da anamnese (mesmo scopeKey)
    localStorage.removeItem(`alivia:draft:anamnesis:${scopeKey}`);
  } catch {
    /* noop */
  }
};
