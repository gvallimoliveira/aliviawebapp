import type { WorldContent } from "@/pages/studio/content";
import type { TopicId } from "@/pages/studio/topics";
import { createRng, type Rng } from "@/pages/studio/rng";
import { voiceRegister, type VoiceRegister } from "@/pages/studio/lexicon";
import {
  composeClosings,
  composeHeadlines,
  composeKinetic,
  composeSubs,
  composeTypos,
  type CopyIngredients,
} from "@/pages/studio/phrasing";
import { GLOBAL_SEGMENT, matrixAudiences, type BrandAudience, type ContentAngle } from "./audiences";
import { condensePhrase } from "./textFit";



/**
 * CONTEÚDO EDITORIAL GENÉRICO DE UMA MARCA DO CLIENTE
 *
 * O motor de artes é o mesmo do Studio interno, mas o acervo de copy aqui é
 * neutro: nasce do kit de marca (nome, nicho, tom) e nunca fala de fisioterapia
 * nem cita o Aliv.iA.
 *
 * REGRA DE IMAGEM: a copy neutra NÃO carrega `topic` clínico. Antes ela reusava
 * tópicos reais do Aliv.iA só para alimentar a cobertura, e isso fazia o bloco
 * fotográfico casar uma foto de avaliação (termografia, dinamometria) com um
 * texto genérico de "entrega no prazo" — nexo falso. Sem tópico, o bloco
 * fotográfico simplesmente não renderiza para conteúdo neutro.
 */
const topicAt = (_i: number): TopicId | undefined => undefined;


export type BrandKit = {
  name: string;
  niche?: string | null;
  tone?: string | null;
  /** Descrição livre do que a marca faz (alimenta subtítulos e legendas). */
  description?: string | null;
  /** Palavras-chave da marca (alimentam kickers e marquee). */
  keywords?: string[] | null;
};

/**
 * FRASE DE APOIO DA MARCA (slogan do lockup).
 *
 * REGRA DURA: o campo "tom de voz" é DIRETRIZ de comunicação (como falar), não
 * copy. Antes ele era usado como slogan/subtítulo/depoimento — quando o cliente
 * colava um manual de marca inteiro ali, o manual aparecia dentro da arte.
 * Agora o slogan sai da descrição (primeira frase curta) ou do nicho, e o tom de
 * voz nunca é renderizado.
 */
const firstSentence = (text: string, max = 90) => {
  const phrase = condensePhrase(text, max);
  return phrase.replace(/\s*[.]\s*$/, "");
};


export const brandSlogan = (kit: BrandKit) => {
  const fromDescription = firstSentence(kit.description ?? "");
  if (fromDescription) return fromDescription;
  const niche = (kit.niche ?? "").trim();
  return niche ? `${firstSentence(niche, 48)} com presença todo dia.` : "Presença digital todo dia.";
};

/**
 * VARIAÇÃO DO LOTE: semente + registro de voz. Quando presente, headlines,
 * subs, tipográficos, cinéticos e fechamentos são COMPOSTOS (frames retóricos ×
 * ingredientes do kit × léxico do registro) em vez de saírem de listas fixas.
 */
export type CopyVariation = { seed: string; register?: VoiceRegister };

const ingredientsOf = (
  kit: BrandKit,
  brand: string,
  niche: string,
  audiences: BrandAudience[] = [],
  audience?: BrandAudience,
): CopyIngredients => {
  const pool = audience ? [audience] : audiences;
  const collect = (get: (a: BrandAudience) => string[] | undefined) =>
    pool.flatMap((a) => (get(a) ?? []).map((v) => v.trim()).filter(Boolean));
  return {
    brand,
    niche,
    audience: audience?.label.trim(),
    pains: collect((a) => a.pains),
    desires: collect((a) => a.desires),
    solutions: collect((a) => a.proof),
    keywords: (kit.keywords ?? []).map((w) => w.trim()).filter(Boolean),
    cta: audience?.cta?.trim(),
  };
};

/**
 * Monta o acervo de copy da marca no contrato `WorldContent`, para que todos os
 * blocos (hero, stats, carrossel, storytelling…) funcionem sem alteração.
 */
