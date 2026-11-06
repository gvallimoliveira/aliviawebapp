/**
 * DNA DA MARCA (fonte única do motor textual)
 *
 * Normaliza o que o cliente declarou — manual de marca interpretado + as
 * respostas do questionário (`studio_brands.brief_answers`) + posicionamento e
 * nicho — em um objeto pequeno e literal.
 *
 * REGRA: nada aqui é inventado. Se o campo está vazio, ele fica vazio, e o
 * motor sabe que não pode falar daquele eixo. Isso é o que impede o motor de
 * cair no acervo genérico (o "bypass" do manual).
 */

import { readBriefAnswers, type BriefAnswers } from "./brandQuestionnaire";

export type BrandDna = {
  /** Como a marca se apresenta em uma frase (quem sou). */
  presentation?: string;
  /** O que entrega na prática (como trabalho). */
  offer?: string;
  /** Diferencial real (no que acredito / por que eu). */
  belief?: string;
  /** Assinatura desejada nas artes. */
  signature?: string;
  /** Público primário declarado no briefing. */
  primaryAudience?: string;
  /** Perfil do cliente ideal. */
  profile?: string;
  /** Maior dor declarada no briefing. */
  pain?: string;
  /** Maior desejo declarado no briefing. */
  desire?: string;
  /** Objeção separada do desejo; nunca deve virar benefício ou fecho. */
  objection?: string;
  /** Cena concreta do cotidiano do público (abertura viva da arte). */
  scene?: string;
  /** O que a marca combate no mercado (inimigo declarado). */
  enemy?: string;
  /** Consequência de não agir — urgência sem promessa. */
  stakes?: string;
  /** CTA preferido da marca. */
  cta?: string;
  /** Tom declarado (diretriz, nunca renderizado). */
  tone?: string;
  /** Nível técnico declarado (diretriz). */
  technicalLevel?: string;
  /** Posicionamento livre (manual/IA). */
  positioning?: string;
  /** Descrição livre da marca. */
  description?: string;
  /** Nicho. */
  niche?: string;
  /** Termos proibidos: palavras vetadas + promessas vetadas + público a evitar. */
  forbidden: string[];
};

const clean = (value?: string | null) => (value ?? "").trim().replace(/\s+/g, " ");

/**
 * RÓTULOS DO QUESTIONÁRIO NUNCA VIRAM TEXTO DE ARTE.
 *
 * O cliente escreve "…sem medo. Objeções mais comuns: acha que vai demorar" no
 * mesmo campo. Sem esta limpeza o motor lê o rótulo como frase e a arte sai com
 * título "Objeções mais comuns: acha". Aqui o rótulo é removido em qualquer
 * posição (início da resposta, depois de ponto, ponto e vírgula ou marcador).
 */
const LABEL_WORDS =
  "(?:maior\\s+)?(?:desejos?|obje(?:ç|c)(?:ão|ões|oes)(?:\\s+mais\\s+comuns?)?|dores?|cenas?|consequ(?:ê|e)ncias?|inimigos?|ofertas?|diferenciais?|diferencial|apresenta(?:ç|c)ão|p(?:ú|u)blico(?:\\s+prim(?:á|a)rio)?|perfil|cta|chamada)";
const LABEL_ANYWHERE = new RegExp(`(?:^|(?<=[.!?;|•·—-]))\\s*${LABEL_WORDS}\\s*:\\s*`, "gi");

/**
 * Remove rótulos herdados do formulário sem alterar o conteúdo da resposta.
 * O separador que sobra nas pontas (";", "|", "•", "-") também sai: ele era
 * herança da colagem, não pontuação da frase, e aparecia na arte.
 */
export const stripFieldLabels = (value?: string | null): string =>
  clean(value)
    .replace(LABEL_ANYWHERE, " ")
    .replace(/\s+/g, " ")
    .replace(/^[-–—•·|;,.\s]+/, "")
    .replace(/[-–—•·|;,\s]+$/, "")
    .trim();

