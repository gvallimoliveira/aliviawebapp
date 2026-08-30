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
import { GLOBAL_SEGMENT, SLOGAN_SEGMENT, audienceHooks, audienceKeyword, hasSlogan, matrixAudiences, resolveAudience, type BrandAudience, type ContentAngle } from "./audiences";
import { buildBrandDna, isDnaEmpty, offerWords, operationWords, type BrandDna } from "./brandDnaKit";
import { pickRelation, type Relation } from "./relational";
import { applyCharm } from "./charmCopy";
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

/** Primeira letra maiúscula (rótulos curtos dentro da arte). */
const cap = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);


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
  /**
   * SLOGAN DECLARADO no kit de marca (`studio_brands.slogan`). Quando existe, é
   * ele o slogan do lockup e é ele que habilita o sub-nicho "Slogan em
   * destaque". Vazio ⇒ o slogan segue derivado da descrição/nicho.
   */
  slogan?: string | null;
};


/**
 * FRASE DE APOIO DA MARCA (slogan do lockup).
 *
 * REGRA DURA: o campo "tom de voz" é DIRETRIZ de comunicação (como falar), não
 * copy. Antes ele era usado como slogan/subtítulo/depoimento — quando o cliente
 * colava um manual de marca inteiro ali, o manual aparecia dentro da arte.
 * Agora o slogan sai do campo próprio do kit e, na falta dele, da descrição ou
 * do nicho. O tom de voz nunca é renderizado.
 */
const firstSentence = (text: string, max = 90) => {
  const phrase = condensePhrase(text, max);
  return phrase.replace(/\s*[.]\s*$/, "");
};


export const brandSlogan = (kit: BrandKit) => {
  const declared = firstSentence(kit.slogan ?? "");
  if (declared) return declared;
  const fromDescription = firstSentence(kit.description ?? "");
  if (fromDescription) return fromDescription;
  const niche = (kit.niche ?? "").trim();
  return niche ? `${firstSentence(niche, 48)} com presença todo dia.` : "Presença digital todo dia.";
};

/**
 * SUB-NICHO "SLOGAN EM DESTAQUE": a peça é a assinatura da marca. O slogan
 * declarado assume o topo de headlines, tipográficos, kickers e marquee, com o
 * resto do acervo intacto (variedade de formatos continua valendo).
 */
