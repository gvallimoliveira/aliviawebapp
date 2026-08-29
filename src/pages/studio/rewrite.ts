/**
 * REESCRITA DE FRASE (camada acima do léxico)
 *
 * O léxico troca palavras. Esta camada faz o que faltava: RELEITURA da frase —
 * muda a construção sintática, a ordem das orações, os conectivos e o
 * enquadramento retórico, mantendo a ideia central intacta.
 *
 * Regras duras:
 * - 100% local e determinístico (mesma seed ⇒ mesmo texto). Nenhum crédito de IA.
 * - Nenhum ingrediente novo é inventado: só a forma muda.
 * - Fragmentos (pedaços de headline, palavras soltas, kickers em CAIXA) só
 *   recebem léxico — reescrita estrutural exige frase completa.
 * - Literais proibidos (nome de outra marca) nunca são introduzidos.
 */

import { createRng, type Rng } from "./rng";
import { applyLexicon, type VoiceRegister } from "./lexicon";
import { readsWell } from "./grammar";

export type RewriteMode = "light" | "partial" | "full";

export const modeForIntensity = (intensity: number): RewriteMode =>
  intensity < 0.35 ? "light" : intensity < 0.75 ? "partial" : "full";

const LEX_INTENSITY: Record<RewriteMode, number> = { light: 0.35, partial: 0.7, full: 0.95 };