export const buildBrandContent = (
  kit: BrandKit,
  variation?: CopyVariation,
  audiences: BrandAudience[] = [],
): WorldContent => {
  const brand = kit.name.trim() || "Sua marca";
  /** Nicho entra em headlines: precisa ser rótulo curto, não frase inteira. */
  const niche = firstSentence((kit.niche ?? "").trim(), 30) || "o seu mercado";

  const tone = brandSlogan(kit);
  const words = (kit.keywords ?? []).map((w) => w.trim()).filter(Boolean);
  /** Descrição também entra clampada: bloco de arte não é campo de texto longo. */
  const description = firstSentence((kit.description ?? "").trim(), 160);

  /** Motor de variedade linguística (determinístico pela seed do lote). */
  const register: VoiceRegister = variation?.register ?? voiceRegister(kit.tone, brand);
  const varyRng: Rng | null = variation ? createRng(`copy:${variation.seed}:${brand}`) : null;
  const phrasing = { register, seed: `${variation?.seed ?? "static"}:${brand}`, forbidden: [] as string[] };
  const ing = ingredientsOf(kit, brand, niche, audiences);

  const composedHeadlines = varyRng ? composeHeadlines(ing, phrasing, varyRng) : [];
  const composedSubs = varyRng ? composeSubs(ing, phrasing, varyRng) : [];
  const composedTypos = varyRng ? composeTypos(ing, phrasing, varyRng) : [];
  const composedKinetic = varyRng ? composeKinetic(ing, phrasing, varyRng) : [];
  const composedClosings = varyRng ? composeClosings(ing, phrasing, varyRng) : [];

  return {
    id: "pro",
    label: brand,
    kickers: [
      brand.toUpperCase(),
      `${niche.toUpperCase()}`,
      ...words.slice(0, 4).map((w) => w.toUpperCase()),
      "NOVIDADE",
      "POR DENTRO DA MARCA",
      "PARA QUEM ACOMPANHA",
    ],
    headlines: composedHeadlines.length
      ? composedHeadlines
      : [
          { strong: brand, rest: " existe para resolver o que ninguém resolveu." },
          { strong: "Feito com método", rest: `, não com sorte.` },
          { strong: "Quem escolhe bem", rest: " volta." },
          { strong: `A referência em ${niche}`, rest: " começa aqui." },
          { strong: "Simples de entender.", rest: " Difícil de esquecer." },
        ],
    subs: [
      tone,
      ...(description ? [description] : []),
      ...(composedSubs.length
        ? composedSubs
        : [
            `${brand} transforma conhecimento em uma experiência clara e relevante.`,
            `Em ${niche}, detalhe não é enfeite — é resultado.`,
            "Uma decisão bem tomada economiza meses.",
          ]),
    ],
    kinetic: composedKinetic.length
      ? composedKinetic
      : [
          { kicker: "O QUE MOVE A MARCA", word: "Cuidado", caption: "Cada detalhe expressa uma escolha consciente." },
          { kicker: "NOSSA APOSTA", word: "Constância", caption: "Presença consistente cria reconhecimento." },
          { kicker: "PROMESSA", word: "Clareza", caption: "Uma proposta fácil de entender e reconhecer." },
        ],

    metrics: [
      [
        { value: 3, label: "pilares que orientam a marca" },
        { value: 1, label: "proposta central fácil de lembrar" },
        { value: 360, suffix: "°", label: "de visão sobre o público" },
      ],
      [
        { value: 4, label: "ângulos de conteúdo" },
        { value: 3, label: "motivos para escolher" },
        { value: 1, label: "identidade reconhecível" },
      ],
    ],
    stats: [
      {
        heading: "Números que traduzem a proposta",
        items: [
          { value: "3", label: "pilares centrais", note: "uma identidade fácil de reconhecer" },
          { value: "4", label: "formas de comunicar", note: "informar, conectar, inspirar e convidar" },
          { value: "1", label: "ideia principal", note: "clareza em cada conteúdo" },
        ],
      },
      {
        heading: "O que fortalece uma marca",
        items: [
          { value: "+clareza", label: "na mensagem", note: "o público entende o valor" },
          { value: "+presença", label: "na memória", note: "consistência gera reconhecimento" },
          { value: "+conexão", label: "com o público", note: "a comunicação parte de necessidades reais" },
        ],
      },
    ],
    triptychs: [
      {
        heading: "Três palavras que resumem a marca",
        panels: [
          { word: "Escuta", line: "Entender antes de propor.", topic: topicAt(0) },
          { word: "Método", line: "Cada etapa com começo e fim.", topic: topicAt(1) },
          { word: "Valor", line: "Uma proposta que faz sentido.", topic: topicAt(2) },
        ],
      },
      {
        heading: "Como a gente trabalha",
        panels: [
          { word: "Simples", line: "Sem jargão, sem letra miúda.", topic: topicAt(3) },
          { word: "Direto", line: "Uma mensagem, sem ruído.", topic: topicAt(4) },
          { word: "Honesto", line: "O que não cabe, a gente avisa.", topic: topicAt(5) },
        ],
      },
    ],
    typos: [
      { lead: "A gente cuida do processo.", big: "Você", tail: " colhe o resultado." },
      { lead: "Menos ruído.", big: "Mais valor", tail: "." },
      { lead: `Em ${niche},`, big: " consistência", tail: " vale mais que sorte." },
      { lead: "O barato sai caro.", big: "O certo", tail: " sai uma vez." },
      { lead: "Detalhe não é enfeite.", big: "É resultado", tail: "." },
      { lead: brand, big: " existe", tail: " para resolver." },
    ],
    compare: [
      {
        title: "Antes e depois de comunicar com clareza",
        before: ["Mensagem genérica", "Valor difícil de perceber", "Conteúdo sem identidade", "Público indiferente"],
        after: ["Mensagem específica", "Valor fácil de entender", "Identidade reconhecível", "Público conectado"],
      },
      {
        title: `Como ${brand} encara ${niche}`,
        before: ["Achismo", "Correria", "Improviso"],
        after: ["Diagnóstico", "Planejamento", "Execução medida"],
      },
      {
        title: "Escolher por preço x escolher por resultado",
        before: ["Mais barato agora", "Refazer depois"],
        after: ["Investimento claro", "Uma vez, bem feito"],
      },
    ],
    journeys: [
      {
        kicker: "COMO FUNCIONA",
        heading: "Três etapas até o resultado",
        steps: [
          { title: "Conversa inicial", description: "Entendemos o cenário e o que você quer alcançar.", topic: topicAt(0) },
          { title: "Direção", description: "Uma mensagem alinhada ao que o público realmente busca.", topic: topicAt(1) },
          { title: "Experiência", description: "A proposta ganha forma com identidade e consistência.", topic: topicAt(2) },
        ],
      },
      {
        kicker: "DA DESCOBERTA À ESCOLHA",
        heading: "Nada acontece sem o seu aval",
        steps: [
          { title: "Diagnóstico", description: "O que está travando hoje.", topic: topicAt(3) },
          { title: "Proposta", description: "O caminho mais curto até o resultado.", topic: topicAt(4) },
          { title: "Acompanhamento", description: "Ajustes com você, não depois de você.", topic: topicAt(5) },
          { title: "Escolha", description: "O público reconhece valor e sabe qual é o próximo passo.", topic: topicAt(6) },
        ],
      },
    ],
    features: [
      {
        tag: "PROPOSTA",
        title: "Valor fácil de entender",
        description: "A mensagem mostra com clareza o que torna a marca relevante para seu público.",
        topic: topicAt(0),
        headline: "Clareza que aproxima",
      },
      {
        tag: "EXPERIÊNCIA",
        title: "Uma jornada coerente",
        description: "Cada contato reforça a mesma identidade e facilita a escolha.",
        topic: topicAt(1),
        headline: "A marca sem ruído",
      },
      {
        tag: "DIFERENCIAL",
        title: "Personalidade reconhecível",
        description: "Texto, estética e intenção trabalham juntos para destacar a marca.",
        topic: topicAt(2),
        headline: "Difícil de confundir",
      },
      {
        tag: "CONEXÃO",
        title: "Conteúdo que parte do público",
        description: "Dores, desejos e objetivos reais orientam cada mensagem.",
        topic: topicAt(3),
        headline: "A conversa certa",
      },
    ],
    quotes: [
      { text: `“${description || `${brand} traduz valor em experiências que fazem sentido.`}”` },
      { text: "“Finalmente encontrei uma proposta feita para o que eu precisava.”" },
      { text: "“A diferença ficou clara logo no primeiro contato.”" },
      { text: "“Foi fácil entender por que essa marca era a escolha certa.”" },
    ],
    marquee: [
      [brand, niche, "presença", "identidade", "constância"],
      words.length >= 3 ? words.slice(0, 6) : ["clareza", "relevância", "conexão", "resultado"],
      ["escuta", "método", "cuidado", brand],
    ],
    closings: [
      { title: "Vamos conversar?", sub: `Conte o seu cenário e ${brand} responde com um caminho.`, cta: "Chamar no direct" },
      { title: "Sua próxima escolha pode ser diferente", sub: "Conheça uma proposta pensada para você.", cta: "Falar com a gente" },
      { title: `${brand} está com agenda aberta`, sub: "Poucas vagas por mês para manter o padrão.", cta: "Garantir a minha vaga" },
      { title: "Compartilhe com quem precisa", sub: "Alguém do seu contato está procurando isso hoje.", cta: "Enviar agora" },
    ],
    stories: [
      {
        kicker: "CLIENTE REAL, NOME PROTEGIDO",
        title: "Ela chegou depois de tentar soluções genéricas",
        beats: [
          "As opções pareciam iguais.",
          "Nenhuma conversava com o que ela realmente precisava.",
          "Na terceira tentativa, encontrou uma proposta feita para seu contexto.",
        ],
        turn: "Foi a primeira vez que ela se reconheceu na mensagem.",
        moral: "Conexão começa quando a marca entende antes de falar.",
      },
      {
        kicker: "ACONTECE TODA SEMANA",
        title: "A marca que falava com todo mundo",
        beats: ["A mensagem era ampla demais.", "O público não percebia o diferencial.", "Cada conteúdo parecia vir de uma empresa diferente."],
        turn: "Quando definiu seu público, a comunicação ganhou direção.",
        moral: "Relevância nasce da coragem de ser específico.",
      },
    ],
    lists: [
      {
        heading: "4 sinais de que uma marca ainda não se conecta",
        items: [
          "A mensagem poderia ser de qualquer concorrente",
          "O público não entende o diferencial",
          "Cada conteúdo tem uma personalidade diferente",
          "A chamada não deixa claro o próximo passo",
        ],
        closing: `${brand} resolve os quatro no primeiro encontro.`,
      },
      {
        heading: "3 perguntas antes de escolher uma solução",
        items: ["Isso foi pensado para a minha realidade?", "Qual transformação essa proposta oferece?", "Por que esta marca é diferente?"],
        closing: "Quando as respostas são claras, escolher fica mais simples.",
      },
    ],
    carousels: [
      {
        kicker: "PASSO A PASSO",
        title: "Como a gente trabalha",
        coverSub: `${brand}, sem mistério.`,
        slides: [
          { heading: "1. Conversa", body: "Entendemos o cenário antes de propor qualquer coisa.", topic: topicAt(0) },
          { heading: "2. Direção", body: "Conectamos a proposta ao que o público busca.", topic: topicAt(1) },
          { heading: "3. Experiência", body: "Transformamos valor em uma presença reconhecível.", topic: topicAt(2) },
        ],
        cta: { title: "Quer começar?", sub: "Manda uma mensagem — a primeira conversa é sem compromisso." },
      },
      {
        kicker: "GUIA RÁPIDO",
        title: `3 erros comuns em ${niche}`,
        coverSub: "E como evitar cada um.",
        slides: [
          { heading: "Escolher só pelo preço", body: "O barato costuma cobrar duas vezes.", topic: topicAt(3) },
          { heading: "Falar sem conhecer", body: "Mensagem genérica raramente cria conexão.", topic: topicAt(4) },
          { heading: "Imitar concorrentes", body: "Sem identidade própria, a marca desaparece.", topic: topicAt(5) },
        ],
        cta: { title: "Evite os três", sub: `Fale com ${brand} antes de fechar qualquer coisa.` },
      },
    ],
    sales: {
      audience: niche,
      proofs: [
        "Proposta alinhada às necessidades do público",
        "Identidade consistente em cada ponto de contato",
        "Mensagem clara sobre valor e diferencial",
      ],
      objections: [
        "Não é mais caro: é previsível.",
        "Não precisa decidir hoje — a primeira conversa é sem compromisso.",
      ],
      offers: ["Primeira conversa gratuita", "Agenda limitada por mês para manter o padrão"],
      ctas: ["Chama no direct", "Manda mensagem", "Comenta aqui que eu te chamo"],
      hashtags: [brand.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(), niche.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()],
    },
  };
};