const OBJECTION_LABEL = new RegExp(
  `(?:^|(?<=[.!?;|•·]))\\s*obje(?:ç|c)(?:ão|oes|ões)(?:\\s+mais\\s+comuns?)?\\s*:\\s*`,
  "i",
);

/** Separa os dois assuntos reunidos pelo campo histórico "desejo e objeção". */
const splitDesireAndObjection = (value?: string): { desire?: string; objection?: string } => {
  const source = clean(value);
  if (!source) return {};

  const objectionAt = source.search(OBJECTION_LABEL);
  if (objectionAt < 0) return { desire: stripFieldLabels(source) || undefined };

  const desire = stripFieldLabels(source.slice(0, objectionAt));
  const objection = stripFieldLabels(source.slice(objectionAt));
  return { desire: desire || undefined, objection: objection || undefined };
};


/** Quebra "cura, milagre; garantia de resultado" em termos individuais. */
const splitTerms = (value?: string | null): string[] =>
  clean(value)
    .split(/[,;/\n•·|]+| e (?=[a-zà-ú])/i)
    .map((t) =>
      t
        .trim()
        .replace(/^(nunca|não|nada de|evitar|proibido)\s+/i, "")
        .replace(/[.!?]+$/, "")
        .trim(),
    )
    .filter((t) => t.length >= 3 && t.length <= 40);

export type BrandDnaInput = {
  niche?: string | null;
  tone?: string | null;
  description?: string | null;
  positioning?: string | null;
  briefAnswers?: unknown;
};

export const buildBrandDna = (input: BrandDnaInput): BrandDna => {
  const brief: BriefAnswers = readBriefAnswers(input.briefAnswers);
  /* Nenhum rótulo do formulário entra no motor textual. */
  const pick = (id: string) => stripFieldLabels(brief[id]) || undefined;
  const desire = splitDesireAndObjection(clean(brief.desejo));


  return {
    presentation: pick("apresentacao"),
    offer: pick("oferta"),
    belief: pick("diferencial"),
    signature: pick("assinatura"),
    primaryAudience: pick("publico_primario"),
    profile: pick("perfil"),
    pain: pick("dor"),
    desire: desire.desire,
    objection: desire.objection,
    scene: pick("cena"),
    enemy: pick("inimigo"),
    stakes: pick("consequencia"),
    cta: pick("cta"),
    tone: pick("tom") || clean(input.tone) || undefined,
    technicalLevel: pick("nivel_tecnico"),
    positioning: clean(input.positioning) || undefined,
    description: clean(input.description) || undefined,
    niche: clean(input.niche) || undefined,
    forbidden: [
      ...splitTerms(brief.proibidas),
      ...splitTerms(brief.nunca_prometer),
      ...splitTerms(brief.nao_atrair),
    ],
  };
};

/** DNA vazio (marca sem manual e sem briefing) — libera o acervo de emergência. */
export const isDnaEmpty = (dna: BrandDna): boolean =>
  !dna.presentation &&
  !dna.offer &&
  !dna.belief &&
  !dna.pain &&
  !dna.desire &&
  !dna.positioning &&
  !dna.description;

/** Quantos eixos do DNA estão preenchidos (usado no filtro de nexo e na UI). */
export const dnaDepth = (dna: BrandDna): number =>
  [
    dna.presentation,
    dna.offer,
    dna.belief,
    dna.primaryAudience,
    dna.profile,
    dna.pain,
    dna.desire,
    dna.scene,
    dna.enemy,
    dna.stakes,
    dna.cta,
    dna.positioning,
    dna.description,
  ].filter(Boolean).length;

