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

import { isAliviaCoreBrand } from "@/pages/studio-pro/aliviaCoreCharm";
import type { WorldContent } from "./content/types";

/* ------------------------------------------------------------------ *
 * REGRA 1 — autoavaliação
 * ------------------------------------------------------------------ */

/** Palavras que, logo depois de "avaliação", indicam avaliação de terceiro. */
const THIRD_PARTY_AFTER =
  /^\s*(m[eé]dica|presencial|cl[íi]nica|com\s+(um|uma|o|a)\s|de\s+um\s+(m[eé]dico|fisio)|do\s+(m[eé]dico|fisio)|fisioterap[êe]utica|em\s+consult[óo]rio)/i;

/** Trechos antes de "avaliação" que também indicam terceiro conduzindo. */
const THIRD_PARTY_BEFORE = /(procurar|buscar|marcar|agendar|indicar|encaminhar)\s+(uma\s+|a\s+)?$/i;

/**
 * ATOR PROFISSIONAL NA FRASE — a autoavaliação é um fluxo só entre paciente e
 * Aliv.iA. Se a frase fala de clínica, fisioterapeuta, equipe, secretária,
 * acadêmico etc., NÃO é autoavaliação: lá existe profissional envolvido e o
 * termo correto é "avaliação"/"reavaliação" (ou "pré-avaliação" quando é o
 * link enviado ao paciente antes da consulta).
 */
const PRO_ACTOR =
  /cl[íi]nic|fisioterapeut|profissional|profissionai|secret[áa]ri|recep[çc]|equipe|time\s+cl[íi]nico|consult[óo]rio|acad[êe]mic|professor|docent|estudante|aluno|supervis|preparador|terapeut|especialista|m[ée]dic/i;

/**
 * O LINK ENVIADO PELO PROFISSIONAL É PRÉ-AVALIAÇÃO — quando a frase fala do
 * link/convite que a clínica, o profissional ou o acadêmico manda ao paciente
 * antes da consulta, o termo é "pré-avaliação".
 */
const PRE_ASSESSMENT_CONTEXT =
  /(link|convite|envi(a|o|ar|ada|ado)|manda(r|o)|antes\s+d(a|o)\s+(primeira\s+)?(consulta|sess[ãa]o|atendimento)|chega\s+preenchid|preenchid[ao]\s+antes)/i;

const keepCase = (sample: string, word: string) => {
  if (sample === sample.toUpperCase() && /[A-ZÁ-Ú]/.test(sample)) return word.toUpperCase();
  if (sample[0] === sample[0]?.toUpperCase()) return word.charAt(0).toUpperCase() + word.slice(1);
  return word;
};

/**
 * Troca "avaliação(ões)" por "autoavaliação(ões)" preservando capitalização.
 * "reavaliação", "autoavaliação", "pré-avaliação" e avaliações de terceiro
 * ficam intactas; frases com ator profissional também.
 */
export const selfAssessmentTerms = (text: string): string => {
  if (!text) return text;
  if (PRO_ACTOR.test(text)) return text;
  return text.replace(/(\w*?)(avalia[çc](?:[ãa]o|[õo]es))/gi, (match, prefix: string, word: string, offset: number) => {
    // já é auto/re-avaliação, ou parte de outra palavra (ex. "reavaliação")
    if (prefix) return match;
    const before = text.slice(Math.max(0, offset - 24), offset);
    if (/\b(auto|re|pr[ée])[\s-]*$/i.test(before)) return match;
    if (THIRD_PARTY_BEFORE.test(before)) return match;
    const after = text.slice(offset + word.length);
    if (THIRD_PARTY_AFTER.test(after)) return match;
    return keepCase(word, `auto${word.toLowerCase()}`);
  });
};

/**
 * Troca "avaliação" por "pré-avaliação" quando a frase fala do link/convite
 * que o profissional envia ao paciente antes do atendimento.
 */
export const preAssessmentTerms = (text: string): string => {
  if (!text || !/avalia[çc](?:[ãa]o|[õo]es)/i.test(text)) return text;
  if (!PRE_ASSESSMENT_CONTEXT.test(text)) return text;
  return text.replace(/(\w*?)(avalia[çc](?:[ãa]o|[õo]es))/gi, (match, prefix: string, word: string, offset: number) => {
    if (prefix) return match;
    const before = text.slice(Math.max(0, offset - 24), offset);
    if (/\b(auto|re|pr[ée])[\s-]*$/i.test(before)) return match;
    return keepCase(word, `pré-${word.toLowerCase()}`);
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
  // Voz de paciente: fluxo direto com a Aliv.iA — nunca é o link do profissional.
  return options.patientVoice ? selfAssessmentTerms(out) : preAssessmentTerms(out);
};



/**
 * Varredura barata: só reconstrói o nó quando alguma string realmente mudou —
 * o acervo é grande e a geração de lote passa por aqui a cada arte.
 */
const walk = (value: unknown, options: TerminologyOptions): unknown => {
  if (typeof value === "string") {
    if (!/protocolo|avalia/i.test(value)) return value;
    return applyTerms(value, options);
  }
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((item) => {
      const next = walk(item, options);
      if (next !== item) changed = true;
      return next;
    });
    return changed ? out : value;
  }
  if (value && typeof value === "object") {
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      const next = walk(item, options);
      if (next !== item) changed = true;
      out[key] = next;
    }
    return changed ? out : value;
  }
  return value;
};

/**
 * Varre todo o acervo (headlines, subs, fechos, carrosséis, vendas…).
 * Memoizado por objeto: a geração de lote reaproveita o mesmo acervo dezenas de
 * vezes e a varredura não precisa repetir trabalho.
 */
const cache = new WeakMap<object, Map<boolean, WorldContent>>();

export const applyTerminology = (content: WorldContent, options: TerminologyOptions = {}): WorldContent => {
  const key = !!options.patientVoice;
  let byVoice = cache.get(content as object);
  if (!byVoice) {
    byVoice = new Map();
    cache.set(content as object, byVoice);
  }
  const hit = byVoice.get(key);
  if (hit) return hit;
  const out = walk(content, options) as WorldContent;
  byVoice.set(key, out);
  return out;
};

/** Termos que identificam público de paciente / sub-nicho clínico. */
const PATIENT_AUDIENCE =
  /paciente|dor\b|dor\s+cr[oô]nica|dor\s+persistente|lombar|coluna|joelho|ombro|les[ãa]o|p[oó]s[-\s]?operat[oó]rio|p[oó]s[-\s]?cir[uú]rgic|60\s*\+|idos[oa]|terceira idade|esportista|atleta|corredor|corrida|praticante/i;

/**
 * A relação da arte fala com paciente? (aceita rótulo, palavra-chave, gancho)
 * Público com ator profissional (clínica, fisioterapeuta, equipe, acadêmico)
 * NUNCA é voz de paciente — ali não existe autoavaliação.
 */
export const isPatientVoice = (probe: string): boolean => {
  const text = probe ?? "";
  if (PRO_ACTOR.test(text)) return false;
  return PATIENT_AUDIENCE.test(text);
};


/**
 * Decide o modo "autoavaliação" de uma arte: só vale para a marca clínica dona
 * do app e apenas quando a relação da arte fala com paciente/sub-nicho clínico.
 */
export const patientVoiceFor = (brand: string, probe: string): boolean =>
  isAliviaCoreBrand(brand ?? "") && isPatientVoice(probe);
