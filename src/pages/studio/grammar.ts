/**
 * GRAMÁTICA DO MOTOR CRIATIVO (guarda de português)
 *
 * Problema que este módulo resolve na raiz: os ingredientes do kit são escritos
 * pelo usuário em formas gramaticais diferentes. Uns são NOMINAIS ("a dor que
 * volta", "o improviso"), outros são ORAÇÕES com verbo conjugado ("precisam
 * postar todo dia", "não conseguem manter a frequência"). O motor encaixava
 * qualquer um deles em qualquer moldura, e nascia frase quebrada:
 *
 *   "Conviver com precisam postar todo dia não é economia"
 *   "Sabe por que não conseguem manter a frequência volta sempre?"
 *
 * Regras:
 * - Moldura que insere o ingrediente depois de preposição/artigo exige forma
 *   NOMINAL. `nominal()` converte a oração quando existe conversão segura;
 *   quando não existe, devolve o fallback da moldura (nunca a oração crua).
 * - Slots que exibem o ingrediente como frase inteira (lista, citação, legenda)
 *   usam `sentence()`.
 * - `readsWell()` é o portão final: qualquer frase com preposição seguida de
 *   verbo conjugado, ponta solta ou palavra repetida é rejeitada.
 *
 * 100% local e determinístico. Nenhuma ideia nova é inventada aqui — só a forma.
 */

import { fixAgreement } from "./agreement";

