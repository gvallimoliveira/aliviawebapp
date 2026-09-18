/**
 * PILARES DA ESCRITA CHARMOSA (ago/2026)
 *
 * Valem SOMENTE para os ângulos de venda, dor e desejo. O ângulo "informar"
 * continua com a postura de sócio experiente — charme ali viraria enfeite.
 *
 * Regra central: trocar jargão técnico de venda por EMPATIA ESTRUTURADA. O
 * texto mostra que entende a frustração de quem lê e apresenta o método como a
 * ponte lógica e segura até a solução.
 *
 * Os quatro pilares implementados aqui:
 * 1. RITMO SEDUTOR — frase longa e fluida seguida de ponto final seco. A quebra
 *    cria respiração; `charmRhythm` corta o rabo da frase em um remate curto.
 * 2. FOCO NO "VOCÊ" — o ego da marca sai da abertura ("Nós criamos…") e quem
 *    lê passa a ser o protagonista ("Imagine a sensação de…").
 * 3. ANTECIPAÇÃO — nunca entregar todas as características de uma vez: mostra o
 *    benefício emocional e deixa um fio solto que força o clique.
 * 4. CONFIANÇA DESPRETENSIOSA — convite seguro em vez de súplica. "Compre
 *    agora", "última chance" e afins são banidos (`PLEADING_PHRASES`).
 *
 * 100% local e determinístico: nada aqui consome crédito de IA e toda
 * transformação é validada pelo portão de português antes de valer.
 */

import { lowerInitial, readsWell } from "./grammar";
import { proofread } from "./agreement";

/** Súplica de venda — proibida em qualquer arte. */
export const PLEADING_PHRASES: readonly string[] = [
  "compre agora",
  "compre já",
  "corre que é agora",
  "não perca essa chance",
  "não perca essa oportunidade",
  "última chance",
  "imperdível",
  "aproveite já",
  "garanta já",
  "clique aqui agora",
  "vagas acabando",
  "por tempo limitado",
  "só hoje",
  "urgente",
];

export const isPleading = (text: string): boolean => {
  const t = (text ?? "").toLowerCase();
  return PLEADING_PHRASES.some((term) => t.includes(term));
};

const clean = (text: string) => (text ?? "").trim().replace(/\s+/g, " ");
const noDot = (text: string) => clean(text).replace(/\s*[.!?…]+$/, "");
const lower1 = lowerInitial;
const upper1 = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);
const wordCount = (text: string) => clean(text).split(/\s+/).filter(Boolean).length;

/** Convites seguros — substituem qualquer CTA que implore atenção. */
export const CONFIDENT_INVITES: readonly string[] = [
  "Descubra o que estava faltando",
  "Comece pela avaliação",
  "Veja como isso se aplica ao seu caso",
  "Vamos conversar sobre o seu caso",
  "Entenda o seu caso antes de decidir",
];

/**
 * PILAR 4 — confiança despretensiosa. CTA que implora vira convite; CTA já
 * seguro passa intacto (o CTA declarado pela marca é soberano).
 */
export const charmCta = (cta: string, index = 0): string => {
  const core = noDot(cta);
  if (!core) return CONFIDENT_INVITES[index % CONFIDENT_INVITES.length];
  if (!isPleading(core) && !/!\s*$/.test(cta)) return core;
  return CONFIDENT_INVITES[index % CONFIDENT_INVITES.length];
};

/**
 * PILAR 2 — foco implacável no "você". Reescritas conservadoras: só padrões de
 * ego declarado na abertura, e sempre revalidadas pelo portão de português.
 */
const EGO_REWRITES: [RegExp, string][] = [
  [/^n[óo]s\s+(?:criamos|desenvolvemos|fizemos|montamos)\s+(?:o|a)\s+melhor\s+(.+)$/i, "Você sente a diferença de $1"],
  [/^n[óo]s\s+(?:criamos|desenvolvemos|fizemos|montamos)\s+(.+)$/i, "Você recebe $1"],
  [/^n[óo]s\s+(?:oferecemos|entregamos|temos)\s+(.+)$/i, "Você tem $1"],
  [/^a\s+gente\s+(?:criou|montou|fez)\s+(.+)$/i, "Você recebe $1"],
  [/^a\s+gente\s+(?:oferece|entrega|tem)\s+(.+)$/i, "Você tem $1"],
  [/^somos\s+(?:os|as)\s+melhores\s+(?:em\s+)?(.+)$/i, "Você merece critério em $1"],
];

