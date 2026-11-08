/**
 * VOZ VETERINÁRIA — separa quem lê de quem recebe o cuidado.
 *
 * O tutor observa, decide e agenda. Sintomas, achados, exames e condutas
 * pertencem ao animal. A regra é detectada pelo domínio da marca, portanto
 * protege qualquer marca veterinária sem contaminar os demais nichos.
 */

import { proofread } from "@/pages/studio/agreement";
import { closeThought, isOrphanCommand, joinCopyParts } from "@/pages/studio/typographyGuards";
import { hasDanglingEnding } from "@/pages/studio/grammar";
import { ARC_TOO_SIMILAR, textSimilarity } from "./narrativeArc";
import { clarifyStudioCopy } from "./contextualCopy";
import { finalizeListCoherence } from "@/pages/studio/listCoherence";

const VETERINARY_DOMAIN = /\b(?:veterin[aá]ri[ao]s?|vet\b|animal(?:is)?|pets?|canin[oa]s?|felin[oa]s?|c[aã]es?|gatos?|citologia\s+veterin[aá]ria)\b/i;

const ANIMAL_CLINICAL = /\b(?:coceira|prurido|otite|dermatite|piodermite|infec(?:ç|c)[aã]o|falha(?:s)?\s+de\s+pelo|queda\s+de\s+pelo|n[oó]dulo|carocinho|les(?:ã|a)o|ferida|sintoma|sinal\s+cl[ií]nico|dor|inc[oô]modo|alergia|secre(?:ç|c)[aã]o|lambedura|vermelhid[aã]o|citologia|paaf|raspado|swab|l[aâ]mina|exame|diagn[oó]stico|tratamento|conduta)\w*/i;

const ALINE_VET = /\b(?:dra\.?\s+)?aline\s+furtado(?:\s+vet(?:erin[aá]ria)?)?\b/i;

const ALINE_SIGNPOSTS = [
  {
    title: "Alergia: do descontrole ao cuidado",
    before: ["Pet com alergia sem manejo, descontrolada"],
    after: ["Cuidar e devolver qualidade de vida com Dra. Aline Furtado"],
  },
  {
    title: "Da dúvida à identificação",
    before: ["Dúvida sobre qual infecção está instalada"],
    after: ["Citologia especializada com Dra. Aline Furtado"],
  },
  {
    title: "Coceira recorrente pede investigação",
    before: ["Coceira que volta sem uma causa esclarecida"],
    after: ["Investigar a origem com Dra. Aline Furtado"],
  },
  {
    title: "Otite recorrente não é rotina",
    before: ["Otite tratada sem identificar o agente"],
    after: ["Citologia para direcionar o cuidado com Dra. Aline Furtado"],
  },
  {
    title: "Nódulos merecem resposta",
    before: ["Nódulo observado sem saber o que ele representa"],
    after: ["Investigação citológica com Dra. Aline Furtado"],
  },
];

export const isVeterinaryContext = (...values: unknown[]): boolean =>
  VETERINARY_DOMAIN.test(values.filter((value) => typeof value === "string").join(" · "));