/** Vocabulário real da marca — usado para checar se a arte fala dela mesma. */
export const dnaVocabulary = (dna: BrandDna): string[] => {
  const text = [
    dna.presentation,
    dna.offer,
    dna.belief,
    dna.primaryAudience,
    dna.profile,
    dna.pain,
    dna.desire,
    dna.scene,
    dna.enemy,
    dna.stakes,
    dna.positioning,
    dna.description,
    dna.niche,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return [...new Set(text.split(/[^a-zà-ú0-9]+/i).filter((w) => w.length >= 5))];
};

/**
 * VOCABULÁRIO DE OFERTA (global, sensível ao tipo de marca)
 *
 * "Produto" só aparece quando a marca de fato vende um produto (digital ou
 * físico). Marca de serviço clínico/consultoria fala "atendimento"; curso e
 * mentoria falam "programa". Isso evita tanto o "produto" desumano numa marca
 * de fisioterapia quanto o "atendimento" errado num SaaS como o Aliv.iA Studio.
 */
export type OfferKind = "produto" | "atendimento" | "programa" | "serviço";

export type OfferWords = {
  kind: OfferKind;
  /** Núcleo nominal: "produto", "atendimento", "programa", "serviço". */
  noun: string;
  /** Com possessivo em 1ª pessoa quando a marca é pessoal: "meu atendimento". */
  possessive: string;
  /** Rótulo de etapas: "etapas do atendimento" / "etapas do onboarding". */
  stepsLabel: string;
  /** Fim do ciclo: "alta" (clínico), "renovação" (produto), "conclusão". */
  closingLabel: string;
  /**
   * VOCABULÁRIO DE JORNADA — o que a marca de fato conduz.
   * "Caso" é palavra da saúde: só aparece em marca de atendimento clínico.
   * Produto/SaaS conduz um "projeto"; programa conduz uma "jornada".
   */
  caseWord: string;
  /** Com determinante: "o seu caso" / "o seu projeto" / "a sua jornada". */
  yourCase: string;
  /** Complemento verbal: "conduz um caso" / "trabalha a sua marca". */
  conductPhrase: string;
};


const hasAny = (text: string, terms: string[]) => terms.some((t) => text.includes(t));

const PRODUCT_TERMS = [
  "produto",
  "software",
  "aplicativo",
  " app",
  "plataforma",
  "assinatura",
  "saas",
  "sistema",
  "digital",
  "loja",
  "e-commerce",
  "ecommerce",
  "ferramenta",
  "licença",
  "peça",
];
const SERVICE_TERMS = [
  "atendimento",
  "consulta",
  "sessão",
  "sessões",
  "clínica",
  "clinica",
  "fisioterapia",
  "terapia",
  "paciente",
  "consultório",
  "reabilitação",
  "tratamento",
];
const PROGRAM_TERMS = ["curso", "mentoria", "aula", "treinamento", "formação", "workshop", "imersão"];

/** Marca pessoal: nome de pessoa ou apresentação em 1ª pessoa. */
const isPersonalBrand = (brandName: string, dna: BrandDna) => {
  const words = brandName.trim().split(/\s+/);
  const looksLikeName = words.length >= 2 && /^[A-ZÀ-Ú][a-zà-ú]+$/.test(words[0]);
  const firstPerson = /\b(eu|meu|minha|atendo|trabalho)\b/i.test(
    [dna.presentation, dna.offer, dna.belief].filter(Boolean).join(" "),
  );
  return looksLikeName || firstPerson;
};

export const offerWords = (dna: BrandDna, brandName = ""): OfferWords => {
  const text = [dna.offer, dna.presentation, dna.description, dna.positioning, dna.niche, brandName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let kind: OfferKind = "serviço";
  if (hasAny(text, PRODUCT_TERMS)) kind = "produto";
  // Explicit software identity wins over references to the clinical field it serves.
  if (hasAny(text, SERVICE_TERMS) && !/\b(software|saas|aplicativo|app)\b/i.test(text)) kind = "atendimento";
  else if (hasAny(text, PROGRAM_TERMS) && kind !== "produto") kind = "programa";

  const personal = kind !== "produto" && isPersonalBrand(brandName, dna);
  const noun = kind === "serviço" ? "serviço" : kind;

  /**
   * "Caso" pertence ao vocabulário clínico. Marca de produto/SaaS conduz
   * PROJETO; curso e mentoria conduzem JORNADA; serviço genérico, TRABALHO.
   */
  const caseWord =
    kind === "atendimento" ? "caso" : kind === "produto" ? "projeto" : kind === "programa" ? "jornada" : "trabalho";
  const article = caseWord === "jornada" ? "a sua" : "o seu";

  return {
    kind,
    noun,
    possessive: personal ? `meu ${noun}` : `o ${noun}`,
    stepsLabel:
      kind === "produto" ? "etapas até o primeiro resultado" : `etapas do ${noun}`,
    closingLabel:
      kind === "atendimento" ? "alta" : kind === "programa" ? "conclusão" : "entrega",
    caseWord,
    yourCase: `${article} ${caseWord}`,
    conductPhrase:
      kind === "atendimento"
        ? "conduz um caso"
        : kind === "produto"
          ? "trabalha a sua marca"
          : kind === "programa"
            ? "conduz a sua jornada"
            : "conduz o trabalho",
  };
};

/**
 * VOCABULÁRIO DE OPERAÇÃO (acervo neutro sem temática de consultório)
 *
 * O acervo de emergência falava "consulta", "alta", "primeira conversa",
 * "conduta" para QUALQUER marca — herança do Aliv.iA Fisio. Aqui o mesmo
 * esqueleto de frase recebe as palavras da operação REAL da marca, derivadas do
 * kit (nicho, oferta, descrição). Nenhuma marca fala de consultório sem ser de
 * atendimento clínico.
 */
export type OperationWords = {
  /** Quem é atendido/servido: paciente / cliente / aluno / assinante. */
  who: string;
  /** Plural de `who`. */
  whoPlural: string;
  /** Primeiro contato real: primeira avaliação / primeira conversa / teste. */
  firstStep: string;
  /** Documento-guia do trabalho: plano / roteiro / trilha. */
  planWord: string;
  /** Momento de conferir o rumo: revisão / checkpoint / ajuste. */
  reviewWord: string;
  /** Unidade de encontro/uso: sessão / reunião / aula / uso. */
  encounterWord: string;
  /** O que fica de registro: relatório / entrega / material. */
  deliverable: string;
  /** Ciclo declarado: "por ciclo" / "por sprint" / "por módulo". */
  cycleLabel: string;
};

export const operationWords = (dna: BrandDna, brandName = ""): OperationWords => {
  const domain = [dna.niche, dna.description, dna.presentation, dna.offer, brandName]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  /** A operação nasce da vertical declarada, não do antigo padrão humano. */
  if (/veterin|animal|pet|canin|felin/.test(domain))
    return {
      who: "tutor",
      whoPlural: "tutores",
      firstStep: "primeira consulta",
      planWord: "investigação",
      reviewWord: "acompanhamento",
      encounterWord: "consulta",
      deliverable: "orientação clínica",
      cycleLabel: "por etapa do cuidado",
    };
  const { kind } = offerWords(dna, brandName);
  if (kind === "atendimento")
    return {
      who: "paciente",
      whoPlural: "pacientes",
      firstStep: "primeira avaliação",
      planWord: "plano",
      reviewWord: "reavaliação",
      encounterWord: "sessão",
      deliverable: "relatório",
      cycleLabel: "por ciclo de tratamento",
    };
  if (kind === "produto")
    return {
      who: "cliente",
      whoPlural: "clientes",
      firstStep: "primeiro teste",
      planWord: "roteiro",
      reviewWord: "ajuste",
      encounterWord: "uso",
      deliverable: "entrega",
      cycleLabel: "por ciclo de uso",
    };
  if (kind === "programa")
    return {
      who: "aluno",
      whoPlural: "alunos",
      firstStep: "primeira aula",
      planWord: "trilha",
      reviewWord: "checkpoint",
      encounterWord: "encontro",
      deliverable: "material",
      cycleLabel: "por módulo",
    };
  return {
    who: "cliente",
    whoPlural: "clientes",
    firstStep: "primeira conversa",
    planWord: "plano",
    reviewWord: "revisão",
    encounterWord: "reunião",
    deliverable: "entrega",
    cycleLabel: "por ciclo",
  };
};