const clean = (t: string) => t.trim().replace(/\s+/g, " ");
const noDot = (t: string) => clean(t).replace(/[.!?…]+$/, "");
const lower = (t: string) => {
  const s = noDot(t);
  // Preserva siglas / nomes próprios em CAIXA
  if (s.slice(0, 2) === s.slice(0, 2).toUpperCase() && /[A-ZÁ-Ú]{2}/.test(s.slice(0, 2))) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
};
const upperFirst = (t: string) => {
  const s = clean(t);
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const words = (t: string) => noDot(t).split(" ").filter(Boolean);

/** Conectivos equivalentes — trocar muda o ritmo da frase sem mudar o sentido. */
const CONNECTORS: [RegExp, string[]][] = [
  [/\bporque\b/gi, ["porque", "já que", "pois", "uma vez que"]],
  [/\bmas\b/gi, ["mas", "porém", "só que", "e ainda assim"]],
  [/\bpara\b/gi, ["para", "a fim de"]],
  [/\bentão\b/gi, ["então", "por isso", "logo"]],
  [/\btambém\b/gi, ["também", "igualmente", "do mesmo jeito"]],
  [/\bsempre\b/gi, ["sempre", "toda vez", "invariavelmente"]],
  [/\bcada\b/gi, ["cada", "todo"]],
  [/\bquando\b/gi, ["quando", "no momento em que", "assim que"]],
];

/** Reescritas sintáticas: mesma ideia, outra construção. */
const PATTERNS: { id: string; re: RegExp; outs: ((m: RegExpMatchArray) => string)[] }[] = [
  {
    id: "gera",
    re: /^(.{4,60}?)\s+(gera|garante|entrega|traz|constrói|produz|cria)\s+(.{3,80})$/i,
    outs: [
      (m) => `${upperFirst(m[3])} nasce de ${lower(m[1])}.`,
      (m) => `Sem ${lower(m[1])}, não existe ${lower(m[3])}.`,
      (m) => `${upperFirst(m[3])}: consequência direta de ${lower(m[1])}.`,
      (m) => `É ${lower(m[1])} que sustenta ${lower(m[3])}.`,
    ],
  },
  {
    id: "nao-e-e",
    re: /^n[ãa]o\s+é\s+(.{3,60}?)[.,;]\s*é\s+(.{3,70})$/i,
    outs: [
      (m) => `Menos ${lower(m[1])}. Mais ${lower(m[2])}.`,
      (m) => `${upperFirst(m[2])} — e não ${lower(m[1])}.`,
      (m) => `A diferença está em ${lower(m[2])}, não em ${lower(m[1])}.`,
    ],
  },
  {
    id: "transforma",
    re: /^(.{3,50}?)\s+transforma\s+(.{3,50}?)\s+em\s+(.{3,60})$/i,
    outs: [
      (m) => `Com ${lower(m[1])}, ${lower(m[2])} vira ${lower(m[3])}.`,
      (m) => `${upperFirst(m[2])} deixa de ser ponto solto e passa a ser ${lower(m[3])}.`,
      (m) => `De ${lower(m[2])} a ${lower(m[3])} — o caminho é ${lower(m[1])}.`,
    ],
  },
  {
    id: "subordinada",
    re: /^(quando|se|enquanto|para|com|sem|antes de|depois de|já que|porque)\s+(.{6,70}?),\s*(.{6,80})$/i,
    outs: [
      (m) => `${upperFirst(m[3])} ${lower(m[1])} ${lower(m[2])}.`,
      (m) => `${upperFirst(m[3])} — ${lower(m[1])} ${lower(m[2])}.`,
    ],
  },
  {
    id: "e-adjetivo",
    re: /^(.{4,50}?)\s+é\s+(.{4,70})$/i,
    outs: [
      (m) => `${upperFirst(m[2])}: é assim que se descreve ${lower(m[1])}.`,
      (m) => `Chame de ${lower(m[2])}. O nome disso é ${lower(m[1])}.`,
      (m) => `${upperFirst(m[1])}? ${upperFirst(m[2])}.`,
    ],
  },
  {
    id: "duas-oracoes",
    re: /^(.{8,70}?)\s+e\s+(.{8,80})$/i,
    outs: [
      (m) => `${upperFirst(m[2])}. E ${lower(m[1])}.`,
      (m) => `${upperFirst(m[1])} — ${lower(m[2])}.`,
    ],
  },
];

/** Enquadramentos por registro de voz do kit. */
const PREFIXES: Record<VoiceRegister, string[]> = {
  tecnico: ["Na prática:", "Em termos claros:", "O critério é simples:", "Objetivamente:"],
  proximo: ["Olha só:", "Vou ser sincero:", "Na real:", "Pensa com a gente:"],
  direto: ["Direto ao ponto:", "Simples assim:", "Sem rodeio:", "Resumindo:"],
  inspirador: ["Imagina:", "É aqui que começa:", "Pensa junto:", "Vale lembrar:"],
  sobrio: ["O ponto é este:", "Em essência:", "Por princípio:", "Vale registrar:"],
};

const SUFFIXES: Record<VoiceRegister, string[]> = {
  tecnico: [" Sem margem para achismo.", " Critério, não intuição.", " Reprodutível."],
  proximo: [" Simples assim.", " Sem complicação.", " É isso que muda o dia."],
  direto: [" Sem atalho.", " Ponto.", " Nada além disso."],
  inspirador: [" E isso muda o rumo.", " Aqui está a virada.", " Vale cada passo."],
  sobrio: [" Sem letra miúda.", " Por consistência.", " Por padrão."],
};

const QUESTIONS: ((core: string) => string)[] = [
  (c) => `E se ${lower(c)} fosse o normal?`,
  (c) => `Por que aceitar menos do que ${lower(c)}?`,
  (c) => `Faz sentido para você que ${lower(c)}?`,
];

const isSentence = (text: string) => {
  const t = clean(text);
  if (t.length < 18) return false;
  if (t === t.toUpperCase()) return false; // kicker em caixa alta
  if (!/^[A-ZÁ-Ú]/.test(t)) return false; // fragmento (ex.: " existe para resolver")
  if (!/[.!?]$/.test(t)) return false;
  return words(t).length >= 4;
};

const applyConnectors = (text: string, rng: Rng) => {
  let out = text;
  CONNECTORS.forEach(([re, list], idx) => {
    out = out.replace(re, (match) => {
      const pick = list[createRng(`${rng.int(9999)}:conn:${idx}:${match}`).int(list.length)];
      if (!pick || pick.toLowerCase() === match.toLowerCase()) return match;
      return match[0] === match[0].toUpperCase() ? upperFirst(pick) : pick;
    });
  });
  return out;
};

const restructure = (sentence: string, rng: Rng): string => {
  const core = noDot(sentence);
  const candidates = PATTERNS.map((p) => ({ p, m: core.match(p.re) })).filter((c) => c.m);
  if (!candidates.length) return sentence;
  const chosen = candidates[rng.int(candidates.length)];
  const out = chosen.p.outs[rng.int(chosen.p.outs.length)](chosen.m as RegExpMatchArray);
  return clean(out);
};

const frame = (sentence: string, register: VoiceRegister, rng: Rng): string => {
  const core = noDot(sentence);
  const roll = rng.int(10);
  if (roll < 3) return `${PREFIXES[register][rng.int(PREFIXES[register].length)]} ${lower(core)}.`;
  if (roll < 5 && core.length <= 80) return `${core}.${SUFFIXES[register][rng.int(SUFFIXES[register].length)]}`;
  if (roll < 6 && core.length <= 70 && !/[—:–]/.test(core)) return QUESTIONS[rng.int(QUESTIONS.length)](core);
  return sentence;
};

export type RewriteOptions = {
  register: VoiceRegister;
  seed: string;
  intensity?: number;
  forbidden?: string[];
};

/**
 * Releitura da frase: léxico + reescrita estrutural + enquadramento, na
 * intensidade pedida. Fragmentos recebem apenas léxico.
 */
export const rephrase = (text: string, options: RewriteOptions): string => {
  if (!text || !text.trim()) return text;
  const { register, seed, intensity = 0.58, forbidden = [] } = options;
  const mode = modeForIntensity(intensity);

  const lexedRaw = applyLexicon(text, { register, seed, intensity: LEX_INTENSITY[mode], forbidden });
  // Troca de palavra que estraga a concordância é descartada na origem.
  const lexed = readsWell(lexedRaw) || !readsWell(text) ? lexedRaw : text;
  if (mode === "light" || !isSentence(lexed)) return lexed;

  const sentences = lexed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [lexed];
  const rebuilt = sentences
    .map((raw, i) => {
      const sentence = clean(raw);
      if (!sentence) return "";
      const rng = createRng(`rw:${seed}:${i}:${sentence.length}`);
      let out = applyConnectors(sentence, rng);
      if (isSentence(out) || mode === "full") out = restructure(out, rng);
      if (mode === "full" && isSentence(out)) out = frame(out, register, rng);
      return clean(out);
    })
    .filter(Boolean)
    .join(" ");

  const final = clean(rebuilt) || lexed;
  // Portão de leitura: reescrita que quebra o português volta para a origem.
  if (!readsWell(final) && readsWell(lexed)) return lexed;
  if (forbidden.some((bad) => bad && final.toLowerCase().includes(bad.toLowerCase()))) return lexed;
  // Segurança: reescrita não pode inflar demais o texto (quadro tem limite).
  if (final.length > lexed.length * 1.45 + 12) return lexed;
  return final;
};