export const veterinaryVoiceText = (input: string): string => {
  // Mesmo sem nomear um sintoma, modelos genéricos de serviço não podem
  // transformar o tutor no paciente. O tutor observa e decide; o caso, a meta
  // clínica e a evolução continuam pertencendo ao animal.
  let revised = input
    .replace(/\bo que voc[eê] quer alcançar\b/gi, "o que você observa e busca para seu pet")
    .replace(/\b(?:o\s+)?seu caso\b/gi, "o caso do seu pet")
    .replace(/\bcomo voc[eê] est[aá] evoluindo\b/gi, "como seu pet está evoluindo")
    .replace(/\bo que avançou fica, o que n[aã]o avançou muda\b/gi, "o que melhorou no seu pet fica; o que não melhorou orienta a mudança")
    .replace(/\bvoc[eê] sem saber onde est[aá]\b/gi, "você sem saber o que acontece com seu pet");

  if (!ANIMAL_CLINICAL.test(revised)) {
    return /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(input)
      ? revised.charAt(0).toLocaleUpperCase("pt-BR") + revised.slice(1)
      : revised;
  }

  revised = revised
    .replace(/\bo que voc[eê] sente hoje\b/gi, "o que seu pet apresenta hoje")
    .replace(/\bvoc[eê]\s+(sente|tem|apresenta|est[aá]\s+com|convive\s+com|sofre\s+com)\b/gi, (_all, verb: string) => `seu pet ${verb.toLowerCase()}`)
    .replace(/\b(?:a\s+)?sua\s+(coceira|otite|dermatite|piodermite|infec(?:ç|c)[aã]o|dor|alergia|lambedura|vermelhid[aã]o)\b/gi, (_all, symptom: string) => `a ${symptom.toLowerCase()} do seu pet`)
    .replace(/\b(?:o\s+)?seu\s+(n[oó]dulo|carocinho|sintoma|diagn[oó]stico|tratamento|exame)\b/gi, (_all, finding: string) => `o ${finding.toLowerCase()} do seu pet`)
    .replace(/\b(?:os\s+)?seus\s+(sintomas|sinais\s+cl[ií]nicos|exames)\b/gi, (_all, findings: string) => `os ${findings.toLowerCase()} do seu pet`)
    .replace(/o que serviu para algu[eé]m pode n[aã]o servir para voc[eê]/gi, "a conduta que serviu para outro animal pode não servir para o seu pet")
    .replace(/\bquem vive o caso\b/gi, "o animal que apresenta o quadro");
  return /^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(input)
    ? revised.charAt(0).toLocaleUpperCase("pt-BR") + revised.slice(1)
    : revised;
};

/**
 * Qualidades que descrevem a própria Dra. Aline ou a forma como ela trabalha
 * ficam no feminino. A troca é deliberadamente estreita: não flexiona exame,
 * laudo, método, atendimento nem o profissional veterinário que lê a arte.
 */
export const alineProfessionalVoiceText = (input: string): string =>
  input
    .replace(/^Direto([.!?]?)$/i, (_all, punctuation: string) => `Direta${punctuation}`)
    .replace(/^Honesto([.!?]?)$/i, (_all, punctuation: string) => `Honesta${punctuation}`)
    .replace(/^Preparado([.!?]?)$/i, (_all, punctuation: string) => `Preparada${punctuation}`);

export const isAlineVeterinaryBrand = (brand?: string): boolean => ALINE_VET.test(brand ?? "");

export const applyVeterinaryVoice = <T>(value: T, active: boolean, key = ""): T => {
  if (!active) return value;
  if (typeof value === "string") {
    if (["id", "topic", "poster", "image", "hashtags", "value", "prefix", "suffix"].includes(key)) return value;
    return veterinaryVoiceText(value) as T;
  }
  if (Array.isArray(value)) return value.map((item) => applyVeterinaryVoice(item, true, key)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [childKey, applyVeterinaryVoice(child, true, childKey)]),
    ) as T;
  }
  return value;
};

export const applyAlineProfessionalVoice = <T>(value: T, brand?: string, key = ""): T => {
  if (!isAlineVeterinaryBrand(brand)) return value;
  if (typeof value === "string") {
    if (["id", "topic", "poster", "image", "hashtags", "value", "prefix", "suffix"].includes(key)) return value;
    return alineProfessionalVoiceText(value) as T;
  }
  if (Array.isArray(value)) return value.map((item) => applyAlineProfessionalVoice(item, brand, key)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [childKey, applyAlineProfessionalVoice(child, brand, childKey)]),
    ) as T;
  }
  return value;
};

const panelFallback = (line: string, feminine: boolean): string => {
  if (/explicad|linguagem|l[ií]ngua/i.test(line)) return feminine ? "Clara" : "Claro";
  if (/orienta|passo|vez/i.test(line)) return feminine ? "Direta" : "Direto";
  if (/avisa|n[aã]o cabe|verdade/i.test(line)) return feminine ? "Honesta" : "Honesto";
  return "Essencial";
};

const normalizedWords = (text: string): string[] =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-z0-9]+/g) ?? [];

const repeatedOpeningSize = (title: string, description: string): number => {
  const titleWords = normalizedWords(title);
  const descriptionWords = normalizedWords(description);
  const limit = Math.min(titleWords.length, descriptionWords.length);
  let size = 0;
  while (size < limit && titleWords[size] === descriptionWords[size]) size += 1;
  return size;
};

