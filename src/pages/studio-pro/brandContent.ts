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
import { hasBannedJargon, isStale, isStudioSelfBrand, STUDIO_SELF_KEYWORDS } from "@/pages/studio/persuasion";
import { nominal, nominalList, readsWell, sentence } from "@/pages/studio/grammar";
import { GLOBAL_SEGMENT, audienceHooks, audienceKeyword, matrixAudiences, resolveAudience, type BrandAudience, type ContentAngle } from "./audiences";
import { buildBrandDna, isDnaEmpty, type BrandDna } from "./brandDnaKit";
import { pickRelation, type Relation } from "./relational";
import { condensePhrase } from "./textFit";
import { intensityFor, type VariationProfile } from "@/pages/studio/variation";




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
  /** Posicionamento declarado (manual/IA). */
  positioning?: string | null;
  /**
   * Respostas do questionário de marca (`studio_brands.brief_answers`).
   * FONTE PRIMÁRIA do texto: quando existe, é ela que escreve as artes — o
   * acervo neutro só entra como emergência para marca sem manual e sem briefing.
   */
  briefAnswers?: unknown;
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
export type CopyVariation = { seed: string; register?: VoiceRegister; profile?: VariationProfile };

const ingredientsOf = (
  kit: BrandKit,
  brand: string,
  niche: string,
  audiences: BrandAudience[] = [],
  audience?: BrandAudience,
  dna?: BrandDna,
): CopyIngredients => {
  const pool = audience ? [audience] : audiences;
  const collect = (get: (a: BrandAudience) => string[] | undefined) =>
    pool.flatMap((a) => (get(a) ?? []).map((v) => v.trim()).filter(Boolean));
  /**
   * HIERARQUIA: o que o cliente declarou (manual/briefing) vem PRIMEIRO. O
   * acervo de público entra depois. Nada genérico entra aqui — quando falta
   * insumo, o slot simplesmente tem menos opções.
   */
  const briefPains = dna?.pain ? [dna.pain] : [];
  const briefDesires = dna?.desire ? [dna.desire] : [];
  const briefSolutions = [dna?.belief, dna?.offer].filter(Boolean) as string[];
  return {
    brand,
    niche,
    audience: audience?.label.trim() || dna?.primaryAudience,
    pains: [...briefPains, ...collect((a) => a.pains)],
    desires: [...briefDesires, ...collect((a) => a.desires)],
    solutions: [...briefSolutions, ...collect((a) => a.proof)],
    positioning: dna?.presentation || dna?.positioning || undefined,
    /**
     * O vocabulário da ferramenta ("kit de marca", "sua paleta", "lote"…) é
     * EXCLUSIVO do Aliv.iA Studio vendendo a si mesmo. Em marca de cliente ele
     * soaria como se o cliente vendesse a ferramenta (isolamento de marca).
     */
    keywords: [
      ...(kit.keywords ?? []).map((w) => w.trim()).filter(Boolean),
      ...(isStudioSelfBrand(brand) ? STUDIO_SELF_KEYWORDS : []),
    ],
    cta: audience?.cta?.trim() || dna?.cta,
  };
};

/* ------------------------------------------------------------------------- */
/* FILTRO DE VÍCIOS: nenhuma frase clichê sai do motor                        */
/* ------------------------------------------------------------------------- */

const textOf = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textOf).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(textOf).join(" ");
  return "";
};

/**
 * Remove do acervo tudo que caia em vício de linguagem, jargão proibido ou
 * palavra vetada pela marca. Se um slot ficaria vazio, mantém o primeiro item
 * (o bloco precisa renderizar), mas a arte vai reprovar no filtro de nexo.
 */
export const sanitizeContent = (content: WorldContent, forbidden: string[] = []): WorldContent => {
  const banned = forbidden.map((f) => f.toLowerCase().trim()).filter((f) => f.length >= 3);
  const bad = (raw: string) => {
    const t = raw.toLowerCase();
    return isStale(t) || hasBannedJargon(t) || banned.some((f) => t.includes(f));
  };
  const purge = <T,>(list: T[]): T[] => {
    const kept = list.filter((item) => !bad(textOf(item)));
    return kept.length ? kept : list.slice(0, 1);
  };
  const out = { ...content } as Record<string, unknown>;
  for (const [key, value] of Object.entries(content)) {
    if (Array.isArray(value)) out[key] = purge(value as unknown[]);
  }
  const sales = { ...content.sales } as Record<string, unknown>;
  for (const [key, value] of Object.entries(content.sales)) {
    if (Array.isArray(value)) sales[key] = purge(value as unknown[]);
  }
  out.sales = sales;
  return out as unknown as WorldContent;
};

