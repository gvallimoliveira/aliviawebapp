import { WORLDS, isWorldId, type WorldContent } from "@/pages/studio/content";
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
import { composeHooks } from "@/pages/studio/hooks";
import { curatedHooksFor } from "@/pages/studio/hookLibrary";
import { applyHookPrefs } from "@/pages/studio/hookStore";
import { hasBannedJargon, isStale, isStudioSelfBrand, STUDIO_SELF_KEYWORDS } from "@/pages/studio/persuasion";
import { lowerInitial, nominal, nominalList, readsWell, sentence } from "@/pages/studio/grammar";
import { proofread } from "@/pages/studio/agreement";
import { GLOBAL_SEGMENT, SLOGAN_SEGMENT, audienceHooks, audienceKeyword, editorialNoun, hasSlogan, highlightTermsFor, sloganList, matrixAudiences, resolveAudience, type BrandAudience, type ContentAngle } from "./audiences";
import { buildBrandDna, isDnaEmpty, offerWords, operationWords, type BrandDna } from "./brandDnaKit";
import { pickRelation, type Relation } from "./relational";
import { applyCharm } from "./charmCopy";
import { applyTerminology, patientVoiceFor } from "@/pages/studio/terminology";
import { marketStatsFor } from "@/pages/studio/marketFacts";

