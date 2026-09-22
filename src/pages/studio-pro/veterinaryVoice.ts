/**
 * VOZ VETERINÁRIA — separa quem lê de quem recebe o cuidado.
 *
 * O tutor observa, decide e agenda. Sintomas, achados, exames e condutas
 * pertencem ao animal. A regra é detectada pelo domínio da marca, portanto
 * protege qualquer marca veterinária sem contaminar os demais nichos.
 */

const VETERINARY_DOMAIN = /\b(?:veterin[aá]ri[ao]s?|vet\b|animal(?:is)?|pets?|canin[oa]s?|felin[oa]s?|c[aã]es?|gatos?|citologia\s+veterin[aá]ria)\b/i;

const ANIMAL_CLINICAL = /\b(?:coceira|prurido|otite|dermatite|piodermite|infec(?:ç|c)[aã]o|falha(?:s)?\s+de\s+pelo|queda\s+de\s+pelo|n[oó]dulo|carocinho|les(?:ã|a)o|ferida|sintoma|sinal\s+cl[ií]nico|dor|inc[oô]modo|alergia|secre(?:ç|c)[aã]o|lambedura|vermelhid[aã]o|citologia|paaf|raspado|swab|l[aâ]mina|exame|diagn[oó]stico|tratamento|conduta)\w*/i;

const ALINE_VET = /\b(?:dra\.?\s+)?aline\s+furtado(?:\s+vet(?:erin[aá]ria)?)?\b/i;

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

  if (!ANIMAL_CLINICAL.test(revised)) return revised;

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

/** Revisão final, aplicada também depois das variações e da direção do lote. */
export const finalizeBrandVoice = <T>(value: T, context: { brand?: string; domain?: string } = {}): T => {
  const veterinary = isVeterinaryContext(context.brand, context.domain);
  const feminine = isAlineVeterinaryBrand(context.brand);
  const voiced = applyAlineProfessionalVoice(applyVeterinaryVoice(value, veterinary), context.brand);
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