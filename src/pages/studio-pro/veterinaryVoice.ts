/**
 * VOZ VETERINÁRIA — separa quem lê de quem recebe o cuidado.
 *
 * O tutor observa, decide e agenda. Sintomas, achados, exames e condutas
 * pertencem ao animal. A regra é detectada pelo domínio da marca, portanto
 * protege qualquer marca veterinária sem contaminar os demais nichos.
 */

const VETERINARY_DOMAIN = /\b(?:veterin[aá]ri[ao]s?|vet\b|animal(?:is)?|pets?|canin[oa]s?|felin[oa]s?|c[aã]es?|gatos?|citologia\s+veterin[aá]ria)\b/i;

const ANIMAL_CLINICAL = /\b(?:coceira|prurido|otite|dermatite|piodermite|infec(?:ç|c)[aã]o|falha(?:s)?\s+de\s+pelo|queda\s+de\s+pelo|n[oó]dulo|carocinho|les(?:ã|a)o|ferida|sintoma|sinal\s+cl[ií]nico|dor|inc[oô]modo|alergia|secre(?:ç|c)[aã]o|lambedura|vermelhid[aã]o|citologia|paaf|raspado|swab|l[aâ]mina|exame|diagn[oó]stico|tratamento|conduta)\w*/i;

export const isVeterinaryContext = (...values: unknown[]): boolean =>
  VETERINARY_DOMAIN.test(values.filter((value) => typeof value === "string").join(" · "));

export const veterinaryVoiceText = (input: string): string => {
  if (!ANIMAL_CLINICAL.test(input)) return input;

  const revised = input
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