/* ------------------------------------------------------------------------- */
/* SEGMENTAÇÃO: nicho específico x visão global 360°                          */
/* ------------------------------------------------------------------------- */

/**
 * Aplica um público (nicho) sobre o acervo base: dores, desejos, provas e CTA
 * daquele segmento entram na frente, mantendo todos os outros blocos vivos.
 */
const applyAudience = (base: WorldContent, brand: string, audience: BrandAudience): WorldContent => {
  const who = audience.label.trim();
  const pains = audience.pains ?? [];
  const desires = audience.desires ?? [];
  const proof = audience.proof ?? [];
  const cta = audience.cta?.trim() || "Falar com a gente";
  const desc = audience.description?.trim();

  return {
    ...base,
    label: `${brand} · ${who}`,
    kickers: [`PARA ${who.toUpperCase()}`, who.toUpperCase(), ...base.kickers],
    headlines: [
      ...(pains[0] ? [{ strong: pains[0], rest: " não precisa ser a sua rotina." }] : []),
      ...(desires[0] ? [{ strong: desires[0], rest: " começa com uma decisão." }] : []),
      { strong: `Feito para ${who.toLowerCase()}`, rest: ", não para todo mundo." },
      ...base.headlines,
    ],
    subs: [...(desc ? [desc] : []), ...proof.slice(0, 2), ...base.subs],
    kinetic: [
      ...(pains[0] ? [{ kicker: `A DOR DE ${who.toUpperCase()}`, word: "Hoje", caption: pains[0] }] : []),
      ...(desires[0] ? [{ kicker: "O QUE MUDA", word: "Depois", caption: desires[0] }] : []),
      ...base.kinetic,
    ],
    compare: [
      ...(pains.length && desires.length
        ? [{ title: `${who}: antes e depois`, before: pains, after: desires }]
        : []),
      ...base.compare,
    ],
    lists: [
      ...(pains.length >= 3
        ? [{
            heading: `${pains.length} coisas que ${who.toLowerCase()} não deveria aceitar`,
            items: pains,
            closing: `${brand} resolve isso com processo, não com promessa.`,
          }]
        : []),
      ...base.lists,
    ],
    quotes: [...(desires[0] ? [{ text: `“${desires[0]}.”` }] : []), ...base.quotes],
    marquee: [[who, ...pains.slice(0, 2), ...desires.slice(0, 2)].filter(Boolean), ...base.marquee],
    closings: [
      { title: `${who}: o próximo passo é seu`, sub: desires[0] ?? `Fale com ${brand} hoje.`, cta },
      ...base.closings,
    ],
    sales: {
      ...base.sales,
      audience: who,
      proofs: proof.length ? proof : base.sales.proofs,
      objections: pains.length ? [`Você já tentou e não deu certo? O problema era ${pains[0].toLowerCase()}.`, ...base.sales.objections] : base.sales.objections,
      ctas: [cta, ...base.sales.ctas],
    },
  };
};