export const youFocus = (text: string): string => {
  const core = clean(text);
  if (!core) return core;
  for (const [re, out] of EGO_REWRITES) {
    if (re.test(core)) {
      const next = clean(core.replace(re, out));
      if (next && readsWell(next)) return upper1(next);
    }
  }
  return core;
};

/**
 * PILAR 1 — ritmo sedutor. Uma frase longa e fluida ganha um remate seco: o
 * último trecho depois da vírgula (ou do conector) vira frase própria.
 * Só acontece quando as duas metades continuam legíveis.
 */
export const charmRhythm = (text: string): string => {
  const core = clean(text);
  if (!core || wordCount(core) < 12) return core;
  // Já tem quebra? Respeita o ritmo que o autor escreveu.
  if (/[.!?]\s+\S/.test(core)) return core;

  const match = core.match(/^(.*?[^,]{6,}),\s+([^,]{8,}?)([.!?]?)$/);
  if (!match) return core;
  const head = noDot(match[1]);
  const tail = noDot(match[2]);
  if (!head || !tail || wordCount(tail) < 3 || wordCount(tail) > 9) return core;
  const out = `${upper1(head)}. ${upper1(tail)}.`;
  return readsWell(head) && readsWell(tail) ? out : core;
};

/**
 * PILAR 3 — antecipação. Não entrega tudo de uma vez: quando o texto lista
 * três ou mais características técnicas separadas por vírgula, guarda a última
 * e deixa o fio solto. Aplicado apenas em apoios (subtítulos, legendas).
 */
export const charmAnticipation = (text: string, teaser = "O resto a gente vê no seu caso."): string => {
  const core = noDot(text);
  const parts = core.split(/,\s+/);
  if (parts.length < 3 || wordCount(core) < 14) return clean(text);
  const kept = parts.slice(0, parts.length - 1).join(", ");
  if (!readsWell(kept)) return clean(text);
  return `${upper1(kept)}. ${teaser}`;
};

/** Remove a súplica sem apagar a frase: exclamação vira ponto seco. */
const unplead = (text: string): string => {
  let out = clean(text).replace(/!+/g, ".");
  for (const term of PLEADING_PHRASES) {
    out = out.replace(new RegExp(`\\s*\\b${term}\\b[,.;:]?`, "gi"), "");
  }
  return clean(out).replace(/\s+([,.;:])/g, "$1").replace(/^[,.;:]\s*/, "");
};

export type CharmOptions = {
  /** Apoios aceitam antecipação; títulos não (o título precisa fechar a ideia). */
  role?: "title" | "support";
  teaser?: string;
};

/**
 * Passa a frase pelos pilares na ordem: súplica fora → foco no você → ritmo →
 * antecipação (só apoio). Qualquer etapa que estrague a leitura é descartada.
 */
export const charmify = (text: string, opts: CharmOptions = {}): string => {
  const original = clean(text);
  if (!original) return original;
  let out = unplead(original);
  out = youFocus(out);
  out = charmRhythm(out);
  if (opts.role === "support") out = charmAnticipation(out, opts.teaser);
  out = proofread(out);
  if (!out || !readsWell(out)) return proofread(original);
  return out;
};

/**
 * Guarda de testes: texto charmoso não implora, não abre com ego da marca e
 * não termina em exclamação.
 */
export const isCharming = (text: string): boolean => {
  const core = clean(text);
  if (!core) return true;
  if (isPleading(core)) return false;
  if (/!\s*$/.test(core)) return false;
  return !/^(?:n[óo]s\s+(?:criamos|oferecemos|temos|desenvolvemos)|somos\s+(?:os|as)\s+melhores)/i.test(core);
};

/** Empatia estruturada: reconhece a frustração antes de propor o caminho. */
export const empathyBridge = (pain: string, bridge: string): string => {
  const p = lower1(noDot(pain));
  const b = lower1(noDot(bridge));
  if (!p || !b) return "";
  const out = `Se ${p} já virou rotina, o problema pode estar na abordagem. ${upper1(b)}.`;
  return readsWell(out) ? out : "";
};