/** Quebra um campo longo do briefing em frases utilizáveis dentro da arte. */
const briefPhrases = (text?: string, max = 3): string[] =>
  (text ?? "")
    .split(/[.;\n•·]+/)
    .map((s) => s.trim().replace(/^[-–]\s*/, ""))
    .filter((s) => s.length >= 12)
    .slice(0, max)
    .map((s) => firstSentence(s, 110));

/**
 * ACERVO DA MARCA (fonte primária): escrito com o que o cliente declarou no
 * manual/briefing. Cada slot só existe quando há insumo real — é o que impede o
 * motor de voltar a falar "clareza, método, pilares" para qualquer marca.
 */
const buildFromDna = (
  dna: BrandDna,
  brand: string,
  niche: string,
): Partial<WorldContent> => {
  const presentation = dna.presentation ? firstSentence(dna.presentation, 110) : "";
  const belief = briefPhrases(dna.belief, 3);
  const offer = briefPhrases(dna.offer, 3);
  const pain = briefPhrases(dna.pain, 2);
  const desire = briefPhrases(dna.desire, 2);
  const who = dna.primaryAudience?.trim() || niche;
  const cta = dna.cta?.trim() || "Chamar no direct";

  const headlines = [
    ...pain.map((p) => ({ strong: lower1(p).replace(/^./, (c) => c.toUpperCase()), rest: " tem explicação — e conduta." })),
    ...desire.map((d) => ({ strong: firstSentence(d, 60), rest: " começa com uma decisão." })),
    ...(presentation ? [{ strong: firstSentence(presentation, 60), rest: "" }] : []),
    ...belief.slice(0, 2).map((b) => ({ strong: firstSentence(b, 58), rest: "" })),
  ].filter((h) => h.strong.length >= 8);

  const subs = [
    ...(presentation ? [presentation] : []),
    ...offer,
    ...belief,
    ...(pain[0] ? [`Se ${lower1(pain[0])}, o problema não é força de vontade.`] : []),
  ];

  return {
    kickers: [brand.toUpperCase(), ...(who ? [who.toUpperCase()] : []), "COMO EU TRABALHO", "NO QUE EU ACREDITO"],
    headlines,
    subs,
    typos: [
      ...(pain[0] ? [{ lead: "Você convive com", big: firstSentence(pain[0], 34), tail: " há quanto tempo?" }] : []),
      ...(desire[0] ? [{ lead: "O objetivo é", big: firstSentence(desire[0], 34), tail: "." }] : []),
      ...(belief[0] ? [{ lead: "Aqui,", big: firstSentence(belief[0], 34), tail: "." }] : []),
    ],
    kinetic: [
      ...(pain[0] ? [{ kicker: "O PONTO DE PARTIDA", word: "Hoje", caption: pain[0] }] : []),
      ...(desire[0] ? [{ kicker: "O QUE PASSA A SER POSSÍVEL", word: "Depois", caption: desire[0] }] : []),
      ...(belief[0] ? [{ kicker: "COMO EU TRABALHO", word: "Critério", caption: belief[0] }] : []),
    ],
    quotes: [
      ...(presentation ? [{ text: `“${presentation}.”` }] : []),
      ...belief.slice(0, 2).map((b) => ({ text: `“${b}.”` })),
    ],
    lists: [
      ...(offer.length >= 2
        ? [{ heading: `O que ${brand} entrega`, items: offer, closing: cta }]
        : []),
      ...(belief.length >= 2
        ? [{ heading: "No que eu acredito", items: belief, closing: `É assim que ${brand} atende.` }]
        : []),
    ],
    closings: [
      { title: desire[0] ? firstSentence(desire[0], 60) : `Falar com ${brand}`, sub: presentation || offer[0] || "", cta },
      ...(pain[0] ? [{ title: "Isso te soa familiar?", sub: pain[0], cta }] : []),
    ],
    marquee: [[brand, ...(who ? [who] : []), ...belief.slice(0, 2)].filter(Boolean)],
    sales: {
      audience: who,
      proofs: [...offer, ...belief].slice(0, 5),
      objections: pain.map((p) => `Já tentou antes? O ponto era ${lower1(p)}.`),
      offers: offer.slice(0, 2),
      ctas: [cta],
      hashtags: [brand.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(), who.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()].filter(Boolean),
    },
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

  /** DNA declarado pelo cliente: manda no texto. */
  const dna = buildBrandDna({
    niche: kit.niche,
    tone: kit.tone,
    description: kit.description,
    positioning: kit.positioning,
    briefAnswers: kit.briefAnswers,
  });
  const dnaPools = isDnaEmpty(dna) ? {} : buildFromDna(dna, brand, niche);

  /** Motor de variedade linguística (determinístico pela seed do lote). */
  const register: VoiceRegister = variation?.register ?? voiceRegister(kit.tone, brand);
  const varyRng: Rng | null = variation ? createRng(`copy:${variation.seed}:${brand}`) : null;
  const phrasing = {
    register,
    seed: `${variation?.seed ?? "static"}:${brand}`,
    forbidden: dna.forbidden,
    intensity: variation?.profile ? intensityFor(variation.profile.headlines) : undefined,
  };
  const ing = ingredientsOf(kit, brand, niche, audiences, undefined, dna);

  const composedHeadlines = varyRng ? composeHeadlines(ing, phrasing, varyRng) : [];
  const composedSubs = varyRng ? composeSubs(ing, phrasing, varyRng) : [];
  const composedTypos = varyRng ? composeTypos(ing, phrasing, varyRng) : [];
  const composedKinetic = varyRng ? composeKinetic(ing, phrasing, varyRng) : [];
  const composedClosings = varyRng ? composeClosings(ing, phrasing, varyRng) : [];

  /**
   * ACERVO DE EMERGÊNCIA (neutro). Só sobrevive quando a marca não declarou
   * nada: qualquer slot com insumo do briefing é substituído logo abaixo.
   */
  const generic: WorldContent = {

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
          { strong: `Quem procura ${niche}`, rest: " chega aqui com uma pergunta na cabeça." },
          { strong: "A primeira conversa", rest: " já mostra o que dá e o que não dá." },
          { strong: `${brand} atende poucos casos`, rest: " por mês, e é de propósito." },
          { strong: `Antes de contratar ${niche}`, rest: ", peça para ver o plano." },
          { strong: "Você sai da conversa", rest: " sabendo o próximo passo." },
        ],
    subs: [
      tone,
      ...(description ? [description] : []),
      ...(composedSubs.length
        ? composedSubs
        : [
            `${brand} escuta o caso antes de propor qualquer coisa.`,
            `O que muda em ${niche} é o quanto se mede antes de decidir.`,
            "Uma decisão bem tomada economiza meses.",
          ]),
    ],
    kinetic: composedKinetic.length
      ? composedKinetic
      : [
          { kicker: "COMO COMEÇA", word: "Escuta", caption: "A primeira conversa serve para entender o caso." },
          { kicker: "COMO SEGUE", word: "Plano", caption: "Cada etapa tem começo, fim e revisão." },
          { kicker: "COMO TERMINA", word: "Alta", caption: "Você sabe quando o trabalho cumpriu o objetivo." },
        ],

    metrics: [
      [
        { value: 1, label: "conversa antes de qualquer proposta" },
        { value: 4, label: "semanas até a primeira revisão" },
        { value: 3, label: "etapas do atendimento" },
      ],
      [
        { value: 4, label: "assuntos que a marca comunica" },
        { value: 3, label: "motivos para escolher" },
        { value: 1, label: "profissional acompanha do início ao fim" },
      ],
    ],
    stats: [
      {
        heading: "Como o atendimento se organiza",
        items: [
          { value: "1", label: "primeira conversa", note: "para entender o caso antes de propor" },
          { value: "4", label: "semanas por ciclo", note: "revisão marcada desde o início" },
          { value: "3", label: "etapas até a alta", note: "cada uma com objetivo declarado" },
        ],
      },
      {
        heading: "O que muda no dia a dia",
        items: [
          { value: "-1", label: "consulta perdida", note: "o plano fica registrado por escrito" },
          { value: "+1", label: "revisão marcada", note: "ninguém segue no automático" },
          { value: "0", label: "promessa vazia", note: "o que não dá, a gente diz na hora" },
        ],
      },
    ],
    triptychs: [
      {
        heading: `Como ${brand} conduz um caso`,
        panels: [
          { word: "Escuta", line: "Entender antes de propor.", topic: topicAt(0) },
          { word: "Plano", line: "Cada etapa com começo e fim.", topic: topicAt(1) },
          { word: "Revisão", line: "O que não avança, muda.", topic: topicAt(2) },
        ],
      },
      {
        heading: "O que você pode cobrar da gente",
        panels: [
          { word: "Simples", line: "Explicado na sua língua.", topic: topicAt(3) },
          { word: "Direto", line: "Uma orientação por vez.", topic: topicAt(4) },
          { word: "Honesto", line: "O que não cabe, a gente avisa.", topic: topicAt(5) },
        ],
      },
    ],
    typos: composedTypos.length
      ? composedTypos
      : [
          { lead: "A gente conduz o processo.", big: "Você", tail: " sabe onde está." },
          { lead: "Menos improviso.", big: "Mais plano", tail: "." },
          { lead: `Em ${niche},`, big: " medir",tail: " vale mais que opinar." },
          { lead: "Refazer custa duas vezes.", big: "Decidir bem", tail: " custa uma." },
          { lead: "O que não avança", big: " muda", tail: " na revisão." },
          { lead: brand, big: " atende", tail: " poucos casos por mês." },
        ],

    compare: [
      {
        title: "Antes e depois de ter um plano por escrito",
        before: ["Orientação solta", "Sem data de revisão", "Você sem saber onde está", "Cada consulta recomeça"],
        after: ["Plano registrado", "Revisão marcada", "Etapa declarada", "Continuidade entre consultas"],
      },
      {
        title: `Como ${brand} encara ${niche}`,
        before: ["Achismo", "Correria", "Improviso"],
        after: ["Diagnóstico", "Planejamento", "Execução medida"],
      },
      {
        title: "Escolher por preço x escolher por resultado",
        before: ["Mais barato agora", "Refazer depois"],
        after: ["Investimento declarado", "Uma vez, bem feito"],
      },
    ],
    journeys: [
      {
        kicker: "COMO FUNCIONA",
        heading: "Três etapas até o resultado",
        steps: [
          { title: "Conversa inicial", description: "Entendemos o cenário e o que você quer alcançar.", topic: topicAt(0) },
          { title: "Plano", description: "O caminho que faz sentido para o seu caso, por escrito.", topic: topicAt(1) },
          { title: "Revisão", description: "O que avançou fica, o que não avançou muda.", topic: topicAt(2) },
        ],
      },
      {
        kicker: "DA DESCOBERTA À ESCOLHA",
        heading: "Nada acontece sem o seu aval",
        steps: [
          { title: "Diagnóstico", description: "O que está travando hoje.", topic: topicAt(3) },
          { title: "Proposta", description: "O caminho mais curto até o resultado.", topic: topicAt(4) },
          { title: "Acompanhamento", description: "Ajustes com você, não depois de você.", topic: topicAt(5) },
          { title: "Escolha", description: "Você decide com o plano na mão.", topic: topicAt(6) },
        ],
      },
    ],
    features: [
      {
        tag: "PROPOSTA",
        title: "Você entende o que vai acontecer",
        description: "A proposta diz o que será feito, em quanto tempo e como será revisto.",
        topic: topicAt(0),
        headline: "Explicado antes de começar",
      },
      {
        tag: "ATENDIMENTO",
        title: "Quem começa é quem termina",
        description: "Quem atende conhece o histórico e responde por ele do começo ao fim.",
        topic: topicAt(1),
        headline: "Sempre a mesma pessoa",
      },
      {
        tag: "DIFERENCIAL",
        title: "Revisão com data marcada",
        description: "A cada ciclo o plano é reavaliado com o que foi medido, não com impressão.",
        topic: topicAt(2),
        headline: "Nada roda no automático",
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
      { text: `“${description || `${brand} explica o plano antes de começar.`}”` },
      { text: "“Finalmente encontrei uma proposta feita para o que eu precisava.”" },
      { text: "“Saí da primeira conversa sabendo o que ia acontecer.”" },
      { text: "“Foi a primeira vez que alguém me disse o que não dava para prometer.”" },
    ],
    marquee: [
      [brand, niche, "escuta", "plano", "revisão"],
      words.length >= 3 ? words.slice(0, 6) : ["escuta", "plano", "revisão", "alta"],
      ["conversa", "plano", "revisão", brand],
    ],

    closings: composedClosings.length
      ? composedClosings
      : [
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
        turn: "Foi a primeira vez que alguém explicou o porquê.",
        moral: "Entender o caso vem antes de propor conduta.",
      },
      {
        kicker: "ACONTECE TODA SEMANA",
        title: "A marca que falava com todo mundo",
        beats: ["A mensagem era ampla demais.", "O público não percebia o diferencial.", "Cada conteúdo parecia vir de uma empresa diferente."],
        turn: "Quando definiu seu público, a comunicação ganhou direção.",
        moral: "Falar para alguém específico é o que faz o recado chegar.",
      },
    ],
    lists: [
      {
        heading: "4 sinais de que uma marca ainda não se conecta",
        items: [
          "A orientação poderia servir para qualquer pessoa",
          "Ninguém explicou por que esse caminho e não outro",
          "Cada consulta recomeça do zero",
          "A chamada não deixa claro o próximo passo",
        ],
        closing: `${brand} trata os quatro na primeira conversa.`,
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
        title: `Como ${brand} conduz um caso`,
        coverSub: `Como ${brand} conduz um caso.`,
        slides: [
          { heading: "1. Conversa", body: "Entendemos o cenário antes de propor qualquer coisa.", topic: topicAt(0) },
          { heading: "2. Plano", body: "O caminho do seu caso fica por escrito.", topic: topicAt(1) },
          { heading: "3. Revisão", body: "O que avançou fica; o que não avançou muda.", topic: topicAt(2) },
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
        "O plano é montado depois da primeira conversa",
        "Quem atende acompanha o caso do início ao fim",
        "Proposta por escrito, com data de revisão",
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

  /**
   * INVERSÃO DE HIERARQUIA: onde o briefing tem material, ele SUBSTITUI o
   * acervo neutro (o genérico só completa quando sobraria menos de 2 opções).
   * É essa troca que tira do ar os vícios herdados do Aliv.iA Fisio.
   */
  const prefer = <T,>(fromDna: T[] | undefined, fallback: T[]): T[] => {
    const dnaItems = (fromDna ?? []).filter(Boolean);
    if (dnaItems.length >= 2) return dnaItems;
    return [...dnaItems, ...fallback];
  };

  const merged: WorldContent = {
    ...generic,
    kickers: prefer(dnaPools.kickers, generic.kickers),
    headlines: prefer(dnaPools.headlines, generic.headlines),
    subs: prefer(dnaPools.subs, generic.subs),
    typos: prefer(dnaPools.typos, generic.typos),
    kinetic: prefer(dnaPools.kinetic, generic.kinetic),
    quotes: prefer(dnaPools.quotes, generic.quotes),
    lists: prefer(dnaPools.lists, generic.lists),
    closings: prefer(dnaPools.closings, generic.closings),
    marquee: prefer(dnaPools.marquee, generic.marquee),
    sales: dnaPools.sales
      ? {
          ...generic.sales,
          ...dnaPools.sales,
          proofs: prefer(dnaPools.sales.proofs, generic.sales.proofs),
          ctas: prefer(dnaPools.sales.ctas, generic.sales.ctas),
          objections: prefer(dnaPools.sales.objections, generic.sales.objections),
          offers: prefer(dnaPools.sales.offers, generic.sales.offers),
        }
      : generic.sales,
  };

  return sanitizeContent(merged, dna.forbidden);
};


/* ------------------------------------------------------------------------- */
/* SEGMENTAÇÃO: nicho específico x visão global 360°                          */
/* ------------------------------------------------------------------------- */

/** Minúscula só na primeira letra, preservando siglas e números (60+). */
const lower1 = (text: string) => (text ? text.charAt(0).toLowerCase() + text.slice(1) : text);
const strip = (text: string) => text.trim().replace(/\s*[.!?]+$/, "");

/**
 * Aplica um público (nicho ou sub-nicho) sobre o acervo base.
 *
 * REGRA DURA DE DIRECIONAMENTO: a arte precisa CHAMAR o público pela
 * palavra-chave dele ("Dor crônica", "Esportista", "Geração 60+").
 *
 * REGRA DE COPY RELACIONAL: quando o lote traz uma `relation`, TODOS os slots
 * giram em volta do MESMO par (público × medo/desejo × gancho × CTA). Antes cada
 * slot puxava um medo diferente do acervo e a arte saía desconexa.
 */
const applyAudience = (
  base: WorldContent,
  brand: string,
  audience: BrandAudience,
  relation?: Relation,
): WorldContent => {
  const who = audience.label.trim();
  const key = audienceKeyword(audience);
  const KEY = key.toUpperCase();
  const hookList = relation?.hooks?.length ? relation.hooks : audienceHooks(audience);
  const hook = hookList[0];
  /** Alterna entre as variações de gancho para não repetir a mesma abertura. */
  const hk = (i: number) => hookList[i % hookList.length];
  /** O medo/desejo eleito pela relação vem primeiro em todos os slots. */
  const lead = (list: string[], chosen?: string) => {
    const clean = list.map(strip).filter(Boolean);
    if (!chosen) return clean;
    const rest = clean.filter((v) => strip(chosen) !== v);
    return [strip(chosen), ...rest];
  };
  const pains = lead(audience.pains ?? [], relation?.pain);
  const desires = lead(audience.desires ?? [], relation?.desire);
  /**
   * Forma NOMINAL do medo/desejo. Toda moldura que encaixa o ingrediente DENTRO
   * de uma frase usa esta lista; a forma original (oração) só aparece em slots
   * que a exibem como frase inteira (lista, comparativo, legenda).
   */
  const painNoms = nominalList(pains);
  const desireNoms = nominalList(desires);
  const nomPain = (i: number, fallback: string) => painNoms[i] ?? nominal(pains[i], fallback);
  const nomDesire = (i: number, fallback: string) => desireNoms[i] ?? nominal(desires[i], fallback);
  const proof = lead(audience.proof ?? [], relation?.proof);
  const cta = relation?.cta || audience.cta?.trim() || "Falar com a gente";
  const desc = audience.description?.trim();
  /**
   * Comunicação dirigida: sub-nicho — ou qualquer público com acervo próprio —
   * reduz o acervo neutro a uma cauda curta, para não diluir a mensagem.
   */
  const focused = Boolean(audience.parentId?.trim()) || pains.length + desires.length >= 2;
  const tail = <T,>(list: T[]) => (focused ? list.slice(0, 2) : list);


  const headlines = [
    ...painNoms.slice(0, 3).map((p) => ({ strong: key, rest: `: ${lower1(p)} não precisa ser a sua rotina.` })),
    ...desireNoms.slice(0, 2).map((d) => ({ strong: key, rest: `: ${lower1(d)} começa com uma decisão.` })),
    ...proof.slice(0, 2).map((p) => ({ strong: `${key} pede método`, rest: `. ${p}.` })),
    { strong: `${hk(1)}`, rest: `: isso foi feito para o seu caso.` },
    { strong: `Feito para ${lower1(key)}`, rest: ", não para todo mundo." },
  ];

  const typos = [
    { lead: "Se o assunto é", big: key, tail: pains[0] ? sentence(pains[0]) : `a conversa muda de nível.` },
    { lead: hk(2) + ":", big: key, tail: desires[0] ? sentence(desires[0]) : `tem caminho.` },
    ...proof.slice(0, 1).map((p) => ({ lead: `${key} com`, big: "critério", tail: `${p}.` })),
  ];

  const lists = [
    ...(pains.length >= 3
      ? [{
          heading: `${pains.length} medos de quem convive com ${lower1(key)}`,
          items: pains.map(sentence),
          closing: `${brand} trata cada um desses pontos com processo, não com promessa.`,
        }]
      : []),
    ...(proof.length >= 3
      ? [{
          heading: `${key}: ${proof.length} coisas que fazem diferença de verdade`,
          items: proof,
          closing: `É isso que ${brand} entrega para quem está nessa situação.`,
        }]
      : []),
    ...(desires.length >= 2
      ? [{
          heading: `O que muda quando ${lower1(key)} é levado a sério`,
          items: desires.map(sentence),
          closing: `${hk(3)}, o próximo passo existe e é claro.`,
        }]
      : []),
  ];

  const carousels = [
    ...(pains.length && desires.length
      ? [{
          kicker: KEY,
          title: `${key}: do medo ao plano`,
          coverSub: `${hk(4)}, este carrossel é para você.`,
          slides: [
            ...pains.slice(0, 2).map((p) => ({ heading: "O que você sente hoje", body: sentence(p) })),
            ...desires.slice(0, 1).map((d) => ({ heading: "O que passa a ser possível", body: sentence(d) })),
            ...proof.slice(0, 1).map((p) => ({ heading: "Como a gente chega lá", body: `${p}.` })),
          ],
          cta: { title: `${key}: quer começar?`, sub: cta },
        }]
      : []),
  ];

  return {
    ...base,
    label: `${brand} · ${who}`,
    kickers: [KEY, `PARA ${KEY}`, `${KEY} · ${brand.toUpperCase()}`, ...tail(base.kickers)],
    headlines: [...headlines, ...tail(base.headlines)],
    subs: [
      ...(desc ? [desc] : []),
      ...proof.slice(0, 3).map((p) => `${key}: ${lower1(p)}.`),
      ...(painNoms[0] ? [`${hk(5)}: ${lower1(painNoms[0])} tem explicação — e conduta.`] : []),
      ...tail(base.subs),
    ],
    typos: [...typos, ...tail(base.typos)],
    kinetic: [
      ...(pains[0] ? [{ kicker: `${KEY} HOJE`, word: "Hoje", caption: sentence(pains[0]) }] : []),
      ...(desires[0] ? [{ kicker: `${KEY} DEPOIS`, word: "Depois", caption: sentence(desires[0]) }] : []),
      ...tail(base.kinetic),
    ],
    compare: [
      ...(pains.length && desires.length ? [{ title: `${key}: antes e depois`, before: pains, after: desires }] : []),
      ...tail(base.compare),
    ],
    lists: [...lists, ...tail(base.lists)],
    quotes: [
      ...desires.slice(0, 2).map((d) => ({ text: `“${sentence(d)}”` })),
      ...(painNoms[0] ? [{ text: `“Achei que ${lower1(painNoms[0])} fosse para sempre.”` }] : []),
      ...tail(base.quotes),
    ],
    marquee: [[key, ...painNoms.slice(0, 2), ...desireNoms.slice(0, 2)].filter(Boolean), ...tail(base.marquee)],
    carousels: [...carousels, ...tail(base.carousels)],
    closings: [
      { title: `${key}: o próximo passo é seu`, sub: desires[0] ? sentence(desires[0]) : `Fale com ${brand} hoje.`, cta },
      { title: hk(6), sub: proof[0] ?? `${brand} tem um caminho para o seu caso.`, cta },
      ...tail(base.closings),
    ],
    sales: {
      ...base.sales,
      audience: `${who} (${key})`,
      proofs: proof.length ? proof : base.sales.proofs,
      objections: pains.length
        ? [`Você já tentou e não deu certo? O problema era ${lower1(nomPain(0, "o improviso"))}.`, ...base.sales.objections]
        : base.sales.objections,
      ctas: [cta, ...base.sales.ctas],
      hashtags: [...new Set([key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(), ...base.sales.hashtags])],
    },
  };
};


/**
 * Visão 360° — ramo MARCA: leitura ampla do que a marca é e faz.
 *
 * O material vem dos três eixos do briefing — QUEM SOU (`apresentacao`), COMO
 * TRABALHO (`oferta`) e NO QUE ACREDITO (`diferencial`). Só quando esses eixos
 * estão vazios o 360° recai na leitura por públicos.
 */
const applyGlobal = (
  base: WorldContent,
  brand: string,
  audiences: BrandAudience[],
  positioning?: string | null,
  dna?: BrandDna,
): WorldContent => {
  const axes = [
    { kicker: "QUEM SOU", text: dna?.presentation },
    { kicker: "COMO EU TRABALHO", text: dna?.offer },
    { kicker: "NO QUE EU ACREDITO", text: dna?.belief },
  ]
    .map((a) => ({ ...a, text: a.text ? firstSentence(a.text, 110) : "" }))
    .filter((a) => a.text);

  const brandAxes: Partial<WorldContent> = axes.length
    ? {
        kickers: [...axes.map((a) => a.kicker), "VISÃO 360°", ...base.kickers],
        headlines: [
          ...axes.map((a) => ({ strong: firstSentence(a.text, 58), rest: "" })),
          ...base.headlines,
        ],
        subs: [...axes.map((a) => a.text), ...base.subs],
        typos: [
          ...axes.slice(0, 2).map((a) => ({ lead: `${lower1(a.kicker)}:`, big: firstSentence(a.text, 32), tail: "." })),
          ...base.typos,
        ],
        quotes: [...axes.map((a) => ({ text: `“${a.text}.”` })), ...base.quotes],
        lists: [
          {
            heading: `${brand} em três frases`,
            items: axes.map((a) => a.text),
            closing: dna?.cta || base.sales.ctas[0] || "Chamar no direct",
          },
          ...base.lists,
        ],
      }
    : {};

  if (!audiences.length) {
    const withAxes = { ...base, ...brandAxes };
    return positioning?.trim() ? { ...withAxes, subs: [positioning.trim(), ...withAxes.subs] } : withAxes;
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
    ...brandAxes,
    kickers: brandAxes.kickers ?? ["VISÃO 360°", `PARA ${labels.length} PÚBLICOS`, ...base.kickers],
    headlines: [
      ...(brandAxes.headlines ?? []),
      { strong: brand, rest: ` atende ${labels.slice(0, 3).join(", ").toLowerCase()} no mesmo lugar.` },
      ...base.headlines,
    ],
    subs: [...(positioning?.trim() ? [positioning.trim()] : []), ...(brandAxes.subs ?? base.subs)],
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
          body: a.pains?.[0] ? `${sentence(a.pains[0])} → ${sentence(a.desires?.[0] ?? "caminho claro")}` : a.description ?? "",
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
        kickers: ["BOM SABER", ...content.kickers],
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
  /**
   * Semente do lote. Presente ⇒ motor de variedade linguística ligado (frames
   * retóricos + léxico do registro de voz). Ausente ⇒ acervo fixo (testes).
   */
  variationSeed?: string;
  variationProfile?: VariationProfile;
};

/**
 * Ponto de entrada único do motor: resolve marca + segmento + ângulo em um
 * `WorldContent`. Serve para qualquer cliente, com ou sem nichos cadastrados.
 *
 * O par relacional é decidido AQUI e vale para a arte inteira.
 */
export const buildSegmentContent = ({
  kit,
  base,
  audiences,
  segment,
  angle,
  positioning,
  variationSeed,
  variationProfile,
}: SegmentContentInput): WorldContent => {
  const brand = kit.name.trim() || "Sua marca";
  const variation: CopyVariation | undefined = variationSeed ? { seed: variationSeed, profile: variationProfile } : undefined;
  const dna = buildBrandDna({
    niche: kit.niche,
    tone: kit.tone,
    description: kit.description,
    positioning: positioning ?? kit.positioning,
    briefAnswers: kit.briefAnswers,
  });
  const root = base ?? buildBrandContent(kit, variation, audiences);
  const relationFor = (audience?: BrandAudience) =>
    pickRelation({ audience, dna, brand, angle, seed: variationSeed });

  const finish = (content: WorldContent) => sanitizeContent(applyAngle(content, angle), dna.forbidden);

  if (segment === GLOBAL_SEGMENT) {
    // 360° = modo livre, quase aleatório: qualquer assunto relevante à marca.
    // A seed do lote sorteia — metade fala da marca como um todo (applyGlobal),
    // metade veste o mundo de UM público matriz. Determinístico: mesma seed =
    // mesma arte, então "Nova versão" é que muda o assunto.
    const matrix = matrixAudiences(audiences);
    if (variationSeed && matrix.length) {
      const dice = createRng(`360:${variationSeed}`);
      if (dice.int(100) < 50) {
        const picked = resolveAudience(audiences, matrix[dice.int(matrix.length)].id);
        if (picked) return finish(applyAudience(root, brand, picked, relationFor(picked)));
      }
    }
    return finish(applyGlobal(root, brand, audiences, positioning, dna));
  }
  // Sub-nichos herdam o kit do público matriz e sobrepõem o próprio recorte.
  const audience = resolveAudience(audiences, segment);
  if (!audience) return finish(applyGlobal(root, brand, audiences, positioning, dna));
  return finish(applyAudience(root, brand, audience, relationFor(audience)));
};

/** Relação usada por uma arte — exposta para o filtro de nexo e a legenda. */
export const relationForSegment = ({
  kit,
  audiences,
  segment,
  angle,
  positioning,
  variationSeed,
}: Omit<SegmentContentInput, "base" | "variationProfile">): Relation => {
  const brand = kit.name.trim() || "Sua marca";
  const dna = buildBrandDna({
    niche: kit.niche,
    tone: kit.tone,
    description: kit.description,
    positioning: positioning ?? kit.positioning,
    briefAnswers: kit.briefAnswers,
  });
  const audience = segment === GLOBAL_SEGMENT ? undefined : resolveAudience(audiences, segment);
  return pickRelation({ audience, dna, brand, angle, seed: variationSeed });
};