/**
 * Visão 360°: interpola todos os nichos numa leitura única do produto — um
 * painel por público, para mostrar amplitude sem perder concretude.
 */
const applyGlobal = (
  base: WorldContent,
  brand: string,
  audiences: BrandAudience[],
  positioning?: string | null,
): WorldContent => {
  if (!audiences.length) {
    return positioning?.trim() ? { ...base, subs: [positioning.trim(), ...base.subs] } : base;
  }
  // Métrica oficial: só públicos matriz. Sub-nichos existem para comunicação
  // dirigida, mas contá-los produz números errados ("9 públicos").
  const matrix = matrixAudiences(audiences);
  const labels = matrix.map((a) => a.label);
  const panels = matrix.slice(0, 3).map((a, i) => ({
    word: a.label,
    line: a.desires?.[0] ?? a.description ?? "Um caminho claro para esse perfil.",
    topic: topicAt(i),
  }));

  return {
    ...base,
    kickers: ["VISÃO 360°", `UM PRODUTO, ${labels.length} PÚBLICOS`, ...base.kickers],
    headlines: [
      { strong: `${labels.length} públicos`, rest: ", um só padrão de qualidade." },
      { strong: brand, rest: ` atende ${labels.slice(0, 3).join(", ").toLowerCase()} no mesmo lugar.` },
      ...base.headlines,
    ],
    subs: [...(positioning?.trim() ? [positioning.trim()] : []), ...base.subs],
    triptychs: [
      ...(panels.length === 3 ? [{ heading: "Para quem é", panels }] : []),
      ...base.triptychs,
    ],
    lists: [
      {
        heading: "Para quem o produto foi feito",
        items: matrix.map((a) => `${a.label} — ${a.desires?.[0] ?? a.description ?? "resultado claro"}`),
        closing: "Cada perfil entra por uma porta diferente e chega ao mesmo padrão.",
      },
      ...base.lists,
    ],
    marquee: [labels, ...base.marquee],
    carousels: [
      {
        kicker: "VISÃO GERAL",
        title: `${brand} por dentro`,
        coverSub: `Um produto, ${labels.length} públicos.`,
        slides: matrix.slice(0, 5).map((a, i) => ({
          heading: a.label,
          body: a.pains?.[0] ? `${a.pains[0]} → ${a.desires?.[0] ?? "caminho claro"}.` : a.description ?? "",
          topic: topicAt(i),
        })),
        cta: { title: "Em qual desses você se encaixa?", sub: "Responde aqui que eu te mostro o caminho." },
      },
      ...base.carousels,
    ],
    sales: {
      ...base.sales,
      audience: labels.join(", "),
      proofs: matrix.flatMap((a) => a.proof?.slice(0, 1) ?? []).concat(base.sales.proofs).slice(0, 6),
    },
  };
};