const clean = (text: string) => (text ?? "").trim().replace(/\s+/g, " ");
const noDot = (text: string) => clean(text).replace(/\s*[.!?…]+$/, "");
/** Minúscula inicial sem corromper siglas como IA, VPPB, LCA ou PDF. */
export const lowerInitial = (text: string) => {
  if (!text) return text;
  const firstWord = text.trim().split(/\s+/)[0]?.replace(/[^A-Za-zÀ-ÿ0-9.]/g, "") ?? "";
  if (/^[A-ZÀ-Ý][A-ZÀ-Ý0-9.]{1,}$/.test(firstWord)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
};
const lower1 = lowerInitial;
const upper1 = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

/**
 * Verbos conjugados frequentes nos kits (1ª/3ª pessoa). Não é um analisador
 * morfológico: é a lista do que de fato aparece em dores/desejos escritos por
 * profissionais, suficiente para separar oração de grupo nominal.
 */
const FINITE_VERBS = [
  "preciso","precisa","precisam","precisamos",
  "consigo","consegue","conseguem","conseguimos",
  "quero","quer","querem","queremos",
  "tenho","tem","têm","temos",
  "estou","está","estão","estamos",
  "sinto","sente","sentem","sentimos",
  "fico","fica","ficam","ficamos",
  "vivo","vive","vivem","vivemos",
  "perco","perde","perdem","perdemos",
  "gasto","gasta","gastam","gastamos",
  "deixo","deixa","deixam",
  "acho","acha","acham",
  "sei","sabe","sabem",
  "posto","posta","postam",
  "tento","tenta","tentam",
  "pago","paga","pagam",
  "uso","usa","usam",
  "falta","faltam",
  "volta","voltam",
  "dói","doem",
  "cansa","cansam",
  "trava","travam",
  "some","somem",
  "aparece","aparecem",
  "custa","custam",
  "atrasa","atrasam",
  "piora","pioram",
  "impede","impedem",
  "atrapalha","atrapalham",
  "abandona","abandonam",
  "desiste","desistem",
  "adia","adiam",
  "funciona","funcionam",
  "resolve","resolvem",
  "ajuda","ajudam",
  "compra","compram",
  "chega","chegam",
  "melhora","melhoram",
  "continua","continuam",
  "demora","demoram",
  "ignora","ignoram",
  "esquece","esquecem",
  "procrastina","procrastinam",
] as const;

const FINITE_SET = new Set<string>(FINITE_VERBS);

/**
 * Formas que também são substantivo ("a falta de tempo", "a volta da dor",
 * "o gasto com anúncio"). Depois de artigo elas são nome, não verbo.
 */
const NOUN_OR_VERB = new Set([
  "falta","volta","trava","some","piora","posto","posta","gasto","uso","acho","custa","cansa","dói","conta","adia",
]);

const PREPOSITIONS = [
  "com","de","da","do","das","dos","em","na","no","nas","nos","para","por","pelo","pela",
  "sobre","sem","até","entre","após","desde","ante","contra","perante",
];

const DANGLING = [...PREPOSITIONS, "e", "ou", "mas", "que", "se", "quando", "porque", "então", "ainda", "nem"];

/**
 * Locuções que abrem uma relação, mas não conseguem encerrá-la sozinhas.
 * O corte por palavras antes só reconhecia a última palavra e deixava passar
 * títulos como "Outra noite sem dormir por causa".
 */
const DANGLING_PHRASE_END =
  /(?:\b(?:por causa|por conta|em razão|a respeito|graças a|devido a|a partir|junto a|apesar de|antes de|depois de|é hora de|e hora de|para quem|com quem|sem que|assim como|é isso que dá|e isso que da|serve para|permite|dá base para|da base para)|\b(?:e|ou|mas|que|de|da|do|das|dos|em|no|na|nos|nas|com|sem|por|para|se|como|quando|onde|um|uma|me))\s*[.!?…“”\"]*$/i;

/** True quando a frase termina prometendo um complemento que não veio. */
export const hasDanglingEnding = (text: string): boolean =>
  DANGLING_PHRASE_END.test(clean(text));

/**
 * Lista nominal crua, sem ação ou explicação ("ácaros, leveduras, cocos e
 * bastonetes"). Ela é um insumo válido, mas não uma conclusão narrativa.
 */
export const isBareEnumeration = (text: string): boolean => {
  const value = noDot(text);
  if (!value || isClause(value)) return false;
  const commaParts = value.split(/\s*,\s*/).filter(Boolean);
  if (commaParts.length >= 3) return true;
  return commaParts.length >= 2 && /\s+e\s+[^,]+$/i.test(value);
};

const wordsOf = (text: string) =>
  noDot(text)
    .toLowerCase()
    .split(/[^a-zà-ÿ0-9+]+/i)
    .filter(Boolean);

/** True quando o trecho tem verbo conjugado (é oração, não grupo nominal). */
export const isClause = (text: string): boolean => {
  const list = wordsOf(text);
  if (!list.length) return false;
  if (list[0] === "não" || list[0] === "nao") return true;
  return list.some((word) => FINITE_SET.has(word));
};

/** True quando o trecho pode ser encaixado depois de preposição/artigo. */
export const isNominal = (text: string): boolean => Boolean(clean(text)) && !isClause(text);

/**
 * Conversões seguras de oração → grupo nominal. Só transformações previsíveis:
 * nada é inventado e, sem regra aplicável, devolve `null`.
 */
const NOMINALIZERS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^n[ãa]o\s+(?:consigo|consegue|conseguem|conseguimos)\s+(.+)$/i, (m) => `a dificuldade de ${lower1(m[1])}`],
  [/^n[ãa]o\s+(?:sei|sabe|sabem)\s+(.+)$/i, (m) => `a dúvida sobre ${lower1(m[1])}`],
  [/^n[ãa]o\s+(?:tenho|tem|têm|temos)\s+(.+)$/i, (m) => `a falta de ${lower1(m[1])}`],
  [/^n[ãa]o\s+(.+)$/i, (m) => `a dificuldade de ${lower1(m[1])}`],
  [/^(?:preciso|precisa|precisam|precisamos)\s+(?:de\s+)?(.+)$/i, (m) => `a pressão de ${lower1(m[1])}`],
  [/^(?:tenho|tem|têm|temos)\s+medo\s+de\s+(.+)$/i, (m) => `o medo de ${lower1(m[1])}`],
  [/^(?:falta|faltam)\s+(.+)$/i, (m) => `a falta de ${lower1(m[1])}`],
  [/^(?:perco|perde|perdem|perdemos)\s+(.+)$/i, (m) => `a perda de ${lower1(m[1])}`],
  [/^(?:gasto|gasta|gastam|gastamos)\s+(.+)$/i, (m) => `o gasto com ${lower1(m[1])}`],
  [/^(?:sinto|sente|sentem|sentimos)\s+(.+)$/i, (m) => `a sensação de ${lower1(m[1])}`],
  [/^(?:quero|quer|querem|queremos)\s+(.+)$/i, (m) => `a vontade de ${lower1(m[1])}`],
  [/^(?:fico|fica|ficam|ficamos)\s+(.+)$/i, (m) => `a rotina de ficar ${lower1(m[1])}`],
  [/^(?:vivo|vive|vivem|vivemos)\s+(.+)$/i, (m) => `a rotina de viver ${lower1(m[1])}`],
  [/^(?:estou|está|estão|estamos)\s+(.+)$/i, (m) => `a condição de estar ${lower1(m[1])}`],
  [/^(?:tento|tenta|tentam)\s+(.+)$/i, (m) => `a tentativa de ${lower1(m[1])}`],
  [/^(?:desiste|desistem|desisto)\s+(?:de\s+)?(.+)$/i, (m) => `a desistência de ${lower1(m[1])}`],
  [/^(?:adia|adiam|adio)\s+(.+)$/i, (m) => `o adiamento de ${lower1(m[1])}`],
  // Sujeito + verbo ("a dor volta sempre") ⇒ oração relativa ("a dor que volta sempre").
  [
    /^((?:o|a|os|as|um|uma|meu|minha|meus|minhas|seu|sua)\s+[^,]{2,40}?)\s+(volta|voltam|piora|pioram|aparece|aparecem|atrapalha|atrapalham|impede|impedem|trava|travam|custa|custam|atrasa|atrasam|some|somem|dói|doem|cansa|cansam)\b(.*)$/i,
    (m) => `${lower1(m[1])} que ${m[2].toLowerCase()}${m[3] ?? ""}`,
  ],
];