/**
 * Detecta quando o corpo repete uma expressão que aparece mais adiante no
 * título (comum em "Tema: respostas conectadas" + "Na prática, respostas...").
 */
const containedOpeningSize = (title: string, description: string): number => {
  const titleWords = normalizedWords(title);
  const descriptionWords = normalizedWords(description);
  let best = 0;
  for (let start = 0; start < titleWords.length; start += 1) {
    let size = 0;
    while (
      start + size < titleWords.length &&
      size < descriptionWords.length &&
      titleWords[start + size] === descriptionWords[size]
    ) size += 1;
    if (size > best) best = size;
  }
  return best;
};

const trimDanglingTitle = (text: string): string => {
  let revised = text.trim();
  for (let guard = 0; guard < 5 && hasDanglingEnding(revised); guard += 1) {
    const shorter = revised.replace(/\s+\S+[.!?…“”\"]*$/, "").trim();
    if (shorter.split(/\s+/).length < 3) break;
    revised = shorter;
  }
  return revised;
};

const stableTextIndex = (text: string, size: number): number => {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return size > 0 ? hash % size : 0;
};

const bridgeDescription = (title: string, remainder: string): string => {
  const lower = remainder.charAt(0).toLocaleLowerCase("pt-BR") + remainder.slice(1);
  const lastTitleWord = title.trim().match(/[\p{L}\p{N}]+[.!?]?$/u)?.[0]?.replace(/[.!?]$/, "") ?? "";
  const capitalizedLastWord = lastTitleWord
    ? `${lastTitleWord.charAt(0).toLocaleUpperCase("pt-BR")}${lastTitleWord.slice(1)}`
    : "";
  const adjectiveOpening = /^(?:clar[oa]s?|did[aá]tic[oa]s?|objetiv[oa]s?|precis[oa]s?|segur[oa]s?|complet[oa]s?|personalizad[oa]s?|detalhad[oa]s?|assertiv[oa]s?)\b/i.test(lower);

  // Quando o corte acontece no meio de uma locução ("qualidade de vida"),
  // recompõe o núcleo em vez de imprimir uma ponte seguida de "de...".
  if (/^(?:de|do|da|dos|das)\b/i.test(lower) && capitalizedLastWord) {
    return `${capitalizedLastWord} ${lower}`;
  }
  if (adjectiveOpening && capitalizedLastWord) return `${capitalizedLastWord} ${lower}`;
  if (/^(?:e|ou|mas|que|com|por|para|em)\b/i.test(lower)) return `Esses elementos se conectam ${lower}.`;

  const bridges = [
    (text: string) => `Com essa leitura, ${text}`,
    (text: string) => `Na prática, ${text}`,
    (text: string) => `Assim, ${text}`,
    (text: string) => `Esse caminho permite ${text}`,
    (text: string) => `O resultado é ${text}`,
    (text: string) => `Dessa forma, ${text}`,
  ];
  return bridges[stableTextIndex(`${title}|${remainder}`, bridges.length)](lower);
};

/**
 * O corpo não pode recomeçar repetindo o título. Preserva a parte nova e,
 * quando a frase repetida termina em uma enumeração, cria uma ponte causal.
 */
export const removeTitleDescriptionEcho = (title: string, description: string): string => {
  const prefix = description.match(/^\s*(?:na prática|com isso|por isso|assim|dessa forma|desse modo|em resumo|o resultado é)\s*[,;:]?\s*/i)?.[0] ?? "";
  const comparable = description.slice(prefix.length);
  const openingSize = Math.max(
    repeatedOpeningSize(title, comparable),
    containedOpeningSize(title, comparable),
  );
  if (openingSize < 4) return description;

  const rawWords = comparable.trim().split(/\s+/);
  const remainder = rawWords.slice(openingSize).join(" ").replace(/^[,;:.!?–—\s]+/, "").trim();
  // Nothing new beyond the title: drop the support instead of a generic filler.
  if (!remainder) return "";

  const revised = bridgeDescription(title, remainder);
  return revised.replace(/\.\s*\.$/, ".");
};

const removeContentEchoes = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map((item) => removeContentEchoes(item)) as T;
  if (!value || typeof value !== "object") return value;

  const source = value as Record<string, unknown>;
  const revised = Object.fromEntries(
    Object.entries(source).map(([key, child]) => [key, removeContentEchoes(child)]),
  ) as Record<string, unknown>;
  const title = typeof revised.headline === "string"
    ? revised.headline
    : typeof revised.title === "string"
      ? revised.title
      : typeof revised.heading === "string"
        ? revised.heading
      : undefined;
  if (title) {
    ["description", "body", "coverSub", "support", "sub"].forEach((key) => {
      if (typeof revised[key] === "string") revised[key] = removeTitleDescriptionEcho(title, revised[key] as string);
    });
  }

  if (typeof revised.strong === "string" && typeof revised.rest === "string") {
    const joined = joinCopyParts(revised.strong, revised.rest);
    if (hasDanglingEnding(joined)) {
      const repaired = trimDanglingTitle(joined);
      if (repaired && !hasDanglingEnding(repaired)) {
        revised.strong = repaired;
        revised.rest = "";
      }
    }
  }

  if (title) {
    ["description", "body", "coverSub", "support", "sub"].forEach((key) => {
      const support = typeof revised[key] === "string" ? revised[key] as string : "";
      if (!support) return;
      const withoutPrefix = support.replace(/^\s*(?:na prática|com isso|por isso|assim|dessa forma|desse modo)\s*[,;:]?\s*/i, "");
      if (textSimilarity(title, withoutPrefix) >= ARC_TOO_SIMILAR) {
        revised[key] = removeTitleDescriptionEcho(title, support);
      }
    });
  }
  return revised as T;
};

const SKIP_TEXT_KEYS = new Set(["id", "label", "topic", "poster", "image", "hashtags", "value", "prefix", "suffix", "source", "note"]);

const firstUsefulThought = (values: Array<{ key: string; value: unknown }>) => {
  for (const { key, value } of values) {
    if (typeof value !== "string") continue;
    const thought = closeThought(proofread(value), 76);
    if (thought && !isOrphanCommand(thought)) return { key, text: thought };
  }
  return undefined;
};

const proofreadVisibleText = <T>(value: T, key = ""): T => {
  if (typeof value === "string") {
    if (SKIP_TEXT_KEYS.has(key)) return value;
    return proofread(value) as T;
  }
  if (Array.isArray(value)) return value.map((item) => proofreadVisibleText(item, key)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [childKey, proofreadVisibleText(child, childKey)]),
    ) as T;
  }
  return value;
};

