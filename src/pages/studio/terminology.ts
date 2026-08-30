/**
 * TERMINOLOGIA DA MARCA (regras duras de vocabulário — ago/2026)
 *
 * Duas regras entregues pelo dono do produto, válidas a partir de agora:
 *
 * 1. AUTOAVALIAÇÃO — quando a arte da marca Aliv.iA fala com PACIENTE (e com os
 *    sub-nichos clínicos: dor crônica, pós-operatório, 60+, praticante de
 *    esporte), o produto é uma AUTOavaliação. "Avaliação" seca dá a entender
 *    que alguém vai avaliar a pessoa. Profissional, clínica e acadêmico seguem
 *    com "avaliação" — lá quem avalia é o profissional.
 *    Exceções preservadas: avaliação feita por OUTRA pessoa (médica,
 *    presencial, com fisioterapeuta) e "reavaliação".
 *
 * 2. SEM PROTOCOLO — a marca nunca AFIRMA ter protocolos. A palavra é trocada
 *    por "método estruturado", "direcionamento" ou "raciocínio clínico",
 *    escolhidos pelo contexto da frase. O uso crítico/contraste
 *    ("protocolo de prateleira não conhece o seu paciente") é preservado:
 *    ali a marca está negando protocolo, não vendendo protocolo.
 *
 * 100% local e determinístico: nenhuma chamada de IA, mesma frase ⇒ mesmo texto.
 */

import type { WorldContent } from "./content/types";

/* ------------------------------------------------------------------ *
 * REGRA 1 — autoavaliação
 * ------------------------------------------------------------------ */

/** Palavras que, logo depois de "avaliação", indicam avaliação de terceiro. */
const THIRD_PARTY_AFTER =
  /^\s*(m[eé]dica|presencial|cl[íi]nica|com\s+(um|uma|o|a)\s|de\s+um\s+(m[eé]dico|fisio)|do\s+(m[eé]dico|fisio)|fisioterap[êe]utica|em\s+consult[óo]rio)/i;

/** Trechos antes de "avaliação" que também indicam terceiro conduzindo. */
const THIRD_PARTY_BEFORE = /(procurar|buscar|marcar|agendar|indicar|encaminhar)\s+(uma\s+|a\s+)?$/i;

const keepCase = (sample: string, word: string) => {
  if (sample === sample.toUpperCase() && /[A-ZÁ-Ú]/.test(sample)) return word.toUpperCase();
  if (sample[0] === sample[0]?.toUpperCase()) return word.charAt(0).toUpperCase() + word.slice(1);
  return word;
};

/**
 * Troca "avaliação(ões)" por "autoavaliação(ões)" preservando capitalização.
 * "reavaliação", "autoavaliação" e avaliações de terceiro ficam intactas.
 */
export const selfAssessmentTerms = (text: string): string => {
  if (!text) return text;
  return text.replace(/(\w*?)(avalia[çc][ãa](?:o|ões|oes))/gi, (match, prefix: string, word: string, offset: number) => {
    // já é auto/re-avaliação, ou parte de outra palavra (ex. "reavaliação")
    if (prefix) return match;
    const before = text.slice(Math.max(0, offset - 24), offset);
    if (/\b(auto|re)\s*$/i.test(before)) return match;
    if (THIRD_PARTY_BEFORE.test(before)) return match;
    const after = text.slice(offset + word.length);
    if (THIRD_PARTY_AFTER.test(after)) return match;
    return keepCase(word, `auto${word.toLowerCase()}`);
  });
};

/* ------------------------------------------------------------------ *
 * REGRA 2 — nada de "protocolo"
 * ------------------------------------------------------------------ */

/** Uso crítico: a frase está NEGANDO protocolo. Preservado de propósito. */
const CRITICAL_USE = [
  /protocolos?\s+de\s+prateleira/i,
  /(mais\s+que|al[ée]m\s+de|n[ãa]o\s+[ée]\s+(s[óo]\s+)?|sem|contra|em\s+vez\s+de|no\s+lugar\s+de)\s+protocolos?/i,
  /protocolos?\s+(gen[ée]ric|engessa|pronto|de\s+internet|copiado)/i,
];

const isCriticalUse = (text: string) => CRITICAL_USE.some((re) => re.test(text));

/** Alternativas aprovadas, escolhidas pelo contexto da frase. */
const replacementFor = (text: string): string => {
  const t = text.toLowerCase();
  if (/(decis|conduta|hip[óo]tese|racioc|clínic|caso|diagn)/.test(t)) return "raciocínio clínico";
  if (/(pr[óo]ximo passo|caminho|dire[çc][ãa]o|o que fazer|orienta|guia|passo a passo)/.test(t)) return "direcionamento";
  return "método estruturado";
};

/** Remove afirmações de protocolo, mantendo o uso crítico. */
export const deprotocol = (text: string): string => {
  if (!text || !/protocolo/i.test(text)) return text;
  if (isCriticalUse(text)) return text;
  const replacement = replacementFor(text);
  return text
    .replace(/\bprotocolos\b/gi, (m) => keepCase(m, replacement))
    .replace(/\bprotocolo\b/gi, (m) => keepCase(m, replacement))
    // "um método estruturado" continua certo; "uns método" não existe no acervo.
    .replace(/\bde\s+(m[ée]todo estruturado)\b/gi, "de $1");
};

/* ------------------------------------------------------------------ *
 * APLICAÇÃO NO ACERVO
 * ------------------------------------------------------------------ */

export type TerminologyOptions = {
  /** true quando a arte fala com paciente / sub-nicho clínico da marca Aliv.iA. */
  patientVoice?: boolean;
};

/** Aplica as regras a uma string solta (usado também nos testes). */
export const applyTerms = (text: string, options: TerminologyOptions = {}): string => {
  const out = deprotocol(text);
  return options.patientVoice ? selfAssessmentTerms(out) : out;
};

const walk = (value: unknown, options: TerminologyOptions): unknown => {
  if (typeof value === "string") return applyTerms(value, options);
  if (Array.isArray(value)) return value.map((item) => walk(item, options));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = walk(item, options);
    return out;
  }
  return value;
};

/** Varre todo o acervo (headlines, subs, fechos, carrosséis, vendas…). */
export const applyTerminology = (content: WorldContent, options: TerminologyOptions = {}): WorldContent =>
  walk(content, options) as WorldContent;

/** Termos que identificam público de paciente / sub-nicho clínico. */
const PATIENT_AUDIENCE =
  /paciente|dor\b|dor\s+cr[oô]nica|dor\s+persistente|lombar|coluna|joelho|ombro|les[ãa]o|p[oó]s[-\s]?operat[oó]rio|p[oó]s[-\s]?cir[uú]rgic|60\s*\+|idos[oa]|terceira idade|esportista|atleta|corredor|corrida|praticante/i;

/** A relação da arte fala com paciente? (aceita rótulo, palavra-chave, gancho) */
export const isPatientVoice = (probe: string): boolean => PATIENT_AUDIENCE.test(probe ?? "");
