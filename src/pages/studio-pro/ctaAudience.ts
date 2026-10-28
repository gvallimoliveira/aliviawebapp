/**
 * COERÊNCIA DE CHAMADA × PÚBLICO
 *
 * A chamada final (pílula/CTA) precisa falar com o mesmo público da arte.
 * Arte para profissional/clínica nunca termina em "autoavaliação" (ação do
 * paciente com dor); arte para paciente nunca termina em "painel profissional".
 * Puro e determinístico: só troca a frase quando ela é do público errado.
 */

/** Chamadas que só fazem sentido para o paciente. */
const PATIENT_ONLY_CTA =
  /autoavalia|minha avalia|avalia[çc][ãa]o premium|meu movimento|voltar a treinar|plano seguro|relat[óo]rio da avalia|plano de tratamento|buscar fisioterapeuta|encontrar (um )?fisioterapeuta/i;

/** Chamadas que só fazem sentido para quem atende. */
const PRO_ONLY_CTA =
  /painel profissional|minha cl[íi]nica|da equipe|\bequipe\b|pr[ée]-avalia[çc][ãa]o por link|hep|insights|nps|minha trilha|pr[óo]ximo caso|discutir um caso|agente/i;

export const isPatientOnlyCta = (text: string) => PATIENT_ONLY_CTA.test(text ?? "");
export const isProOnlyCta = (text: string) => PRO_ONLY_CTA.test(text ?? "");

const CTA_KEYS = new Set(["cta", "closing", "ctas"]);

export const PRO_FALLBACK_CTA = "Testar o painel profissional";
export const PATIENT_FALLBACK_CTA = "Fazer minha autoavaliação";

/**
 * Escolhe a chamada de reserva: a do próprio público, se coerente; senão a
 * reserva fixa do lado certo.
 */
export const pickAudienceCta = (patientVoice: boolean, audienceCta?: string): string => {
  const own = audienceCta?.trim();
  if (own && (patientVoice ? !isProOnlyCta(own) : !isPatientOnlyCta(own))) return own;
  return patientVoice ? PATIENT_FALLBACK_CTA : PRO_FALLBACK_CTA;
};

/** Troca, em toda a árvore de conteúdo, chamadas do público errado. */
export const alignCtasToAudience = <T>(content: T, patientVoice: boolean, audienceCta?: string): T => {
  const wrong = patientVoice ? isProOnlyCta : isPatientOnlyCta;
  const fallback = pickAudienceCta(patientVoice, audienceCta);
  const fix = (value: string) => (wrong(value) ? fallback : value);
  const walk = (value: unknown, key?: string): unknown => {
    if (typeof value === "string") return key && CTA_KEYS.has(key) ? fix(value) : value;
    if (Array.isArray(value)) {
      if (key === "ctas") {
        const out = Array.from(new Set(value.map((v) => (typeof v === "string" ? fix(v) : v))));
        return out;
      }
      return value.map((item) => walk(item, key === "ctas" ? key : undefined));
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, walk(v, k)]),
      );
    }
    return value;
  };
  return walk(content) as T;
};