const repairOrphanStrongRest = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map((item) => repairOrphanStrongRest(item)) as T;
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const revised = Object.fromEntries(
    Object.entries(source).map(([key, child]) => [key, repairOrphanStrongRest(child)]),
  ) as Record<string, unknown>;

  if (typeof revised.strong === "string") {
    const strong = revised.strong;
    const rest = typeof revised.rest === "string" ? revised.rest : "";
    const joined = joinCopyParts(strong, rest);
    if (isOrphanCommand(strong) || isOrphanCommand(joined)) {
      const replacement = firstUsefulThought([
        { key: "sub", value: revised.sub },
        { key: "description", value: revised.description },
        { key: "coverSub", value: revised.coverSub },
        { key: "title", value: revised.title },
      ]);
      if (replacement) {
        revised.strong = replacement.text;
        revised.rest = "";
        if (replacement.key in revised) revised[replacement.key] = "";
      }
    }
  }

  return revised as T;
};

/**
 * Carrosséis usam `title/coverSub` e `heading/body`, não `strong/rest`.
 * Esta barreira final impede que um comando órfão sobreviva em qualquer slide,
 * inclusive em roteiros antigos que não passaram pelo diretor de rotas.
 */
const repairOrphanCarouselText = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map((item) => repairOrphanCarouselText(item)) as T;
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  const revised = Object.fromEntries(
    Object.entries(source).map(([key, child]) => [key, repairOrphanCarouselText(child)]),
  ) as Record<string, unknown>;

  const pairs: Array<["title" | "heading", "coverSub" | "body"]> = [
    ["title", "coverSub"],
    ["heading", "body"],
  ];
  pairs.forEach(([leadKey, supportKey]) => {
    const lead = typeof revised[leadKey] === "string" ? revised[leadKey] as string : "";
    if (!lead || !isOrphanCommand(lead)) return;
    const support = typeof revised[supportKey] === "string" ? revised[supportKey] as string : "";
    const replacement = closeThought(proofread(support), leadKey === "title" ? 56 : 64);
    if (replacement && !isOrphanCommand(replacement)) {
      revised[leadKey] = replacement;
      revised[supportKey] = "";
    }
  });

  return revised as T;
};