/** Converte oração em grupo nominal; `null` quando não há conversão segura. */
export const toNominal = (text: string): string | null => {
  const core = noDot(text);
  if (!core) return null;
  if (isNominal(core)) return lower1(core);
  for (const [re, out] of NOMINALIZERS) {
    const match = core.match(re);
    if (match) {
      const result = clean(out(match));
      // O núcleo nominalizado ("a falta de…") herda a palavra do verbo, então a
      // validação aqui é de LEITURA, não de classe gramatical.
      if (result && /^(?:o|a|os|as|um|uma|meu|minha|meus|minhas|seu|sua|seus|suas|este|esta|estes|estas|esse|essa|esses|essas)\s/i.test(result) && readsWell(result)) return result;
    }
  }
  return null;
};

/**
 * Forma segura para encaixe depois de preposição/artigo. Sem conversão possível,
 * devolve o `fallback` da moldura — nunca a oração crua.
 */
export const nominal = (text: string | undefined, fallback: string): string => toNominal(text ?? "") ?? fallback;

/** Lista nominalizada, preservando a ordem e descartando o que não converte. */
export const nominalList = (values: (string | undefined)[]): string[] => {
  const out: string[] = [];
  values.forEach((value) => {
    const form = toNominal(value ?? "");
    if (form && !out.includes(form)) out.push(form);
  });
  return out;
};

/** Frase autônoma: inicial maiúscula e ponto final, sem pontuação duplicada. */
export const sentence = (text: string): string => {
  const core = fixAgreement(noDot(text));
  if (!core) return "";
  return `${upper1(core)}.`;
};

/**
 * Portão final de leitura. Rejeita o que nenhum leitor aceitaria:
 * preposição seguida de verbo conjugado, ponta solta, palavra repetida em
 * sequência ou pontuação órfã.
 */
export const readsWell = (text: string): boolean => {
  // Textos montados por partes chegam com espaço antes da pontuação
  // ("Geração 60+ : medo…"); isso é diagramação, não erro de português.
  text = text.replace(/\s+([,.;:!?])/g, "$1").replace(/\s+/g, " ").trim();

  const core = clean(text);
  if (!core) return false;

  const list = wordsOf(core);
  if (!list.length) return false;

  // preposição + verbo conjugado ("com precisam postar")
  for (let i = 0; i < list.length - 1; i += 1) {
    if (PREPOSITIONS.includes(list[i]) && FINITE_SET.has(list[i + 1])) return false;
  }

  // artigo + verbo conjugado ("o precisam")
  const ARTICLES = ["o", "a", "os", "as", "um", "uma"];
  for (let i = 0; i < list.length - 1; i += 1) {
    if (ARTICLES.includes(list[i]) && FINITE_SET.has(list[i + 1]) && !NOUN_OR_VERB.has(list[i + 1])) return false;
  }

  // dois verbos conjugados colados ("manter a frequência volta sempre" é ok,
  // mas "conseguem volta" não)
  for (let i = 0; i < list.length - 1; i += 1) {
    if (FINITE_SET.has(list[i]) && FINITE_SET.has(list[i + 1])) return false;
  }

  // palavra repetida em sequência
  for (let i = 0; i < list.length - 1; i += 1) {
    if (list[i] === list[i + 1] && list[i].length > 2) return false;
  }

  // orações empilhadas sem conector ("...não conseguem manter a frequência volta sempre?")
  const finiteCount = list.filter((word) => FINITE_SET.has(word)).length;
  if (finiteCount >= 3) return false;

  // trecho cortado no meio ("… Hoje. Ter"): segmento de uma palavra que é verbo,
  // infinitivo ou conectivo não é frase — é sobra de corte.
  const segments = core.split(/[.!?]+/).map((seg) => seg.trim()).filter(Boolean);
  if (
    segments.some((seg) => {
      const parts = wordsOf(seg);
      if (parts.length !== 1) return false;
      const only = parts[0];
      return only.endsWith("r") || FINITE_SET.has(only) || DANGLING.includes(only);
    })
  ) {
    return false;
  }

  // ponta solta
  if (DANGLING.includes(list[list.length - 1])) return false;

  // pontuação órfã ou espaço antes de pontuação
  if (/\s[.,;:!?]/.test(core)) return false;
  if (/[.,;:]{2,}/.test(core)) return false;

  return true;
};
