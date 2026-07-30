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

/* ------------------------------------------------------------------ *
 * Sincronização em nuvem + conciliação entre dispositivos
 * ------------------------------------------------------------------ */

import { supabase } from "@/integrations/supabase/client";

const DEVICE_ID_KEY = "alivia:device-id";

export const getDeviceId = (): string => {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() ?? `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "unknown-device";
  }
};

/** Rótulo amigável do aparelho, só para avisar o usuário ("iPhone · Safari"). */
export const getDeviceLabel = (): string => {
  if (typeof navigator === "undefined") return "Outro aparelho";
  const ua = navigator.userAgent || "";
  const os =
    /iPhone/i.test(ua) ? "iPhone" :
    /iPad/i.test(ua) ? "iPad" :
    /Android/i.test(ua) ? "Android" :
    /Macintosh/i.test(ua) ? "Mac" :
    /Windows/i.test(ua) ? "Windows" :
    /Linux/i.test(ua) ? "Linux" : "Navegador";
  const browser =
    /Edg\//i.test(ua) ? "Edge" :
    /OPR\//i.test(ua) ? "Opera" :
    /Chrome\//i.test(ua) ? "Chrome" :
    /Firefox\//i.test(ua) ? "Firefox" :
    /Safari\//i.test(ua) ? "Safari" : "";
  return browser ? `${os} · ${browser}` : os;
};

/**
 * A nuvem só entra em cena quando o escopo é estável e único por paciente
 * (link personalizado com token ou reavaliação). Em links genéricos o mesmo
 * escopo seria compartilhado por pacientes diferentes — nesse caso ficamos
 * apenas no backup local, para nunca misturar respostas.
 */
export const isSyncableScope = (scopeKey: string) => {
  const parts = scopeKey.split(":");
  const identity = parts[2];
  return !!identity && identity !== "anon" && identity !== "undefined";
};

export interface RemoteProgress {
  snapshot: AssessmentProgressSnapshot;
  deviceId: string;
  deviceLabel: string | null;
  updatedAt: number;
}

export const saveAssessmentProgressRemote = async (
  scopeKey: string,
  snapshot: Omit<AssessmentProgressSnapshot, "savedAt">,
) => {
  if (!isSyncableScope(scopeKey)) return;
  try {
    await (supabase as any).rpc("save_assessment_progress", {
      _scope_key: scopeKey,
      _snapshot: { ...snapshot, savedAt: Date.now() },
      _device_id: getDeviceId(),
      _device_label: getDeviceLabel(),
    });
  } catch {
    /* offline — o backup local continua valendo */
  }
};

export const getAssessmentProgressRemote = async (
  scopeKey: string,
): Promise<RemoteProgress | null> => {
  if (!isSyncableScope(scopeKey)) return null;
  try {
    const { data } = await (supabase as any).rpc("get_assessment_progress", {
      _scope_key: scopeKey,
    });
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.snapshot) return null;
    const snap = row.snapshot as AssessmentProgressSnapshot;
    if (!snap?.step || !RESUMABLE_STEPS.includes(snap.step)) return null;
    const updatedAt = new Date(row.updated_at).getTime();
    if (Date.now() - updatedAt > ASSESSMENT_PROGRESS_TTL_MS) return null;
    return {
      snapshot: { ...snap, savedAt: snap.savedAt || updatedAt },
      deviceId: row.device_id,
      deviceLabel: row.device_label ?? null,
      updatedAt,
    };
  } catch {
    return null;
  }
};

export const clearAssessmentProgressRemote = async (scopeKey: string) => {
  if (!isSyncableScope(scopeKey)) return;
  try {
    await (supabase as any).rpc("clear_assessment_progress", { _scope_key: scopeKey });
  } catch {
    /* noop */
  }
};

export interface ProgressReconciliation {
  /** Backup escolhido (o mais recente). */
  chosen: AssessmentProgressSnapshot;
  /** Backup alternativo, mais antigo, que será sobrescrito se continuar. */
  alternative: AssessmentProgressSnapshot | null;
  /** true quando o mais recente veio de OUTRO aparelho. */
  fromOtherDevice: boolean;
  otherDeviceLabel: string | null;
  chosenSavedAt: number;
  alternativeSavedAt: number | null;
}

/**
 * Concilia o backup local com o da nuvem: sempre prioriza o mais recente e
 * devolve o outro para que o usuário seja avisado ANTES de sobrescrever.
 */
export const reconcileAssessmentProgress = async (
  scopeKey: string,
): Promise<ProgressReconciliation | null> => {
  const local = getAssessmentProgress(scopeKey);
  const remote = await getAssessmentProgressRemote(scopeKey);

  const localOk = hasMeaningfulProgress(local) ? local : null;
  const remoteOk = remote && hasMeaningfulProgress(remote.snapshot) ? remote : null;

  if (!localOk && !remoteOk) return null;

  const myDevice = getDeviceId();

  if (localOk && remoteOk) {
    const sameDevice = remoteOk.deviceId === myDevice;
    const remoteNewer = remoteOk.updatedAt > (localOk.savedAt || 0);
    const chosen = remoteNewer ? remoteOk.snapshot : localOk;
    const alternative = remoteNewer ? localOk : remoteOk.snapshot;
    const chosenSavedAt = remoteNewer ? remoteOk.updatedAt : localOk.savedAt;
    const alternativeSavedAt = remoteNewer ? localOk.savedAt : remoteOk.updatedAt;
    const meaningfulDiff =
      JSON.stringify(chosen) !== JSON.stringify(alternative) && !sameDevice;
    return {
      chosen,
      alternative: meaningfulDiff ? alternative : null,
      fromOtherDevice: !sameDevice && remoteNewer,
      otherDeviceLabel: remoteOk.deviceLabel,
      chosenSavedAt,
      alternativeSavedAt: meaningfulDiff ? alternativeSavedAt : null,
    };
  }

  if (remoteOk) {
    const sameDevice = remoteOk.deviceId === myDevice;
    return {
      chosen: remoteOk.snapshot,
      alternative: null,
      fromOtherDevice: !sameDevice,
      otherDeviceLabel: remoteOk.deviceLabel,
      chosenSavedAt: remoteOk.updatedAt,
      alternativeSavedAt: null,
    };
  }

  return {
    chosen: localOk!,
    alternative: null,
    fromOtherDevice: false,
    otherDeviceLabel: null,
    chosenSavedAt: localOk!.savedAt,
    alternativeSavedAt: null,
  };
};