const applySloganFocus = (content: WorldContent, slogan: string, brand: string): WorldContent => {
  const phrase = slogan.trim().replace(/\s*[.;]+$/, "");
  if (phrase.length < 3) return content;
  const words = phrase.split(/\s+/);
  const cut = words.length <= 3 ? 1 : Math.ceil(words.length / 2);
  const strong = words.slice(0, cut).join(" ");
  const rest = words.slice(cut).join(" ");
  /**
   * O slogan entra no TOPO de cada acervo, mas nunca em duplicidade: se a frase
   * (ou o nome da marca) já estava na lista, a cópia antiga sai. Duas entradas
   * idênticas na mesma lista faziam blocos com faixa/sugestões renderizarem
   * itens repetidos e quebravam a identidade dos nós na tela.
   */
  const same = (a: string, b: string) =>
    a.trim().replace(/\s*[.;]+$/, "").toLowerCase() === b.trim().replace(/\s*[.;]+$/, "").toLowerCase();
  return {
    ...content,
    kickers: [brand.toUpperCase(), ...content.kickers.filter((k) => !same(k, brand))],
    headlines: [{ strong, rest }, ...content.headlines.filter((h) => !same(`${h.strong} ${h.rest}`, phrase))],
    typos: [{ lead: brand, big: strong, tail: rest }, ...content.typos.filter((t) => !same(`${t.big} ${t.tail}`, phrase))],
    quotes: [{ text: phrase }, ...content.quotes.filter((q) => !same(q.text, phrase))],
    marquee: [
      [phrase, brand],
      ...content.marquee.map((row) => row.filter((term) => !same(term, phrase))).filter((row) => row.length > 0),
    ],
    subs: [phrase, ...content.subs.filter((s) => !same(s, phrase))],
  };
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
    if (isStale(t) || hasBannedJargon(t) || banned.some((f) => t.includes(f))) return true;
    // Portão de português: frase quebrada ("com precisam postar") nunca vai ao ar.
    // O portão de português vale para FRASES (headline, fecho, tipografia).
    // Blocos compostos (carrossel, passo a passo) são vários textos concatenados
    // e não podem ser lidos como uma frase única.
    const words = raw.trim().split(/\s+/).length;
    return words >= 4 && words <= 22 && !readsWell(raw);
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
  /** Vocabulário de oferta: "produto" só quando a marca vende produto. */
  const offerVoice = offerWords(dna, brand);
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
        ? [{ heading: "No que eu acredito", items: belief, closing: offerVoice.kind === "produto" ? `É assim que ${brand} funciona.` : `É assim que ${brand} atende.` }]
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
  /** Como esta marca chama o que vende (produto / atendimento / programa). */
  const offer = offerWords(dna, brand);
  /**
   * VOCABULÁRIO DA OPERAÇÃO: quem é atendido, como começa, o que se revisa.
   * É o que impede o acervo neutro de falar "consulta/alta/conduta" para uma
   * marca de software, curso ou serviço que não é clínico.
   */
  const op = operationWords(dna, brand);
  /** Assunto de referência: nicho declarado ou 1ª palavra-chave da marca. */
  const subject = firstSentence(words[0] ?? niche, 30);

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
          { strong: `Quem procura ${niche}`, rest: " chega com uma pergunta na cabeça." },
          { strong: `A ${op.firstStep}`, rest: " já mostra o que dá e o que não dá." },
          { strong: `${brand} trabalha com poucos ${op.whoPlural}`, rest: " por mês, e é de propósito." },
          { strong: `Antes de fechar ${niche}`, rest: `, peça para ver o ${op.planWord}.` },
          { strong: "Você sai do primeiro contato", rest: " sabendo o próximo passo." },
        ],
    subs: [
      tone,
      ...(description ? [description] : []),
      ...(composedSubs.length
        ? composedSubs
        : [
            `${brand} entende ${offer.yourCase} antes de propor qualquer coisa.`,
            `O que muda em ${subject} é o quanto se mede antes de decidir.`,
            "Uma decisão bem tomada economiza meses.",
          ]),
    ],
    kinetic: composedKinetic.length
      ? composedKinetic
      : [
          { kicker: "COMO COMEÇA", word: "Escuta", caption: `A ${op.firstStep} serve para entender ${offer.yourCase}.` },
          { kicker: "COMO SEGUE", word: cap(op.planWord), caption: `Cada etapa tem começo, fim e ${op.reviewWord}.` },
          { kicker: "COMO TERMINA", word: cap(offer.closingLabel), caption: "Você sabe quando o trabalho cumpriu o objetivo." },
        ],


    metrics: [
      [
        { value: 1, label: `${op.firstStep} antes de qualquer proposta` },
        { value: 4, label: `semanas até a primeira ${op.reviewWord}` },
        { value: 3, label: offer.stepsLabel },
      ],
      [
        { value: 4, label: "assuntos que a marca comunica" },
        { value: 3, label: "motivos para escolher" },
        { value: 1, label: "pessoa acompanha do início ao fim" },
      ],
    ],
    stats: [
      {
        heading: `Como ${offer.possessive} se organiza`,
        items: [
          { value: "1", label: op.firstStep, note: `para entender ${offer.yourCase} antes de propor` },
          { value: "4", label: `semanas ${op.cycleLabel}`, note: `${cap(op.reviewWord)} marcada desde o início` },
          { value: "3", label: `etapas até a ${offer.closingLabel}`, note: "cada uma com objetivo declarado" },
        ],
      },
      {
        heading: "O que muda no dia a dia",
        items: [
          { value: "-1", label: "combinado esquecido", note: `o ${op.planWord} fica registrado por escrito` },
          { value: "+1", label: `${op.reviewWord} marcada`, note: "ninguém segue no automático" },
          { value: "0", label: "promessa vazia", note: "o que não dá, a gente diz na hora" },
        ],
      },
    ],
    triptychs: [
      {
        heading: `Como ${brand} ${offer.conductPhrase}`,
        panels: [
          { word: "Escuta", line: "Entender antes de propor.", topic: topicAt(0) },
          { word: cap(op.planWord), line: "Cada etapa com começo e fim.", topic: topicAt(1) },
          { word: cap(op.reviewWord), line: "O que não avança, muda.", topic: topicAt(2) },
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
          { lead: "Menos improviso.", big: `Mais ${op.planWord}`, tail: "." },
          { lead: `Em ${niche},`, big: " medir",tail: " vale mais que opinar." },
          { lead: "Refazer custa duas vezes.", big: "Decidir bem", tail: " custa uma." },
          { lead: "O que não avança", big: " muda", tail: ` na ${op.reviewWord}.` },
          { lead: brand, big: " trabalha", tail: ` com poucos ${op.whoPlural} por mês.` },
        ],

    compare: [
      {
        title: `Antes e depois de ter um ${op.planWord} por escrito`,
        before: ["Orientação solta", `Sem data de ${op.reviewWord}`, "Você sem saber onde está", `Cada ${op.encounterWord} recomeça do zero`],
        after: [`${cap(op.planWord)} registrado`, `${cap(op.reviewWord)} marcada`, "Etapa declarada", `Continuidade entre cada ${op.encounterWord}`],
      },
      {
        title: `Como ${brand} encara ${niche}`,
        before: ["Achismo", "Correria", "Improviso"],
        after: ["Leitura do cenário", "Planejamento", "Execução medida"],
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
          { title: cap(op.firstStep), description: "Entendemos o cenário e o que você quer alcançar.", topic: topicAt(0) },
          { title: cap(op.planWord), description: `O caminho que faz sentido para ${offer.yourCase}, por escrito.`, topic: topicAt(1) },
          { title: cap(op.reviewWord), description: "O que avançou fica, o que não avançou muda.", topic: topicAt(2) },
        ],
      },
      {
        kicker: "DA DESCOBERTA À ESCOLHA",
        heading: "Aqui é parceria: somos um time",
        steps: [
          { title: "Ponto de partida", description: "O que está travando hoje.", topic: topicAt(3) },
          { title: "Proposta", description: "O caminho mais curto até o resultado.", topic: topicAt(4) },
          { title: "Acompanhamento", description: "Ajustes com você, não depois de você.", topic: topicAt(5) },
          { title: "Escolha", description: `Você decide com o ${op.planWord} na mão.`, topic: topicAt(6) },
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
        tag: "QUEM CONDUZ",
        title: "Quem começa é quem termina",
        description: `Quem conduz ${offer.yourCase} conhece o histórico e responde por ele do começo ao fim.`,
        topic: topicAt(1),
        headline: "Sempre a mesma pessoa",
      },
      {
        tag: "DIFERENCIAL",
        title: `${cap(op.reviewWord)} com data marcada`,
        description: `A cada ciclo o ${op.planWord} é revisto com o que foi medido, não com impressão.`,
        topic: topicAt(2),
        headline: "Nada roda no automático",
      },
      {
        tag: "CONTINUIDADE",
        title: "Você sai sabendo o próximo passo",
        description: "Cada encontro termina com o que fazer até o próximo — nada fica no ar.",
        topic: topicAt(3),
        headline: "Sem dúvida no caminho",
      },
    ],
    quotes: [
      { text: `“${description || `${brand} explica o ${op.planWord} antes de começar.`}”` },
      { text: "“Finalmente encontrei uma proposta feita para o que eu precisava.”" },
      { text: `“Saí da ${op.firstStep} sabendo o que ia acontecer.”` },
      { text: "“Foi a primeira vez que alguém me disse o que não dava para prometer.”" },
    ],
    marquee: [
      [brand, niche, "escuta", op.planWord, op.reviewWord],
      words.length >= 3 ? words.slice(0, 6) : ["escuta", op.planWord, op.reviewWord, offer.closingLabel],
      [subject, op.planWord, op.reviewWord, brand],
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
        kicker: `${op.who.toUpperCase()} REAL, NOME PROTEGIDO`,
        title: "Ela chegou depois de tentar soluções genéricas",
        beats: [
          "As opções pareciam iguais.",
          "Nenhuma conversava com o que ela realmente precisava.",
          "Na terceira tentativa, encontrou uma proposta feita para seu contexto.",
        ],
        turn: "Foi a primeira vez que alguém explicou o porquê.",
        moral: `Entender o contexto vem antes de propor qualquer ${op.planWord}.`,
      },
      {
        /* Este item já foi uma história de MARKETING ("a marca que falava com
           todo mundo"), tema do próprio Studio, que vazava para marcas de
           serviço/clínica. Agora nasce do vocabulário de operação da marca. */
        kicker: "ACONTECE TODA SEMANA",
        title: `${cap(op.who)} que já tinha tentado de tudo`,
        beats: [
          "Cada tentativa começava do zero.",
          `Ninguém explicou por que aquele ${op.planWord} e não outro.`,
          `A ${op.reviewWord} nunca chegava.`,
        ],
        turn: `Com o cenário lido na ${op.firstStep}, o caminho ficou por escrito.`,
        moral: `Entender antes de propor é o que faz o ${op.planWord} funcionar.`,
      },

    ],
    lists: [
      {
        heading: `4 sinais de que ${offer.yourCase} pede outro caminho`,
        items: [
          "A orientação poderia servir para qualquer pessoa",
          "Ninguém explicou por que esse caminho e não outro",
          `Cada ${op.encounterWord} recomeça do zero`,
          `Não existe data de ${op.reviewWord}`,
        ],
        closing: `${brand} trata os quatro na ${op.firstStep}.`,
      },
      {
        heading: `3 perguntas antes de começar um ${op.planWord}`,
        items: [
          "Isso foi pensado para a minha realidade?",
          "O que muda na minha rotina?",
          "Como vou saber que está funcionando?",
        ],
        closing: "Quando as respostas são claras, decidir fica mais simples.",
      },
    ],
    carousels: [
      {
        kicker: "PASSO A PASSO",
        title: `Como ${brand} ${offer.conductPhrase}`,
        coverSub: `Como ${brand} ${offer.conductPhrase}, passo a passo.`,
        slides: [
          { heading: `1. ${cap(op.firstStep)}`, body: "Entendemos o cenário antes de propor qualquer coisa.", topic: topicAt(0) },
          { heading: `2. ${cap(op.planWord)}`, body: `O caminho de ${offer.yourCase} fica por escrito.`, topic: topicAt(1) },
          { heading: `3. ${cap(op.reviewWord)}`, body: "O que avançou fica; o que não avançou muda.", topic: topicAt(2) },
        ],
        cta: { title: "Quer começar?", sub: `Manda uma mensagem — a ${op.firstStep} é sem compromisso.` },
      },
      {
        /* Antes este carrossel falava de "imitar concorrentes" e "identidade
           própria" — tema de marketing. Agora fala da operação da marca. */
        kicker: "GUIA RÁPIDO",
        title: `3 erros comuns em ${subject}`,
        coverSub: "E como evitar cada um.",
        slides: [
          { heading: "Escolher só pelo preço", body: "O barato costuma cobrar duas vezes.", topic: topicAt(3) },
          { heading: "Começar sem entender", body: `Sem ${op.firstStep}, qualquer ${op.planWord} é chute.`, topic: topicAt(4) },
          { heading: "Seguir receita de outro", body: `O que serviu para um ${op.who} pode atrasar você.`, topic: topicAt(5) },
        ],
        cta: { title: "Evite os três", sub: `Fale com ${brand} antes de fechar qualquer coisa.` },
      },

      /* Repertório temático extra: sem estes, toda geração devolvia o mesmo
         "passo a passo" — o bloco de carrossel escolhe pelo índice do grupo. */
      {
        kicker: "PERGUNTAS ANTES DE DECIDIR",
        title: `3 perguntas antes de escolher em ${subject}`,
        coverSub: "Se a resposta não vier clara, desconfie.",
        slides: [
          { heading: "Isso serve para o meu caso?", body: `Sem ${op.firstStep}, ninguém pode responder isso com honestidade.`, topic: topicAt(1) },
          { heading: "O que está incluído?", body: `Um ${op.planWord} por escrito evita surpresa no meio do caminho.`, topic: topicAt(2) },
          { heading: "Como sei que está funcionando?", body: `Com ${op.reviewWord} marcada, o resultado deixa de ser opinião.`, topic: topicAt(3) },
        ],
        cta: { title: "Pode perguntar tudo", sub: `${brand} responde antes de você decidir.` },
      },
      {
        kicker: "MITO E VERDADE",
        title: `O que se repete sobre ${subject} — e o que se sustenta`,
        coverSub: "Três frases prontas que custam tempo e dinheiro.",
        slides: [
          { heading: "“Depois eu resolvo”", body: "Postergar quase sempre encarece a solução.", topic: topicAt(4) },
          { heading: "“Todo mundo faz igual”", body: `Faz parecido. O que muda é o ${op.planWord} e quem conduz.`, topic: topicAt(5) },
          { heading: "“É só seguir um modelo”", body: `Modelo ajuda a começar; ${offer.yourCase} pede ajuste.`, topic: topicAt(0) },
        ],
        cta: { title: "Vamos pelo caminho real", sub: `Chama ${brand} e a gente ajusta ao seu contexto.` },
      },
      {
        kicker: "POR DENTRO",
        title: `O que acontece em cada ${op.encounterWord}`,
        coverSub: "Nada de mistério: o processo é visível do começo ao fim.",
        slides: [
          { heading: "Antes", body: `Você chega com o problema; a gente escuta antes de propor.`, topic: topicAt(2) },
          { heading: "Durante", body: `O ${op.planWord} é executado e registrado — dá para acompanhar.`, topic: topicAt(3) },
          { heading: "Depois", body: `Na ${op.reviewWord} a gente decide o que continua e o que muda.`, topic: topicAt(4) },
        ],
        cta: { title: "Quer ver de perto?", sub: `A ${op.firstStep} já mostra como trabalhamos.` },
      },
      {
        kicker: "ANTES E DEPOIS",
        title: `O que muda quando ${subject} tem método`,
        coverSub: "Três diferenças que aparecem rápido.",
        slides: [
          { heading: "Sai o improviso", body: `Entra um ${op.planWord} com começo, meio e critério.`, topic: topicAt(5) },
          { heading: "Sai a dúvida", body: "Você passa a saber o próximo passo antes de perguntar.", topic: topicAt(1) },
          { heading: "Fica o resultado", body: `O que funciona é registrado e repetido na ${op.reviewWord}.`, topic: topicAt(2) },
        ],
        cta: { title: "Prefere método ou sorte?", sub: `Fale com ${brand} e comece pelo simples.` },
      },
    ],

    sales: {
      audience: niche,
      proofs: [
        `O ${op.planWord} é montado depois da ${op.firstStep}`,
        `Quem conduz acompanha ${offer.yourCase} do início ao fim`,
        `Proposta por escrito, com data de ${op.reviewWord}`,
      ],
      objections: [
        "Não é mais caro: é previsível.",
        `Não precisa decidir hoje — a ${op.firstStep} é sem compromisso.`,
      ],
      offers: [`${cap(op.firstStep)} sem custo`, "Agenda limitada por mês para manter o padrão"],
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

  /**
   * PROPAGANDA PRÓPRIA DO ALIV.IA STUDIO
   *
   * O motor neutro descrevia o Studio como se fosse consultório ("conduz um
   * caso", "primeira conversa", "alta"). Aqui o passo a passo é o FLUXO REAL da
   * ferramenta: formulário da marca → kit visual → públicos com medo/desejo →
   * lote de artes → ajuste e download. Isolado por `isStudioSelfBrand`, não
   * vaza para marca de cliente.
   */
  if (isStudioSelfBrand(brand)) {
    const selfSteps = [
      {
        title: "1. Formulário da marca",
        description: "Você responde quem atende, como trabalha e no que acredita — é isso que o motor lê.",
        topic: topicAt(0),
      },
      {
        title: "2. Identidade visual",
        description: "Logo, paleta e tipografia entram no kit e passam a assinar toda arte.",
        topic: topicAt(1),
      },
      {
        title: "3. Públicos, medos e desejos",
        description: "Cada público ganha palavra-chave, o medo que trava e o desejo que move.",
        topic: topicAt(2),
      },
      {
        title: "4. Lote de artes",
        description: "O texto sai escrito para aquele público, em 1:1, 4:5 e story.",
        topic: topicAt(3),
      },
      {
        title: "5. Ajuste e publicação",
        description: "Você reescreve o texto na própria arte e baixa o PNG em alta.",
        topic: topicAt(4),
      },
    ];
    generic.journeys = [
      { kicker: "COMO FUNCIONA", heading: `Como ${brand} eleva a sua marca`, steps: selfSteps.slice(0, 4) },
      { kicker: "DO BRIEFING AO POST", heading: "Cinco passos, nenhuma página em branco", steps: selfSteps },
    ];
    generic.carousels = [
      {
        kicker: "PASSO A PASSO",
        title: `Como ${brand} eleva a sua marca`,
        coverSub: "Do formulário da marca ao post pronto para publicar.",
        slides: selfSteps.map((s) => ({ heading: s.title, body: s.description, topic: s.topic })),
        cta: { title: "Comece pelo formulário", sub: "Dez minutos de briefing rendem meses de conteúdo." },
      },
      ...generic.carousels.slice(1),
    ];
    generic.triptychs = [
      {
        heading: "Briefing, público, arte",
        panels: [
          { word: "Briefing", line: "A marca declarada por escrito.", topic: topicAt(0) },
          { word: "Público", line: "Medo e desejo de quem vai ler.", topic: topicAt(2) },
          { word: "Arte", line: "Texto e visual saem juntos.", topic: topicAt(3) },
        ],
      },
      ...generic.triptychs.slice(1),
    ];
    /**
     * Os blocos abaixo vinham do acervo neutro com temática de consultório
     * ("revisão com data marcada", "quem começa é quem termina", "consulta
     * perdida"). No Studio o diferencial é de SOFTWARE: kit de marca, público
     * declarado, lote de artes, edição sem crédito.
     */
    generic.features = [
      {
        tag: "KIT DE MARCA",
        title: "Sua identidade entra uma vez e vale para tudo",
        description: "Cor, tipografia e logo ficam salvos e assinam cada arte gerada depois.",
        topic: topicAt(0),
        headline: "Nada de recomeçar do zero",
      },
      {
        tag: "PÚBLICO DECLARADO",
        title: "O texto sai escrito para quem você quer atingir",
        description: "Cada público tem palavra-chave, medo e desejo — o texto nasce desse par.",
        topic: topicAt(2),
        headline: "Post que chama pelo nome",
      },
      {
        tag: "LOTE PRONTO",
        title: "Uma geração devolve um feed inteiro",
        description: "Posts, carrossel e story saem juntos, em 1:1, 4:5 e vertical.",
        topic: topicAt(3),
        headline: "Semana de conteúdo em minutos",
      },
      {
        tag: "EDIÇÃO LIVRE",
        title: "Você reescreve o texto na própria arte",
        description: "Ajuste palavra por palavra e baixe o PNG em alta sem gastar geração.",
        topic: topicAt(4),
        headline: "A última palavra é sua",
      },
    ];
    generic.compare = [
      {
        title: "Antes e depois de ter um kit de marca",
        before: ["Cada post com uma cor diferente", "Legenda escrita na pressa", "Feed sem assinatura", "Página em branco toda semana"],
        after: ["Paleta e fonte fixas", "Texto escrito para o público", "Logo em toda arte", "Lote pronto para publicar"],
      },
      {
        title: "Modelo genérico x arte da sua marca",
        before: ["Template que todo mundo usa", "Texto que serve para qualquer um"],
        after: ["Layout montado com a sua identidade", "Texto vindo do seu briefing"],
      },
    ];
    generic.stats = [
      {
        heading: "O que uma geração devolve",
        items: [
          { value: "1", label: "briefing da marca", note: "responder uma vez basta" },
          { value: "3", label: "formatos por arte", note: "1:1, 4:5 e vertical" },
          { value: "0", label: "crédito gasto para editar", note: "o ajuste de texto é livre" },
        ],
      },
      {
        heading: "O que muda na sua semana",
        items: [
          { value: "-1", label: "página em branco", note: "o texto já vem escrito" },
          { value: "+1", label: "feed com assinatura", note: "cor, fonte e logo constantes" },
          { value: "0", label: "post genérico", note: "cada arte fala com um público" },
        ],
      },
    ];
    generic.metrics = [
      [
        { value: 1, label: "briefing responde por toda a marca" },
        { value: 3, label: "formatos gerados por arte" },
        { value: 5, label: "passos do formulário ao post" },
      ],
    ];
    generic.lists = [
      {
        heading: "4 sinais de que o seu feed pede um kit de marca",
        items: [
          "Cada post parece de uma empresa diferente",
          "A legenda é escrita minutos antes de publicar",
          "Ninguém reconhece a arte sem ler o @",
          "O conteúdo fala com todo mundo e com ninguém",
        ],
        closing: `${brand} resolve os quatro no formulário da marca.`,
      },
      {
        heading: "3 perguntas antes de publicar",
        items: ["Isso parece com a minha marca?", "Alguém específico vai se reconhecer aqui?", "O próximo passo está claro?"],
        closing: "Quando as três respostas são sim, o post está pronto.",
      },
    ];
    generic.stories = [
      {
        kicker: "ACONTECE TODA SEMANA",
        title: "A marca que travava na hora de postar",
        beats: [
          "A ideia existia, o post não saía.",
          "Cada arte era montada do zero, com cor diferente.",
          "O texto ficava genérico para não errar.",
        ],
        turn: "Com o briefing respondido, o texto passou a nascer do que a marca já dizia.",
        moral: "Marca declarada por escrito rende conteúdo o ano inteiro.",
      },
    ];
    generic.quotes = [
      { text: "“Respondi o formulário uma vez e o feed ganhou cara.”" },
      { text: "“Pela primeira vez o texto do post falava com o meu público.”" },
      { text: "“Editei a frase na própria arte e publiquei em seguida.”" },
    ];
    generic.marquee = [
      [brand, "kit de marca", "público", "lote", "publicar"],
      ["briefing", "paleta", "texto", "arte"],
    ];
  }


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
    ...painNoms.slice(0, 3).map((p) => ({ strong: key, rest: `— ${lower1(p)} não precisa ser a sua rotina.` })),
    ...desireNoms.slice(0, 2).map((d) => ({ strong: key, rest: `— ${lower1(d)} começa com uma decisão.` })),
    ...proof.slice(0, 2).map((p) => ({ strong: `${key} pede método`, rest: `. ${p}.` })),
    { strong: `${hk(1)}`, rest: `: isso foi pensado para a sua realidade.` },
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

  /**
   * REPERTÓRIO DE CARROSSEL POR PÚBLICO
   *
   * Antes existia UM roteiro só ("do medo ao plano"): como o bloco de carrossel
   * escolhe o roteiro pelo índice do grupo, toda geração devolvia a MESMA
   * sequência. Aqui o mesmo material (medos, desejos, provas, gancho) rende
   * arquétipos temáticos diferentes — a seed do lote decide qual entra.
   */
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
    ...(painNoms.length >= 3
      ? [{
          kicker: `${KEY} · SINAIS`,
          title: `3 sinais de que ${lower1(key)} precisa de atenção`,
          coverSub: "Se você reconhecer dois, vale conversar.",
          slides: painNoms.slice(0, 3).map((p, i) => ({
            heading: `Sinal ${i + 1}`,
            body: `${sentence(p)} E isso costuma piorar quando fica sem resposta.`,
            topic: topicAt(i),
          })),
          cta: { title: "Reconheceu algum?", sub: cta },
        }]
      : []),
    ...(painNoms.length >= 2 && desireNoms.length >= 2
      ? [{
          kicker: `${KEY} · MITO E VERDADE`,
          title: `O que se diz sobre ${lower1(key)} — e o que é verdade`,
          coverSub: "Três frases que atrapalham mais do que ajudam.",
          slides: [
            { heading: "Dizem que é normal", body: `${sentence(painNoms[0])} Normal não é o mesmo que aceitável.`, topic: topicAt(1) },
            { heading: "Dizem que passa sozinho", body: `${sentence(painNoms[1])} Sem mudar nada, tende a voltar.`, topic: topicAt(2) },
            { heading: "A verdade", body: `${sentence(desireNoms[0])} — com um caminho definido.`, topic: topicAt(3) },
          ],
          cta: { title: "Quer o caminho certo?", sub: cta },
        }]
      : []),
    ...(proof.length >= 2
      ? [{
          kicker: `${KEY} · POR DENTRO`,
          title: `Como ${brand} trabalha com ${lower1(key)}`,
          coverSub: "O que acontece do primeiro contato ao resultado.",
          slides: proof.slice(0, 3).map((p, i) => ({
            heading: `Etapa ${i + 1}`,
            body: `${p}.`,
            topic: topicAt(i + 2),
          })),
          cta: { title: "Faz sentido para você?", sub: cta },
        }]
      : []),
    ...(desireNoms.length >= 2
      ? [{
          kicker: `${KEY} · O DEPOIS`,
          title: `O que muda quando ${lower1(key)} é levado a sério`,
          coverSub: "Não é promessa: é o que passa a ser possível.",
          slides: [
            ...(painNoms[0] ? [{ heading: "Ponto de partida", body: sentence(painNoms[0]), topic: topicAt(0) }] : []),
            { heading: "Primeira mudança", body: sentence(desireNoms[0]), topic: topicAt(4) },
            { heading: "O que se sustenta", body: `${sentence(desireNoms[1])} E isso continua depois que a gente termina.`, topic: topicAt(5) },
          ],
          cta: { title: "Começa com uma conversa", sub: cta },
        }]
      : []),
    ...(pains.length
      ? [{
          kicker: `${KEY} · PERGUNTAS`,
          title: `3 perguntas de quem convive com ${lower1(key)}`,
          coverSub: "As respostas que quase ninguém dá com clareza.",
          slides: [
            { heading: "Isso tem solução?", body: `${desires[0] ? sentence(desires[0]) : "Tem — quando o plano é feito para o seu caso."}`, topic: topicAt(2) },
            { heading: "Por que voltou?", body: `${sentence(nomPain(0, "o improviso"))} costuma voltar quando nada muda na rotina.`, topic: topicAt(3) },
            { heading: "Quanto tempo leva?", body: proof[0] ? `${proof[0]}.` : "Depende do ponto de partida — e a gente diz isso na primeira conversa.", topic: topicAt(4) },
          ],
          cta: { title: "Pergunte o que quiser", sub: cta },
        }]
      : []),
  ];


  return {
    ...base,
    label: `${brand} · ${who}`,
    kickers: [KEY, `PARA ${KEY}`, `${KEY} · ${brand.toUpperCase()}`, ...tail(base.kickers)],
    // Cauda genérica limitada: comunicação dirigida não pode ser diluída.
    headlines: [...headlines, ...tail(base.headlines)].slice(0, 12),
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
    /* Buscas simuladas: o que ESTE público realmente digitaria — queixa,
       diagnóstico ou desejo — nunca frase institucional da marca. */
    searchQueries: [key, ...pains, ...desires, ...(base.searchQueries ?? [])]
      .map((q) => strip(q))
      .filter(Boolean),
    carousels: [...carousels, ...tail(base.carousels)],
    closings: [
      { title: `${key}: o próximo passo é seu`, sub: desires[0] ? sentence(desires[0]) : `Fale com ${brand} hoje.`, cta },
      { title: hk(6), sub: proof[0] ?? `${brand} tem um caminho claro para quem está nessa situação.`, cta },
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
  const offer = dna ? offerWords(dna, brand) : offerWords({ forbidden: [] }, brand);
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
    searchQueries: matrix.flatMap((a) => [a.label, ...(a.pains ?? []), ...(a.desires ?? [])]),
    lists: [
      {
        heading: `Para quem ${offer.possessive} foi feito`,
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
        coverSub: `Um só padrão de cuidado, ${labels.length} públicos.`,
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
 *
 * ESCRITA CHARMOSA: nos ângulos de venda, dor e desejo o acervo passa por
 * `applyCharm` (empatia estruturada, foco no "você", ritmo com remate seco,
 * antecipação e convite seguro). "Informar" fica de fora de propósito.
 */
const applyAngle = (content: WorldContent, angle: ContentAngle, relation?: Relation, brand?: string): WorldContent => {
  const rotate = <T,>(list: T[], n: number): T[] =>
    list.length > 1 ? [...list.slice(n % list.length), ...list.slice(0, n % list.length)] : list;

  switch (angle) {
    case "dor":
      return applyCharm({ ...content, kickers: ["ISSO É COM VOCÊ", ...content.kickers] }, angle, relation, brand);
    case "desejo":
      return applyCharm(
        {
          ...content,
          kickers: ["IMAGINA ASSIM", ...content.kickers],
          headlines: rotate(content.headlines, 1),
          kinetic: rotate(content.kinetic, 1),
        },
        angle,
        relation,
        brand,
      );
    case "venda":
      return applyCharm(
        {
          ...content,
          kickers: ["AGENDA ABERTA", ...content.kickers],
          headlines: rotate(content.headlines, 2),
          closings: rotate(content.closings, 0),
          sales: { ...content.sales, ctas: content.sales.ctas },
        },
        angle,
        relation,
        brand,
      );
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
  /**
   * COBERTURA DOS NICHOS (só usada na Visão 360°): peso por id de público —
   * 1 = ainda não apareceu, valores menores = usado recentemente. É o que
   * distribui a atenção criativa entre todos os públicos e sub-nichos em vez de
   * concentrar sempre nos mesmos dois ou três.
   */
  segmentWeights?: Record<string, number>;
};

/**
 * Sorteio ponderado determinístico: mesma seed + mesmos pesos = mesmo público.
 */
const weightedPick = <T extends { id: string }>(
  list: T[],
  weights: Record<string, number> | undefined,
  seed: string,
): T | undefined => {
  if (list.length === 0) return undefined;
  const scored = list.map((item) => ({ item, weight: Math.max(0.05, weights?.[item.id] ?? 1) }));
  const total = scored.reduce((sum, s) => sum + s.weight, 0);
  const dice = createRng(seed).int(100_000) / 100_000;
  let cursor = dice * total;
  for (const s of scored) {
    cursor -= s.weight;
    if (cursor <= 0) return s.item;
  }
  return scored[scored.length - 1].item;
};

/**
 * Público que a Visão 360° veste neste lote — exposto para que a interface possa
 * registrar a cobertura (memória de nichos) e para os testes do motor.
 * `null` = lote fala da marca como um todo (assunto livre).
 */
export const pickGlobalAudience = ({
  audiences,
  variationSeed,
  segmentWeights,
}: {
  audiences: BrandAudience[];
  variationSeed?: string;
  segmentWeights?: Record<string, number>;
}): BrandAudience | null => {
  /**
   * Todos os públicos entram no sorteio — matriz E sub-nichos. Antes só os
   * matriz entravam, então sub-nicho cadastrado nunca ganhava arte no 360°.
   */
  const pool = audiences.filter((a) => a.id);
  if (!variationSeed || pool.length === 0) return null;
  const dice = createRng(`360:${variationSeed}`);
  // 2 em 3 lotes falam de um público; o restante fala da marca como um todo.
  if (dice.int(100) >= 66) return null;
  const chosen = weightedPick(pool, segmentWeights, `360:pick:${variationSeed}`);
  return chosen ? (resolveAudience(audiences, chosen.id) ?? null) : null;
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

  const finish = (content: WorldContent, relation?: Relation) => {
    const done = sanitizeContent(applyAngle(content, angle, relation, brand), dna.forbidden);
    /* Cauda genérica limitada a 12 títulos: comunicação dirigida vem primeiro e
       não pode ser diluída. Para não perder variedade entre lotes, a sobra não
       é descartada sempre igual — a seed sorteia quais títulos da cauda entram. */
    const head = done.headlines.slice(0, 8);
    const rest = done.headlines.slice(8);
    const dice = createRng(`hl:${variationSeed ?? "base"}:${segment}:${angle}`);
    const picked = dice.shuffle(rest).slice(0, Math.max(0, 12 - head.length));
    /**
     * VARIAÇÃO TEMÁTICA DO CARROSSEL
     *
     * O bloco de carrossel escolhe o roteiro por índice de grupo (quase sempre
     * 0), então sem rotação o lote inteiro repetia o primeiro roteiro. A seed
     * do lote rotaciona o repertório: mesma seed = mesmo carrossel (edição
     * continua determinística), seed nova = tema novo.
     */
    const scripts = done.carousels ?? [];
    const spin = scripts.length > 1
      ? createRng(`carousel:${variationSeed ?? "base"}:${segment}:${angle}`).int(scripts.length)
      : 0;
    const carousels = scripts.length > 1
      ? [...scripts.slice(spin), ...scripts.slice(0, spin)]
      : scripts;
    return { ...done, headlines: [...head, ...picked], carousels };

  };

  if (segment === GLOBAL_SEGMENT) {
    /**
     * 360° = modo livre: qualquer assunto relevante à marca. A maior parte dos
     * lotes veste o mundo de UM público (matriz OU sub-nicho), escolhido com
     * peso pela memória de cobertura — nicho recém-usado cede a vez. O restante
     * fala da marca como um todo. Determinístico: mesma seed = mesma arte.
     */
    const picked = pickGlobalAudience({ audiences, variationSeed, segmentWeights });
    if (picked) {
      const relation = relationFor(picked);
      return finish(applyAudience(root, brand, picked, relation), relation);
    }
    return finish(applyGlobal(root, brand, audiences, positioning, dna), relationFor());
  }

  // Sub-nichos herdam o kit do público matriz e sobrepõem o próprio recorte.
  const audience = resolveAudience(audiences, segment);
  if (!audience) return finish(applyGlobal(root, brand, audiences, positioning, dna), relationFor());
  const relation = relationFor(audience);
  const built = finish(applyAudience(root, brand, audience, relation), relation);
  /**
   * O sub-nicho de slogan é o único caso em que uma frase entra JÁ PRONTA na
   * arte: ela é a assinatura declarada da marca, então passa depois dos filtros
   * para não ser reescrita nem descartada.
   */
  if (segment === SLOGAN_SEGMENT && hasSlogan(kit.slogan)) {
    return applySloganFocus(built, kit.slogan as string, brand);
  }
  return built;

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