/**
 * Ângulo estratégico: reordena o acervo para privilegiar a intenção do post
 * (informar, nomear a dor, gerar desejo ou vender).
 */
const applyAngle = (content: WorldContent, angle: ContentAngle): WorldContent => {
  const rotate = <T,>(list: T[], n: number): T[] =>
    list.length > 1 ? [...list.slice(n % list.length), ...list.slice(0, n % list.length)] : list;

  switch (angle) {
    case "dor":
      return { ...content, kickers: ["ISSO É COM VOCÊ", ...content.kickers] };
    case "desejo":
      return {
        ...content,
        kickers: ["IMAGINA ASSIM", ...content.kickers],
        headlines: rotate(content.headlines, 1),
        kinetic: rotate(content.kinetic, 1),
      };
    case "venda":
      return {
        ...content,
        kickers: ["AGENDA ABERTA", ...content.kickers],
        headlines: rotate(content.headlines, 2),
        closings: rotate(content.closings, 0),
        sales: { ...content.sales, ctas: content.sales.ctas },
      };
    case "informar":
    default:
      return {
        ...content,
        kickers: ["ENTENDA EM 1 MINUTO", ...content.kickers],
        headlines: rotate(content.headlines, 3),
      };
  }
};

export type SegmentContentInput = {
  kit: BrandKit;
  /** Acervo base — genérico do kit, ou o oficial de um mundo Aliv.iA. */
  base?: WorldContent;
  audiences: BrandAudience[];
  /** Segmento ativo: `GLOBAL_SEGMENT` ou o id de um público. */
  segment: string;
  angle: ContentAngle;
  positioning?: string | null;
};

/**
 * Ponto de entrada único do motor: resolve marca + segmento + ângulo em um
 * `WorldContent`. Serve para qualquer cliente, com ou sem nichos cadastrados.
 */
export const buildSegmentContent = ({
  kit,
  base,
  audiences,
  segment,
  angle,
  positioning,
}: SegmentContentInput): WorldContent => {
  const brand = kit.name.trim() || "Sua marca";
  const root = base ?? buildBrandContent(kit);
  if (segment === GLOBAL_SEGMENT) {
    return applyAngle(applyGlobal(root, brand, audiences, positioning), angle);
  }
  const audience = audiences.find((a) => a.id === segment);
  if (!audience) return applyAngle(root, angle);
  return applyAngle(applyAudience(root, brand, audience), angle);
};
