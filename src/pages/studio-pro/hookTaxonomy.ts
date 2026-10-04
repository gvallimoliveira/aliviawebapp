/**
 * BIBLIOTECA DE GANCHOS (local, determinística)
 *
 * Cada tipo de gancho declara QUAL insumo do manual ele exige. Sem o campo
 * preenchido, o tipo simplesmente não é elegível — nada é inventado. O molde
 * devolve `strong` (a frase que abre) e `rest` (o complemento), sempre feitos
 * de texto real do kit.
 */
import { isBareEnumeration, lowerInitial } from "@/pages/studio/grammar";
import { sentenceLead } from "@/pages/studio/typographyGuards";

export type HookInput =
  | "dor"
  | "objecao"
  | "inimigo"
  | "prova"
  | "cena"
  | "desejo"
  | "gatilho"
  | "mecanismo"
  | "consequencia"
  | "termo"
  | "percepcao";

export type HookTypeId =
  | "contraste-falso-senso-comum"
  | "custo-do-atraso"
  | "erro-comum"
  | "pergunta-diagnostica"
  | "mito-vs-mecanismo"
  | "bastidor-prova"
  | "sinal-precoce-ignorado"
  | "comparacao-dois-casos"
  | "pergunta-ao-especialista"
  | "cena-interrompida"
  | "regra-com-excecao"
  | "antes-depois-sem-imagem"
  | "traducao-tecnica"
  | "objecao-respondida";

export type HookFields = Partial<Record<HookInput, string>>;

export type HookShape = { strong: string; rest: string };

export type HookType = {
  id: HookTypeId;
  label: string;
  /** Campos do manual sem os quais o gancho não existe. */
  requires: HookInput[];
  build: (f: HookFields) => HookShape | undefined;
};

const squash = (value?: string) => (value ?? "").replace(/\s+/g, " ").trim().replace(/\s*[.!?…]+$/, "");
const cap = (value?: string) => sentenceLead(squash(value));
const low = (value?: string) => lowerInitial(squash(value));
const actionableMechanism = (value?: string) => {
  const mechanism = squash(value);
  return isBareEnumeration(mechanism)
    ? `investigar a presença de ${low(mechanism)}`
    : low(mechanism);
};

const subordinateObjection = (value?: string) => {
  const objection = squash(value)
    .replace(/^(?:é|seria)\s+/i, "")
    .replace(/^(?:acho que|tenho receio de que)\s+/i, "");
  return objection ? `Isso responde a uma preocupação comum: ${low(objection)}` : "Veja como isso funciona na prática";
};

/** Promessas e infantilização nunca saem de um gancho automático. */
const FORBIDDEN =
  /\b(cura(r|do|da)?|garantid[oa]|garantia|milagr\w*|100%|sem risco|resultado garantido|fofinh\w*|peludinh\w*|bebez\w*|amiguinh\w*)\b/i;

export const hookViolatesGuardrails = (text: string): boolean => FORBIDDEN.test(text ?? "");