const veterinaryDisplayWord = (word: string, context: string): string => {
  if (!/^anim(?:al|ais)$/i.test(word.trim())) return word;
  if (/\b(?:gato|gata|felin)/i.test(context)) return "Gatos";
  if (/\b(?:c[aã]o|cadela|canin)/i.test(context)) return "Cães";
  return "Pet";
};

const refineVeterinaryContent = <T>(value: T, veterinary: boolean, aline: boolean): T => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const content = value as Record<string, unknown>;
  let revised = { ...content };

  if (veterinary && Array.isArray(content.kinetic)) {
    revised.kinetic = content.kinetic.map((item) => {
      if (!item || typeof item !== "object") return item;
      const kinetic = item as Record<string, unknown>;
      const word = typeof kinetic.word === "string" ? kinetic.word : "";
      const context = [kinetic.kicker, kinetic.caption].filter((part) => typeof part === "string").join(" ");
      return { ...kinetic, word: veterinaryDisplayWord(word, context) };
    });
  }

  if (aline) {
    const current = Array.isArray(revised.compare) ? revised.compare : [];
    const curatedTitles = new Set(ALINE_SIGNPOSTS.map((pair) => pair.title));
    const remaining = current.filter((pair) => {
      if (!pair || typeof pair !== "object") return true;
      return !curatedTitles.has(String((pair as Record<string, unknown>).title ?? ""));
    });
    revised = { ...revised, compare: [...ALINE_SIGNPOSTS, ...remaining] };
  }
  return revised as T;
};

/** Rótulos do editor orientam o motor, mas nunca podem aparecer na peça. */
const removeInternalEditorialLabels = <T>(value: T, brand?: string, key = ""): T => {
  if (typeof value === "string") {
    if (["id", "topic", "poster", "image", "hashtags", "value", "prefix", "suffix"].includes(key)) return value;
    if (/^(?:para\s+)?slogan\s+em\s+destaque(?:\s*[·|—-]\s*.+)?$/i.test(value.trim())) {
      return (brand?.trim() || "A marca") as T;
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => removeInternalEditorialLabels(item, brand, key)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [
        childKey,
        removeInternalEditorialLabels(child, brand, childKey),
      ]),
    ) as T;
  }
  return value;
};

/** Revisão final, aplicada também depois das variações e da direção do lote. */
export const finalizeBrandVoice = <T>(value: T, context: { brand?: string; domain?: string } = {}): T => {
  const veterinary = isVeterinaryContext(context.brand, context.domain);
  const feminine = isAlineVeterinaryBrand(context.brand);
  const voiced = finalizeListCoherence(clarifyStudioCopy(refineVeterinaryContent(removeContentEchoes(repairOrphanCarouselText(repairOrphanStrongRest(proofreadVisibleText(removeInternalEditorialLabels(
    applyAlineProfessionalVoice(applyVeterinaryVoice(value, veterinary), context.brand),
    context.brand,
  ))))), veterinary, feminine)));
  if (!voiced || typeof voiced !== "object" || Array.isArray(voiced)) return voiced;

  const content = voiced as Record<string, unknown>;
  if (!Array.isArray(content.triptychs)) return voiced;
  const triptychs = content.triptychs.map((item) => {
    if (!item || typeof item !== "object") return item;
    const triptych = item as { panels?: Array<{ word: string; line: string }> };
    if (!Array.isArray(triptych.panels)) return item;
    const seen = new Set<string>();
    const panels = triptych.panels.map((panel) => {
      let word = panel.word;
      let key = word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) {
        word = panelFallback(panel.line, feminine);
        key = word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      }
      if (seen.has(key)) word = "Essencial";
      seen.add(word.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""));
      return { ...panel, word };
    });
    return { ...item, panels };
  });
  return { ...content, triptychs } as T;
};