import { condensePhrase } from "./textFit";
import { editorialAudience, removeLeadingHighlightEcho, sentenceLead, shortKicker } from "@/pages/studio/typographyGuards";
import { intensityFor, type VariationProfile } from "@/pages/studio/variation";
import { applyFormatInsights, audienceRootId, readFormatInsights, scopedFormatInsights } from "./formatInsights";
import { enforceAudienceScope } from "./audienceScope";
import { finalizeBrandVoice, isVeterinaryContext } from "./veterinaryVoice";
import { buildEditorialProgression, frameEditorialLoss } from "./narrativeArc";
import { distinctListItems } from "@/pages/studio/listCoherence";
import { alignCtasToAudience, alignTitlesToAudience } from "./ctaAudience";
import { isAliviaCoreBrand as isAliviaCtaBrand } from "./aliviaCoreCharm";
import { commercialAudienceHooks, prioritizeCommercialAudience } from "./commercialPriority";




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
  /**
   * INSIGHTS DE FORMATOS (`studio_brands.format_insights`): ideias de formato já
   * com o diálogo pronto, uma por linha (`título | fala | fala | fecho`). Entram
   * literalmente no topo dos acervos — ver `formatInsights.ts`.
   */
  formatInsights?: string | null;
  /** Matrizes estruturadas de linguagem e encadeamento narrativo. */
  keywordMatrix?: unknown;
  reasoningMatrix?: unknown;
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
  // Slogans são independentes (um por linha): o lockup usa sempre o primeiro.
  const declared = firstSentence(sloganList(kit.slogan)[0] ?? "");
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
  const clinical = /fisioter|cl[ií]nic|paciente|reabilita|terapia/i.test(
    [kit.niche, kit.description, dna?.presentation, dna?.offer].filter(Boolean).join(" "),
  );
  return {
    brand,
    niche,
    audience: audience?.label.trim() || editorialAudience(dna?.primaryAudience, { clinical, fallback: niche }),
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
  const preserveEditorialCarousel = (item: unknown) =>
    typeof item === "object" &&
    item !== null &&
    /^(editorial|differential)-/.test(String((item as { id?: string }).id ?? ""));
  const purge = <T,>(list: T[]): T[] => {
    const kept = list.filter((item) => preserveEditorialCarousel(item) || !bad(textOf(item)));
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
  sales.audience = shortKicker(content.sales.audience, 40) || content.sales.audience;
  sales.objections = ((sales.objections as string[] | undefined) ?? []).map((item) => firstSentence(item, 96));
  out.sales = sales;

  /**
   * ACABAMENTO TIPOGRÁFICO GLOBAL (ver `@/pages/studio/typographyGuards`)
   *
   * Vale para TODAS as marcas e todos os modelos, num único ponto do motor:
   * - chamada de público curta e de um público por vez (kickers e tags);
   * - trecho de rótulo em caixa alta entra nas frases em caixa de frase
   *   ("COMO EU TRABALHO" → "Como eu trabalho", nunca "cOMO EU TRABALHO").
   */
  const kickers = content.kickers.map((k) => shortKicker(k, 30)).filter(Boolean);
  out.kickers = kickers.length
    ? kickers.filter((k, i, all) => all.indexOf(k) === i)
    : content.kickers;
  out.features = (out.features as WorldContent["features"]).map((f) => ({
    ...f,
    tag: shortKicker(f.tag, 30) || f.tag,
  }));
  out.typos = (out.typos as WorldContent["typos"]).map((t) => ({
    ...t,
    lead: sentenceLead(t.lead),
    tail: removeLeadingHighlightEcho(t.big, t.tail),
  }));
  out.marquee = (out.marquee as WorldContent["marquee"]).map((row) =>
    row.map((item) => shortKicker(item, 40) || item),
  );

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
  const who = editorialAudience(dna.primaryAudience, {
    clinical: /fisioter|cl[ií]nic|paciente|reabilita|terapia/i.test(
      [niche, dna.description, dna.presentation, dna.offer].filter(Boolean).join(" "),
    ),
    fallback: niche,
  });
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
    /**
     * CARTAZES DA MARCA (bloco de foto de fundo, feature, pinup).
     *
     * Antes este slot era o ÚNICO que não nascia do manual: ficavam sempre os
     * mesmos 4 cartazes neutros ("sempre a mesma pessoa", "nada roda no
     * automático"), e o bloco de foto de fundo — que só lê `features` —
     * repetia as mesmas 3 frases em todo lote. Agora cada eixo do briefing
     * (quem sou, como trabalho, no que acredito, dor, desejo, convite) rende
     * um cartaz próprio, com frase de cartaz curta e apoio explicando.
     */
    features: [
      ...(presentation
        ? [{
            tag: "QUEM CONDUZ",
            title: firstSentence(presentation, 62),
            description: offer[0] ?? belief[0] ?? presentation,
            topic: topicAt(0),
            headline: condensePhrase(presentation, 36),
          }]
        : []),
      ...offer.map((o, i) => ({
        tag: "COMO EU TRABALHO",
        title: firstSentence(o, 62),
        description: belief[i] ?? (presentation || o),
        topic: topicAt(i + 1),
        headline: condensePhrase(o, 36),
      })),
      ...belief.map((b, i) => ({
        tag: "NO QUE EU ACREDITO",
        title: firstSentence(b, 62),
        description: offer[i] ?? (presentation || b),
        topic: topicAt(i + 2),
        headline: condensePhrase(b, 36),
      })),
      ...pain.map((p, i) => ({
        tag: "SE ISSO É COM VOCÊ",
        title: firstSentence(p, 62),
        description: desire[i] ?? offer[0] ?? `${brand} começa entendendo esse ponto.`,
        topic: topicAt(i + 3),
        headline: condensePhrase(p, 36),
      })),
      ...desire.map((d, i) => ({
        tag: "O QUE PASSA A SER POSSÍVEL",
        title: firstSentence(d, 62),
        description: offer[i] ?? (presentation || d),
        topic: topicAt(i + 4),
        headline: condensePhrase(d, 36),
      })),
      ...(cta
        ? [{
            tag: "PRÓXIMO PASSO",
            title: cta,
            description: desire[0] ?? (presentation || `Fale com ${brand}.`),
            topic: topicAt(5),
            headline: condensePhrase(cta, 36),
          }]
        : []),
    ].filter((f) => f.title.length >= 8 && Boolean(f.description)),
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
  // O acervo-base representa a MARCA, não a soma dos públicos. Cada público é
  // aplicado depois, como uma camada isolada, em `applyAudience`.
  const ing = ingredientsOf(kit, brand, niche, [], undefined, dna);

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
      ...marketStatsFor(brand),
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
      {
        tag: "COMO COMEÇA",
        title: `A ${op.firstStep} vem antes da proposta`,
        description: `Primeiro entendemos ${offer.yourCase}; só depois existe um ${op.planWord}.`,
        topic: topicAt(4),
        headline: "Entender vem antes",
      },
      {
        tag: "METODOLOGIA",
        title: `Cada etapa tem objetivo declarado`,
        description: `Você sabe o que está sendo feito agora, o que vem depois e para que serve.`,
        topic: topicAt(5),
        headline: "Etapa por etapa, no claro",
      },
      {
        tag: "MEDIDA",
        title: "Decisão com dado, não com impressão",
        description: `Na ${op.reviewWord} comparamos o que foi medido no início com o que mudou.`,
        topic: topicAt(6),
        headline: "O que muda, a gente mede",
      },
      {
        tag: "REGISTRO",
        title: `O ${op.planWord} fica por escrito`,
        description: "Combinado registrado é combinado que ninguém precisa lembrar de cor.",
        topic: topicAt(0),
        headline: "Nada fica só na conversa",
      },
      {
        tag: "LIMITE",
        title: "O que não dá, a gente diz na hora",
        description: `${brand} prefere ajustar a expectativa no começo a decepcionar no fim.`,
        topic: topicAt(1),
        headline: "Sem promessa que não cabe",
      },
      {
        tag: "RITMO",
        title: `Poucos ${op.whoPlural} por vez, de propósito`,
        description: "Agenda enxuta é o que permite manter o padrão de atenção.",
        topic: topicAt(2),
        headline: "Padrão antes de volume",
      },
      {
        tag: "CONVITE",
        title: `Conte o seu cenário para ${brand}`,
        description: `A ${op.firstStep} já mostra se faz sentido seguir juntos.`,
        topic: topicAt(3),
        headline: "Comece por uma conversa",
      },
      {
        tag: "DECISÃO",
        title: `Peça para ver o ${op.planWord} antes de fechar`,
        description: "Quem explica o caminho antes não tem nada a esconder depois.",
        topic: topicAt(4),
        headline: "Pergunte antes de decidir",
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
   * acervo neutro. Um único item real continua valendo mais do que uma frase
   * genérica: o diretor pode variar a forma sem trocar o assunto declarado.
   * É essa troca que tira do ar os vícios herdados do Aliv.iA Fisio.
   */
  const prefer = <T,>(fromDna: T[] | undefined, fallback: T[]): T[] => {
    const dnaItems = (fromDna ?? []).filter(Boolean);
    return dnaItems.length ? dnaItems : fallback;
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
    features: prefer(dnaPools.features, generic.features),
    compare: prefer(dnaPools.compare, generic.compare),

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

  /**
   * BIBLIOTECA DE GANCHOS (bloco `hook` / modelo "Ganchos").
   *
   * Acervo curado da marca na frente (quando existe) + o MECANISMO aplicado aos
   * ingredientes reais do kit. Nenhum gancho é inventado: frame sem insumo é
   * descartado em `composeHooks`.
   */
  merged.hooks = applyHookPrefs(
    brand,
    [
      ...curatedHooksFor(brand),
      ...(audiences.length ? commercialAudienceHooks(audiences, dna) : composeHooks({
        brand,
        niche,
        audience: editorialAudience(dna.primaryAudience, {
          clinical: /fisioter|cl[ií]nic|paciente|reabilita|terapia/i.test(
            [niche, dna.description, dna.presentation, dna.offer].filter(Boolean).join(" "),
          ),
          fallback: audiences[0]?.label || niche,
        }),
        pain: dna.pain || audiences[0]?.pains?.[0],
        desire: dna.desire || audiences[0]?.desires?.[0],
        offer: dna.offer,
        belief: dna.belief || dna.positioning,
        keyword: words[0],
        cta: dna.cta,
      })),
    ].filter((hook, i, all) => all.findIndex((h) => h.strong === hook.strong) === i),
  );


  return sanitizeContent(merged, dna.forbidden);
};


/* ------------------------------------------------------------------------- */
/* SEGMENTAÇÃO: nicho específico x visão global 360°                          */
/* ------------------------------------------------------------------------- */

/** Minúscula só na primeira letra, preservando siglas e números (60+). */
const lower1 = lowerInitial;
const strip = (text: string) => text.trim().replace(/\s*[.!?]+$/, "");

/** Uma citação defende uma ideia; listas de medos separadas por ponto e vírgula
 * viram frases independentes em vez de um parágrafo espremido na arte. */
const quoteThemes = (values: string[]): string[] =>
  values
    .flatMap((value) => value.split(/\s*(?:;|\n|[•·])\s*/))
    .map(strip)
    .filter((value) => value.length >= 8);

const painQuote = (theme: string): string => {
  const clean = strip(theme);
  if (/^(?:conviver|viver|lidar)\s+com\b/i.test(clean)) return `“Achei que ${lower1(clean)} fosse para sempre.”`;
  if (/^temer\s+que\b/i.test(clean)) return `“${cap(clean)} não precisa fazer parte da rotina.”`;
  if (/^n[aã]o\s+conseguir\b/i.test(clean)) return `“${cap(clean)} não precisa ser o fim da investigação.”`;
  return `“${sentence(clean)}”`;
};

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
  // O nome do recorte de slogan organiza o seletor, mas não é texto da arte.
  const who = audience.id === SLOGAN_SEGMENT ? brand : audience.label.trim();
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
  const objections = lead(audience.objections ?? [], relation?.route?.objection);
  const cta = relation?.cta || audience.cta?.trim() || "Falar com a gente";
  const desc = audience.description?.trim();
  /**
   * Comunicação dirigida: sub-nicho — ou qualquer público com acervo próprio —
   * reduz o acervo neutro a uma cauda curta, para não diluir a mensagem.
   */
  // Diferenciais editoriais têm repertório canônico completo. Uma cauda do
  // acervo geral pode introduzir outro recurso na arte; por isso, só públicos
  // comuns recebem uma pequena sobra genérica para variedade.
  const tail = <T,>(list: T[]) => audience.editorialGroup ? [] : list.slice(0, 1);

  /**
   * DIFERENCIAL É PRODUTO, NÃO "PÚBLICO".
   *
   * A moldura genérica de público transformava uma funcionalidade em frases
   * vagas como "feito para..." ou "pede método". Para um diferencial, todos os
   * formatos partem da mesma sequência: o que é → como funciona → benefício →
   * custo cotidiano de continuar sem ele. Nenhum acervo da marca entra aqui.
   */
  if (audience.editorialGroup) {
    /**
     * Vale para QUALQUER marca: termos de destaque do tema (nunca adjetivo
     * solto) e o substantivo do grupo editorial da própria marca.
     */
    const terms = highlightTermsFor(audience);
    const noun = editorialNoun(audience);
    const rawMechanisms = proof.length ? proof : [desc ?? key];
    const rawBenefits = desires.length ? desires : [cta];
    const rawLosses = (audience.stakes ?? []).map(strip).filter(Boolean);
    const scenes = (audience.scenes ?? []).map(strip).filter(Boolean);
    const progression = buildEditorialProgression({
      definition: desc,
      mechanisms: rawMechanisms,
      benefits: rawBenefits,
      losses: rawLosses,
      pains,
      scenes,
      cta,
      fallback: key,
    });
    const whatItIs = progression.definition || `${key} é ${noun === "produto" ? "um produto" : `uma ${noun}`} de ${brand}.`;
    const mechanisms = [progression.mechanism, ...rawMechanisms.filter((item) => item !== progression.mechanism)].filter(Boolean);
    const benefits = [progression.benefit, ...rawBenefits.filter((item) => item !== progression.benefit)].filter(Boolean);
    const losses = [progression.loss, ...rawLosses.filter((item) => item !== progression.loss)].filter(Boolean);
    const benefitAt = (index: number) => benefits[index % benefits.length];
    const lossAt = (index: number) => losses[index % Math.max(1, losses.length)] || pains[index % Math.max(1, pains.length)] || whatItIs;
    const mechanismAt = (index: number) => mechanisms[index % mechanisms.length];
    const sceneAt = (index: number) => scenes[index % Math.max(1, scenes.length)] || pains[index % Math.max(1, pains.length)] || whatItIs;
    const termAt = (index: number) => terms[index % terms.length];
    /**
     * Começo → meio → fim dentro do mesmo assunto. Os títulos dos slides citam o
     * próprio tema: rótulo solto ("O que é", "Benefício") não vira arte.
     */
    const carouselSlides = [
      { heading: condensePhrase(key, 34), body: sentence(whatItIs) },
      /**
       * Cada etapa entra com abertura própria: sem isso, mecanismo e definição
       * podem coincidir e o carrossel perde um slide na deduplicação.
       */
      { heading: `${key}: como funciona`, body: `Na prática, ${lower1(mechanismAt(0))}.` },
      { heading: `${key}: ganho na rotina`, body: `Com isso, ${lower1(benefitAt(0))}.` },
      { heading: `${key}: o que se perde`, body: frameEditorialLoss(lossAt(0)) },
    ];

    return {
      ...base,
      label: `${brand} · ${who}`,
      kickers: [KEY, `${KEY} · COMO FUNCIONA`, `${KEY} · NO DIA A DIA`],
      headlines: [
        { strong: key, rest: `— ${lower1(whatItIs)}` },
        ...mechanisms.slice(0, 3).map((item) => ({ strong: `${key} na prática`, rest: `— ${lower1(item)}.` })),
        ...benefits.slice(0, 2).map((item) => ({ strong: key, rest: `— ${lower1(item)}.` })),
        ...losses.slice(0, 2).map((item) => ({ strong: `${key}: o custo na rotina`, rest: `— ${lower1(item)}.` })),
      ],
      subs: [
        whatItIs,
        ...mechanisms.map((item, index) => `${sentence(item)} Com isso, ${lower1(benefitAt(index))}.`),
        ...losses.map((item) => frameEditorialLoss(item)),
      ],
      typos: [
        { lead: `${key}:`, big: condensePhrase(termAt(0), 24), tail: sentence(mechanismAt(0)) },
        { lead: "Na rotina,", big: condensePhrase(termAt(1), 24), tail: sentence(benefitAt(0)) },
        { lead: "O custo precisa ficar visível:", big: condensePhrase(termAt(2), 24), tail: sentence(lossAt(0)) },
      ],
      kinetic: benefits.slice(0, 3).map((item, index) => ({
        kicker: KEY,
        word: condensePhrase(termAt(index), 20),
        caption: `${sentence(mechanismAt(index))} Com isso, ${lower1(item)}.`,
      })),
      metrics: [],
      stats: [],
      triptychs: [],
      compare: [{
        title: `${key}: com e sem`,
        before: losses.length ? losses : pains,
        after: benefits,
      }],
      journeys: [],
      features: [
        { tag: KEY, title: sentence(whatItIs), description: `É assim que ${lower1(key)} entra na rotina.`, headline: condensePhrase(key, 36), topic: topicAt(0) },
        ...mechanisms.slice(0, 3).map((item, index) => ({ tag: `${KEY} · COMO FUNCIONA`, title: sentence(item), description: `Esse mecanismo permite ${lower1(benefitAt(index))}.`, headline: condensePhrase(item, 36), topic: topicAt(index + 1) })),
        ...losses.slice(0, 2).map((item, index) => ({ tag: `${KEY} · CUSTO NA ROTINA`, title: sentence(item), description: `O que se perde é concreto. Com ${lower1(key)}, passa a ser possível ${lower1(benefitAt(index))}.`, headline: condensePhrase(item, 36), topic: topicAt(index + 4) })),
      ],
      quotes: benefits.slice(0, 3).map((item, index) => ({ text: `“${sentence(item)} É esse o valor prático de ${lower1(mechanismAt(index))}.”` })),
      marquee: [[
        termAt(0),
        termAt(1),
        condensePhrase(mechanismAt(0), 54),
        condensePhrase(benefitAt(0), 54),
        condensePhrase(lossAt(0), 54),
      ]],
      closings: benefits.slice(0, 3).map((item, index) => ({
        title: sentence(item),
        sub: frameEditorialLoss(lossAt(index)),
        cta,
      })),
      stories: scenes.slice(0, 3).map((item, index) => ({
        kicker: `${KEY} · ROTINA REAL`,
        title: sentence(item),
        beats: [sentence(item), sentence(mechanismAt(index))],
        turn: `Com ${lower1(key)}, passa a ser possível ${lower1(benefitAt(index))}.`,
        moral: frameEditorialLoss(lossAt(index)),
      })),
      lists: [{ heading: `${key}: o que muda na prática`, items: carouselSlides.map((item) => sentence(item.body)), closing: cta }],
      carousels: [{
        id: `editorial-${audience.id}`,
        kicker: KEY,
        title: `${key}: o que muda na rotina`,
        coverSub: sentence(audience.hook || whatItIs),
        slides: carouselSlides,
        cta: { title: sentence(benefitAt(0)), sub: cta },
      }],
      hooks: [],
      searchQueries: [key, ...mechanisms, ...benefits],
      sales: {
        ...base.sales,
        audience: who,
        proofs: mechanisms.map((item, index) => `${sentence(item)} Benefício: ${lower1(benefitAt(index))}.`),
        objections,
        offers: [],
        ctas: [cta],
        hashtags: [key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()],
      },
    };
  }


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
   * HISTÓRIAS DO PÚBLICO: cada uma usa uma tensão diferente do kit e fecha com
   * uma prova/desejo. Assim o modelo narrativo não recai sempre no mesmo caso
   * genérico, mesmo quando o público selecionado permanece igual.
   */
  const stories = [
    ...pains.slice(0, 3).map((pain, i) => ({
      kicker: `${KEY} · HISTÓRIA REAL`,
      title: i === 0 ? `${cap(who)} que já tinha tentado de tudo` : `${cap(who)} diante de ${lower1(nomPain(i, pain))}`,
      beats: [
        sentence(pain),
        i === 0 ? "As tentativas anteriores tratavam o sintoma sem ler o contexto." : "A rotina foi se adaptando ao problema, pouco a pouco.",
        proof[i % Math.max(1, proof.length)] ? sentence(proof[i % proof.length]) : `Foi quando ${brand} começou pelo cenário inteiro.`,
      ],
      turn: desires[i % Math.max(1, desires.length)]
        ? `O caminho passou a mirar ${lower1(desires[i % desires.length])}.`
        : "Pela primeira vez, cada escolha ganhou um porquê.",
      moral: proof[(i + 1) % Math.max(1, proof.length)]
        ? `${sentence(proof[(i + 1) % proof.length])} Contexto antes de conduta.`
        : `Para ${lower1(key)}, entender o contexto vem antes de propor o caminho.`,
    })),
    ...desires.slice(0, 2).map((desire, i) => ({
      kicker: `${KEY} · O QUE MUDOU`,
      title: `O dia em que ${lower1(desire)} deixou de parecer distante`,
      beats: [
        pains[i] ? sentence(pains[i]) : `O ponto de partida parecia não ter saída.`,
        "Em vez de repetir uma receita, o caso foi lido etapa por etapa.",
        proof[i] ? sentence(proof[i]) : "O próximo passo ficou claro e possível de acompanhar.",
      ],
      turn: `A mudança começou quando o plano passou a caber na vida real.`,
      moral: `${sentence(desire)} Não por promessa — por direção.`,
    })),
    ...(proof.length >= 2
      ? [{
          kicker: `${KEY} · BASTIDORES`,
          title: "A diferença apareceu antes do resultado final",
          beats: [sentence(pains[0] ?? desc ?? key), sentence(proof[0]), sentence(proof[1])],
          turn: "O valor não estava em fazer mais. Estava em decidir melhor.",
          moral: `${brand}: cada etapa precisa fazer sentido para quem vive o caso.`,
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
          id: "audience-fear-to-plan",
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
          id: "audience-signs",
          kicker: `${KEY} · SINAIS`,
          title: `3 sinais de que ${lower1(key)} precisa de atenção`,
          coverSub: "Se você reconhecer dois, vale conversar.",
          /**
           * Cada sinal fecha com uma leitura PRÓPRIA. Antes todos os slides
           * terminavam com a mesma frase ("E isso costuma piorar quando fica
           * sem resposta"), o que soava repetido e frequentemente fora do
           * assunto do sinal.
           */
          slides: painNoms.slice(0, 3).map((p, i) => ({
            heading: `Sinal ${i + 1}`,
            body: [
              `${sentence(p)} Isso não é frescura: é um sinal de que algo precisa ser avaliado.`,
              `${sentence(p)} Quando isso se repete na semana, deixou de ser um episódio isolado.`,
              `${sentence(p)} Aqui o ponto não é aguentar mais: é entender o que está por trás.`,
            ][i] ?? sentence(p),
            topic: topicAt(i),
          })),
          cta: { title: "Reconheceu algum?", sub: cta },
        }]
      : []),
    ...(painNoms.length >= 2 && desireNoms.length >= 2
      ? [{
          id: "audience-myth-truth",
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
          id: "audience-process",
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
          id: "audience-after",
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
          id: "audience-questions",
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

    /**
     * QUATRO ROTEIROS DE RACIOCÍNIO CONTINUADO (fidelidade capa → miolo → CTA).
     *
     * Os roteiros acima são temáticos; estes quatro carregam UMA tese da capa e
     * a desdobram slide a slide, cada slide retomando explicitamente a tese.
     * Servem qualquer público de qualquer marca porque nascem do próprio kit
     * (medos, desejos, provas, gancho, CTA).
     */
    ...(painNoms.length >= 1
      ? [{
          id: "audience-thesis-decisions",
          kicker: `${KEY} · DECISÕES`,
          title: `${key}: o resultado vem de 3 decisões, não de sorte`,
          coverSub: `A tese deste carrossel: ${lower1(nomPain(0, "o improviso"))} não se resolve por tentativa.`,
          slides: [
            {
              heading: "Decisão 1 — entender antes de agir",
              body: `${sentence(pains[0] ?? key)} Sem ler o cenário inteiro, qualquer conduta é aposta.`,
              topic: topicAt(0),
            },
            {
              heading: "Decisão 2 — escolher o caminho certo",
              body: proof[0] ? `${proof[0]}. É aqui que a tese se sustenta.` : "O caminho é escolhido pelo caso, não pelo protocolo da moda.",
              topic: topicAt(1),
            },
            {
              heading: "Decisão 3 — sustentar o que funcionou",
              body: desires[0]
                ? `${sentence(desires[0])} Só continua de pé quando cabe na rotina.`
                : "O ganho só continua quando o plano cabe na rotina real.",
              topic: topicAt(2),
            },
          ],
          cta: { title: "Três decisões, uma conversa", sub: cta },
        }]
      : []),
    ...(painNoms.length >= 2
      ? [{
          id: "audience-costly-mistakes",
          kicker: `${KEY} · O QUE CUSTA TEMPO`,
          title: `${key}: 3 erros que atrasam o resultado`,
          coverSub: "Nenhum deles é falta de esforço. Todos são falta de direção.",
          slides: [
            { heading: "Erro 1 — esperar passar", body: `${sentence(painNoms[0])} O tempo sozinho não organiza nada.`, topic: topicAt(1) },
            { heading: "Erro 2 — copiar o caso do outro", body: `${sentence(painNoms[1])} O que serviu para alguém pode não servir para você.`, topic: topicAt(2) },
            {
              heading: "Erro 3 — parar no primeiro alívio",
              body: desireNoms[0] ? `${sentence(desireNoms[0])} exige continuidade, não um bom dia isolado.` : "Alívio não é alta: sem continuidade, volta.",
              topic: topicAt(3),
            },
          ],
          cta: { title: "Corrigir a direção é mais rápido", sub: cta },
        }]
      : []),
    ...(pains.length >= 1
      ? [{
          id: "audience-self-check",
          kicker: `${KEY} · AUTOTESTE`,
          title: `${key}: responda 3 perguntas e leia o veredito`,
          coverSub: "Duas respostas “sim” já mudam a conversa.",
          slides: [
            { heading: "Pergunta 1", body: `${sentence(pains[0])} Isso acontece toda semana?`, topic: topicAt(0) },
            {
              heading: "Pergunta 2",
              body: pains[1] ? `${sentence(pains[1])} Você já mudou sua rotina por causa disso?` : "Você já deixou de fazer algo por causa disso?",
              topic: topicAt(1),
            },
            {
              heading: "Veredito",
              body: proof[0] ? `${proof[0]}. É por aí que a gente começa.` : "Dois “sim” indicam um caso que pede avaliação, não paciência.",
              topic: topicAt(2),
            },
          ],
          cta: { title: "Fez dois “sim”?", sub: cta },
        }]
      : []),
    ...(desires.length >= 1
      ? [{
          id: "audience-day-in-life",
          kicker: `${KEY} · UM DIA DEPOIS`,
          title: `${key}: como fica um dia comum quando o plano funciona`,
          coverSub: "Mesma vida, outras escolhas — sem promessa de milagre.",
          slides: [
            { heading: "Manhã", body: `${sentence(pains[0] ?? key)} deixa de decidir o começo do dia.`, topic: topicAt(0) },
            {
              heading: "Meio do dia",
              body: proof[0] ? `${proof[0]}. Você sabe o que fazer e por quê.` : "Cada tarefa tem um porquê, e você sabe qual é o próximo passo.",
              topic: topicAt(1),
            },
            { heading: "Fim do dia", body: `${sentence(desires[0])} Sem contar as horas até melhorar.`, topic: topicAt(2) },
          ],
          cta: { title: "Quer esse dia comum?", sub: cta },
        }]
      : []),
  ];


  return {
    ...base,
    label: `${brand} · ${who}`,
    hooks: isAliviaCtaBrand(brand) ? base.hooks : commercialAudienceHooks([audience], { forbidden: [] }),
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
    stories: stories.length >= 3 ? stories : [...stories, ...tail(base.stories)],
    /**
     * Cartazes dirigidos: o bloco de foto de fundo lê `features`, então o par
     * relacional (medo/desejo do público + gancho + CTA) precisa chegar aqui —
     * senão a arte com foto volta a falar a frase institucional neutra.
     */
    features: [
      ...pains.slice(0, 3).map((p, i) => ({
        tag: KEY,
        title: sentence(p),
        description: desires[i] ? sentence(desires[i]) : `${brand} trata esse ponto com processo, não com promessa.`,
        topic: topicAt(i),
        headline: condensePhrase(nomPain(i, sentence(p)), 36),
      })),
      ...desires.slice(0, 2).map((d, i) => ({
        tag: `${KEY} · O DEPOIS`,
        title: sentence(d),
        description: proof[i] ? `${proof[i]}.` : `É o que passa a ser possível com ${lower1(key)} levado a sério.`,
        topic: topicAt(i + 3),
        headline: condensePhrase(desireNoms[i] ?? sentence(d), 36),
      })),
      ...proof.slice(0, 2).map((p, i) => ({
        tag: `${KEY} · COMO FUNCIONA`,
        title: `${p}.`,
        description: desires[0] ? sentence(desires[0]) : `Assim ${brand} conduz quem chega com ${lower1(key)}.`,
        topic: topicAt(i + 5),
        headline: condensePhrase(p, 36),
      })),
      {
        tag: `${KEY} · PRÓXIMO PASSO`,
        title: hk(7),
        description: cta,
        topic: topicAt(2),
        headline: condensePhrase(cta, 36),
      },
      ...tail(base.features),
    ].filter((f) => f.title.length >= 8),

    quotes: [
      ...desires.slice(0, 2).map((d) => ({ text: `“${sentence(d)}”` })),
      ...quoteThemes(pains).slice(0, 3).map((theme) => ({ text: painQuote(theme) })),
      ...tail(base.quotes),
    ],
    marquee: [[key, ...painNoms.slice(0, 2), ...desireNoms.slice(0, 2)].filter(Boolean), ...tail(base.marquee)],
    /* Buscas simuladas: o que ESTE público realmente digitaria — queixa,
       diagnóstico ou desejo — nunca frase institucional da marca. */
    searchQueries: [key, ...pains, ...desires, ...(base.searchQueries ?? [])]
      .map((q) => strip(q))
      .filter(Boolean),
    // Havendo repertório dirigido suficiente, não misture roteiros genéricos:
    // eles diluíam o assunto e voltavam a parecer o mesmo carrossel de sempre.
    carousels: carousels.length >= 4 ? carousels : [...carousels, ...tail(base.carousels)],
    closings: [
      { title: `${key}: o próximo passo é seu`, sub: desires[0] ? sentence(desires[0]) : `Fale com ${brand} hoje.`, cta },
      { title: hk(6), sub: proof[0] ?? `${brand} tem um caminho claro para quem está nessa situação.`, cta },
      ...tail(base.closings),
    ],
    sales: {
      ...base.sales,
      audience: `${who} (${key})`,
      proofs: proof.length ? proof : base.sales.proofs,
      objections: audience.editorialGroup
        ? objections
        : pains.length
          ? [`Você já tentou e não deu certo? O problema era ${lower1(nomPain(0, "o improviso"))}.`, ...base.sales.objections]
          : base.sales.objections,
      ctas: audience.editorialGroup ? [cta] : [cta, ...base.sales.ctas],
      hashtags: audience.editorialGroup
        ? [key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()]
        : [...new Set([key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(), ...base.sales.hashtags])],
    },
  };
};

/**
 * FOCO EDITORIAL — vale para QUALQUER marca com linha editorial própria
 * (diferenciais de um SaaS, serviços de uma clínica, produtos de uma loja).
 *
 * Recoloca os termos do tema depois da variação linguística/aprendizado. O texto
 * pode variar, mas a palavra protagonista identifica necessariamente o tema
 * escolhido e cada peça curta ainda fecha mecanismo → ganho → custo de não ter.
 */
export const enforceEditorialFocus = (
  content: WorldContent,
  audience?: BrandAudience | null,
): WorldContent => {
  if (!audience?.editorialGroup) return content;
  const key = audienceKeyword(audience);
  // `highlightTermsFor` preserva pontuação significativa, como "D.I.F.I.", e
  // deriva termos do nome do tema quando a marca não preencheu a lista.
  const terms = highlightTermsFor(audience);
  const progression = buildEditorialProgression({
    definition: audience.description,
    mechanisms: audience.proof,
    benefits: audience.desires,
    losses: audience.stakes,
    pains: audience.pains,
    scenes: audience.scenes,
    cta: audience.cta,
    fallback: key,
  });
  const termAt = (index: number) => terms[index % terms.length] || key;
  const mechanisms = distinctListItems([progression.mechanism, ...(audience.proof ?? [])]
    .map(strip)
    .filter(Boolean));
  const benefits = distinctListItems([progression.benefit, ...(audience.desires ?? [])]
    .map(strip)
    .filter(Boolean));
  const losses = distinctListItems([progression.loss, ...(audience.stakes ?? []), ...(audience.pains ?? [])]
    .map(strip)
    .filter(Boolean));
  const scenes = [progression.scene, ...(audience.scenes ?? [])]
    .map(strip)
    .filter(Boolean);
  const mechanismAt = (index: number) => mechanisms.length ? mechanisms[index % mechanisms.length] : progression.definition;
  const benefitAt = (index: number) => benefits.length ? benefits[index % benefits.length] : progression.benefit;
  const lossAt = (index: number) => losses.length ? losses[index % losses.length] : progression.loss;
  const sceneAt = (index: number) => scenes.length ? scenes[index % scenes.length] : progression.definition;
  const cta = audience.cta?.trim() || content.sales.ctas[0] || "Saiba mais";

  /**
   * Barreira final do CORE. A variação de voz pode mudar o ritmo, mas nunca o
   * protagonista, a hierarquia persuasiva ou a sequência do tema. Recompomos
   * todos os formatos que exibem copy a partir do mesmo pacote canônico.
   */
  const headlines: WorldContent["headlines"] = [
    { strong: termAt(0), rest: `— ${lower1(progression.definition)}.` },
    { strong: termAt(1), rest: `— ${lower1(mechanismAt(0))}.` },
    { strong: termAt(2), rest: `— ${lower1(benefitAt(0))}.` },
    { strong: termAt(0), rest: `— ${lower1(frameEditorialLoss(lossAt(0)))}` },
  ];
  const subs = [
    sentence(progression.definition),
    `${sentence(mechanismAt(0))} Com isso, ${lower1(benefitAt(0))}.`,
    frameEditorialLoss(lossAt(0)),
  ];
  const typos = content.typos.map((entry, index) => {
    const big = termAt(index);
    const rawTail = sentence(index % 3 === 0 ? mechanismAt(index) : index % 3 === 1 ? benefitAt(index) : lossAt(index));
    return {
    lead: index % 3 === 0 ? `${key}:` : index % 3 === 1 ? "Na prática," : "O que muda:",
      big,
      tail: removeLeadingHighlightEcho(big, rawTail),
    };
  });
  const kinetic = content.kinetic.map((entry, index) => ({
    ...entry,
    kicker: key.toUpperCase(),
    word: termAt(index),
    caption: `${sentence(mechanismAt(index))} Com isso, ${lower1(benefitAt(index))}.`,
  }));
  const features = content.features.map((entry, index) => ({
    ...entry,
    tag: key.toUpperCase(),
    title: sentence(index % 3 === 0 ? progression.definition : mechanismAt(index)),
    description: index % 3 === 2
      ? frameEditorialLoss(lossAt(index))
      : `Na rotina, isso permite ${lower1(benefitAt(index))}.`,
    headline: termAt(index),
  }));
  const quotes = content.quotes.map((entry, index) => ({
    ...entry,
    text: `“${sentence(benefitAt(index))} É esse o valor de ${lower1(mechanismAt(index))}.”`,
  }));
  const closings = content.closings.map((entry, index) => ({
    ...entry,
    title: sentence(benefitAt(index)),
    sub: frameEditorialLoss(lossAt(index)),
    cta,
  }));
  const stories = content.stories.map((entry, index) => ({
    ...entry,
    kicker: `${key.toUpperCase()} · ROTINA REAL`,
    title: sentence(sceneAt(index)),
    beats: [sentence(sceneAt(index)), sentence(mechanismAt(index))],
    turn: `Com ${lower1(key)}, passa a ser possível ${lower1(benefitAt(index))}.`,
    moral: frameEditorialLoss(lossAt(index)),
  }));
  const carouselSlides = [
    { heading: condensePhrase(key, 34), body: sentence(progression.definition) },
    { heading: `${key}: como funciona`, body: `Na prática, ${lower1(mechanismAt(0))}.` },
    { heading: `${key}: ganho na rotina`, body: `Com isso, ${lower1(benefitAt(0))}.` },
    { heading: `${key}: o que se perde`, body: frameEditorialLoss(lossAt(0)) },
  ];
  const carousels = content.carousels.map((entry) => ({
    ...entry,
    kicker: key.toUpperCase(),
    title: `${key}: o que muda na rotina`,
    coverSub: sentence(audience.hook || progression.definition),
    slides: carouselSlides,
    cta: { title: sentence(benefitAt(0)), sub: cta },
  }));
  return {
    ...content,
    kickers: [key.toUpperCase(), `${key.toUpperCase()} · COMO FUNCIONA`, `${key.toUpperCase()} · NO DIA A DIA`],
    headlines,
    subs,
    typos,
    kinetic,
    compare: [{ title: `${key}: com e sem`, before: losses, after: benefits }],
    features,
    quotes,
    marquee: [[
      termAt(0),
      termAt(1),
      condensePhrase(progression.mechanism, 54),
      condensePhrase(progression.benefit, 54),
      condensePhrase(progression.loss, 54),
    ]],
    closings,
    stories,
    lists: [{ heading: `${key}: o que muda na prática`, items: carouselSlides.map((item) => sentence(item.body)), closing: cta }],
    carousels,
    searchQueries: [key, ...mechanisms, ...benefits],
    sales: {
      ...content.sales,
      audience: audience.label,
      proofs: mechanisms.map((item, index) => `${sentence(item)} Com isso, ${lower1(benefitAt(index))}.`),
      objections: audience.objections ?? [],
      offers: [],
      ctas: [cta],
      hashtags: [key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()],
    },
  };
};

/** Nome anterior, mantido para não quebrar chamadas existentes. */
export const enforceDifferentialFocus = enforceEditorialFocus;


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
          /* Abertura em caixa de frase e destaque em ideia FECHADA (não meia frase). */
          ...axes.slice(0, 2).map((a) => ({
            lead: `${sentenceLead(a.kicker)}:`,
            big: condensePhrase(a.text, 34),
            tail: ".",
          })),
          ...base.typos,
        ],
        quotes: [...axes.map((a) => ({ text: `“${a.text}.”` })), ...base.quotes],
        /* Retrato da marca também como cartaz (é o slot que a foto de fundo lê). */
        features: [
          ...axes.map((a, i) => ({
            tag: a.kicker,
            title: firstSentence(a.text, 62),
            description: axes[(i + 1) % axes.length]?.text ?? a.text,
            topic: topicAt(i),
            headline: condensePhrase(a.text, 36),
          })),
          ...base.features,
        ],

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
  /**
   * Exceção: públicos marcados como "só manual" (`manualOnly`) ficam fora do
   * sorteio — só entram quando a pessoa escolhe a aba do público no topo.
   */
  const pool = audiences.filter((a) => a.id && !a.manualOnly);
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
  segmentWeights,

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
  if (!isAliviaCtaBrand(brand)) audiences = audiences.map((audience) => prioritizeCommercialAudience(audience, dna));
  const relationFor = (audience?: BrandAudience) =>
    pickRelation({ audience, audiences, dna, brand, angle, seed: variationSeed, keywordMatrix: kit.keywordMatrix, reasoningMatrix: kit.reasoningMatrix });

  /**
   * INSIGHTS DE FORMATOS: entram por ÚLTIMO, já no topo dos acervos, para não
   * serem reescritos pela variação linguística nem diluídos pela cauda genérica.
   * É mais um input do kit — sem o campo preenchido, nada muda.
   */
  const insights = readFormatInsights(kit.formatInsights);
  const withInsights = (content: WorldContent, audience?: BrandAudience) => {
    const scoped = scopedFormatInsights(insights, audience, audiences);
    return scoped.length ? applyFormatInsights(content, scoped, brand) : content;
  };

  const proofreadVisible = (value: unknown, key = ""): unknown => {
    if (typeof value === "string") {
      if (["id", "label", "topic", "poster", "image", "hashtags", "value", "prefix", "suffix"].includes(key)) return value;
      return proofread(value);
    }
    if (Array.isArray(value)) return value.map((item) => proofreadVisible(item, key));
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([childKey, child]) => [childKey, proofreadVisible(child, childKey)]));
    }
    return value;
  };

  const finish = (content: WorldContent, relation?: Relation, audience?: BrandAudience) => {
    /**
     * TERMINOLOGIA DA MARCA (ver `@/pages/studio/terminology`): na marca Aliv.iA,
     * arte dirigida a paciente / sub-nicho clínico diz AUTOavaliação. Em qualquer
     * marca, a copy nunca afirma ter "protocolo".
     */
    /* Voz decidida pela árvore do público (raiz "paciente" ⇒ paciente; raiz
       pro/clínica/acadêmico ⇒ quem atende). Palavras soltas na descrição
       ("já passou por vários profissionais") nunca invertem o público. */
    const voiceAudience = audience ?? relation?.audience;
    const root = voiceAudience ? audienceRootId(voiceAudience, audiences) : undefined;
    const patientVoice = !isAliviaCtaBrand(brand ?? "")
      ? false
      : root === "paciente"
        ? true
        : root && ["pro", "clinica", "academico"].includes(root)
          ? false
          : audience?.editorialGroup
            ? false
            : patientVoiceFor(
                brand,
                [relation?.keyword, relation?.who, relation?.audience?.label, relation?.audience?.description, relation?.hook]
                  .filter(Boolean)
                  .join(" · "),
              );
    const angled = audience?.editorialGroup ? content : applyAngle(content, angle, relation, brand);
    const done = applyTerminology(
      sanitizeContent(angled, dna.forbidden),
      { patientVoice },
    );

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
    const scoped = withInsights({ ...done, headlines: [...head, ...picked], carousels }, audience);
    /**
     * PERTENCIMENTO: arte dirigida não empresta assunto de outro público nem de
     * outro tema clínico (ver `audienceScope.ts`). Leitura institucional da
     * marca (sem público ativo) passa intacta.
     */
    const owned = audience ? enforceAudienceScope(scoped, audience, audiences) : scoped;
    const veterinary = isVeterinaryContext(
      kit.niche,
      kit.description,
      kit.positioning,
      audience?.label,
      audience?.description,
      relation?.keyword,
      relation?.who,
    );
    /* Chamada final fala com o mesmo público da arte (só na marca Aliv.iA,
       que tem paciente e profissional no mesmo kit). */
    const aligned = isAliviaCtaBrand(brand ?? "")
      ? alignTitlesToAudience(alignCtasToAudience(owned, patientVoice, relation?.cta || audience?.cta), patientVoice)
      : owned;
    return proofreadVisible(finalizeBrandVoice(aligned, {
      brand,
      domain: veterinary ? "veterinária" : "",
    })) as WorldContent;

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
      const world = audienceRootId(picked, audiences);
      const official = isAliviaCtaBrand(brand) && world && isWorldId(world) ? WORLDS[world] : undefined;
      return finish(official && picked.id === world ? official : applyAudience(official ?? root, brand, picked, relation), relation, picked);
    }
    return finish(applyGlobal(root, brand, audiences, positioning, dna), relationFor());
  }

  // Sub-nichos herdam o kit do público matriz e sobrepõem o próprio recorte.
  const audience = resolveAudience(audiences, segment);
  if (!audience) return finish(applyGlobal(root, brand, audiences, positioning, dna), relationFor());
  const relation = relationFor(audience);
  const world = audienceRootId(audience, audiences);
  const official = isAliviaCtaBrand(brand) && world && isWorldId(world) ? WORLDS[world] : undefined;
  const built = finish(official && audience.id === world ? official : applyAudience(official ?? root, brand, audience, relation), relation, audience);
  /**
   * O sub-nicho de slogan é o único caso em que uma frase entra JÁ PRONTA na
   * arte: ela é a assinatura declarada da marca, então passa depois dos filtros
   * para não ser reescrita nem descartada.
   */
  if (segment === SLOGAN_SEGMENT && hasSlogan(kit.slogan)) {
    /**
     * Vários slogans = frases independentes. Uma arte usa UM slogan, sorteado
     * pela seed do lote (mesma seed = mesma frase; lote novo, outra frase).
     */
    const phrases = sloganList(kit.slogan);
    const pick = phrases.length > 1
      ? phrases[createRng(`slogan:${variationSeed ?? "base"}:${angle}`).int(phrases.length)]
      : phrases[0];
    return applySloganFocus(built, pick, brand);
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
  segmentWeights,
}: Omit<SegmentContentInput, "base" | "variationProfile">): Relation => {
  const brand = kit.name.trim() || "Sua marca";
  const dna = buildBrandDna({
    niche: kit.niche,
    tone: kit.tone,
    description: kit.description,
    positioning: positioning ?? kit.positioning,
    briefAnswers: kit.briefAnswers,
  });
  const audience = segment === GLOBAL_SEGMENT
    ? pickGlobalAudience({ audiences, variationSeed, segmentWeights }) ?? undefined
    : resolveAudience(audiences, segment) ?? undefined;
  return pickRelation({ audience, audiences, dna, brand, angle, seed: variationSeed, keywordMatrix: kit.keywordMatrix, reasoningMatrix: kit.reasoningMatrix });
};