export const HOOK_TYPES: HookType[] = [
  {
    id: "contraste-falso-senso-comum",
    label: "Contraste com o senso comum",
    requires: ["inimigo", "mecanismo"],
    build: (f) => ({ strong: cap(f.mecanismo), rest: `não ${low(f.inimigo)}` }),
  },
  {
    id: "custo-do-atraso",
    label: "Custo do atraso",
    requires: ["consequencia"],
    build: (f) => ({ strong: "Enquanto nada muda", rest: low(f.consequencia) }),
  },
  {
    id: "erro-comum",
    label: "Erro mais comum",
    requires: ["inimigo", "desejo"],
    build: (f) => ({ strong: cap(f.desejo), rest: `em vez de ${low(f.inimigo)}` }),
  },
  {
    id: "pergunta-diagnostica",
    label: "Pergunta diagnóstica",
    requires: ["cena", "mecanismo"],
    build: (f) => ({ strong: `${cap(f.cena)}?`, rest: `A resposta começa em ${low(f.mecanismo)}` }),
  },
  {
    id: "mito-vs-mecanismo",
    label: "Mito × mecanismo",
    requires: ["objecao", "mecanismo"],
    build: (f) => ({ strong: cap(f.mecanismo), rest: `ao contrário de ${low(f.objecao)}` }),
  },
  {
    id: "bastidor-prova",
    label: "Bastidor da conduta",
    requires: ["prova", "desejo"],
    build: (f) => ({ strong: `Por dentro: ${low(f.prova)}`, rest: `É o que sustenta ${low(f.desejo)}` }),
  },
  {
    id: "sinal-precoce-ignorado",
    label: "Sinal precoce ignorado",
    requires: ["gatilho", "mecanismo"],
    build: (f) => ({ strong: cap(f.gatilho), rest: `É hora de ${actionableMechanism(f.mecanismo)}` }),
  },
  {
    id: "comparacao-dois-casos",
    label: "Dois caminhos",
    requires: ["inimigo", "prova"],
    // A abertura destaca o critério que gera valor. A alternativa genérica fica
    // apenas como contraste secundário — nunca como protagonista da promessa.
    build: (f) => ({ strong: cap(f.prova), rest: `em vez de ${low(f.inimigo)}` }),
  },
  {
    id: "pergunta-ao-especialista",
    label: "Pergunta que mais recebo",
    requires: ["objecao", "prova"],
    // A prova abre a mensagem; a objeção aparece como preocupação subordinada,
    // nunca colada à prova por uma construção abstrata ou gramaticalmente frágil.
    build: (f) => ({ strong: cap(f.prova), rest: subordinateObjection(f.objecao) }),
  },
  {
    id: "cena-interrompida",
    label: "Cena interrompida",
    requires: ["cena", "desejo"],
    build: (f) => ({ strong: cap(f.cena), rest: `O que se busca é ${low(f.desejo)}` }),
  },
  {
    id: "regra-com-excecao",
    label: "Regra com exceção",
    requires: ["mecanismo", "consequencia"],
    build: (f) => ({ strong: `${cap(f.mecanismo)} quase sempre ajuda`, rest: `Sem isso, ${low(f.consequencia)}` }),
  },
  {
    id: "antes-depois-sem-imagem",
    label: "Antes e depois sem imagem",
    requires: ["dor", "desejo"],
    build: (f) => ({ strong: `De ${low(f.dor)}`, rest: `a ${low(f.desejo)}` }),
  },
  {
    id: "traducao-tecnica",
    label: "Tradução técnica",
    requires: ["termo", "percepcao"],
    // O cliente parte do que sente/percebe; o termo clínico só entra como ponte
    // para compreender o sinal, nunca como curiosidade técnica sem utilidade.
    build: (f) => ({ strong: cap(f.percepcao), rest: `pode ter relação com ${low(f.termo)}` }),
  },
  {
    id: "objecao-respondida",
    label: "Objeção respondida",
    requires: ["objecao", "mecanismo"],
    // A objeção é o contraste que a marca supera, nunca a promessa do cartaz.
    // O mecanismo verdadeiro ocupa o destaque; a alternativa rejeitada fica
    // explicitamente subordinada para não virar a palavra protagonista.
    build: (f) => ({ strong: cap(f.mecanismo), rest: `em vez de ${low(f.objecao)}` }),
  },
];

const has = (f: HookFields, key: HookInput) => squash(f[key]).length > 2;

/** Ganchos que este manual sustenta, na ordem estável da biblioteca. */
export const eligibleHooks = (fields: HookFields): HookType[] =>
  HOOK_TYPES.filter((type) => type.requires.every((key) => has(fields, key)));

/** Gancho montado e conferido: frase com duas partes, sem promessa proibida. */
export const buildHook = (type: HookType, fields: HookFields): HookShape | undefined => {
  if (!type.requires.every((key) => has(fields, key))) return undefined;
  const shape = type.build(fields);
  if (!shape) return undefined;
  const strong = squash(shape.strong);
  const rest = squash(shape.rest);
  if (strong.length < 8 || rest.length < 6) return undefined;
  if (hookViolatesGuardrails(`${strong} ${rest}`)) return undefined;
  return { strong, rest };
};
