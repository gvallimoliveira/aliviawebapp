/**
 * REDAÇÃO A PARTIR DA ROTA NARRATIVA
 *
 * A rede editorial (`synapses.ts`) escolhe QUAL conexão a arte defende
 * (tensão → entrega → prova → desejo). Este módulo transforma essa conexão em
 * frases que realmente vão para a arte — antes a rota só pesava a escolha de
 * frases prontas, por isso a mudança não aparecia no resultado.
 *
 * Nada é inventado: todas as frases nascem de campos reais do kit/briefing
 * (dor, desejo, oferta, crença, chamada, público). Campo vazio ⇒ nenhuma frase.
 * Determinístico: mesma rota ⇒ mesmo texto.
 */
import { isStale } from "@/pages/studio/persuasion";
import { hasDanglingEnding, isBareEnumeration, isClause, lowerInitial } from "@/pages/studio/grammar";
import { phraseSignature } from "@/pages/studio/picker";
import { createRng } from "@/pages/studio/rng";
import { applyTerms } from "@/pages/studio/terminology";
import { sentenceLead, shortKicker } from "@/pages/studio/typographyGuards";
import type { WorldContent } from "@/pages/studio/content/types";
import type { NarrativeRoute } from "./synapses";
import { buildHook, eligibleHooks, hookViolatesGuardrails, type HookFields, type HookInput } from "./hookTaxonomy";
import { textSimilarity } from "./narrativeArc";

/** Liga o insumo exigido pelo gancho ao campo do kit usado nos apoios. */
const HOOK_FIELD_LABEL: Partial<Record<HookInput, string>> = {
  cena: "scene",
  objecao: "objection",
  inimigo: "enemy",
  consequencia: "stakes",
  gatilho: "trigger",
  termo: "lexical",
  percepcao: "lexical",
  dor: "core",
  desejo: "core",
  prova: "core",
  mecanismo: "core",
};


const squash = (value?: string) => (value ?? "").replace(/\s+/g, " ").trim().replace(/\s*[.!?…]+$/, "");

/** Corta por palavras inteiras, sem reticências e sem conectivo pendurado. */
const fit = (raw: string | undefined, max: number): string => {
  const text = squash(raw);
  if (!text) return "";
  if (text.length <= max) return hasDanglingEnding(text) ? "" : text;
  const words = text.split(" ");
  let acc = "";
  for (const word of words) {
    const next = acc ? `${acc} ${word}` : word;
    if (next.length > max) break;
    acc = next;
  }
  let out = acc || words[0] || "";
  for (let guard = 0; guard < 5 && hasDanglingEnding(out); guard += 1) {
    out = out
      .replace(/\s+(?:por causa|por conta|em razão|a respeito|graças a|devido a|a partir|junto a|apesar de|antes de|depois de|é hora de|e hora de|para quem|com quem|sem que|assim como)$/i, "")
      .replace(/\s+\S+$/, "");
  }
  const complete = out.trim().replace(/[,:;—–]$/, "").trim();
  return hasDanglingEnding(complete) ? "" : complete;
};

/** Siglas do manual (PAAF, CRMV, HEP...) nunca perdem o caixa alta. */
const ACRONYM = /\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,6}\b/g;
const keepAcronyms = (raw: string, out: string) => {
  const found = [...new Set((raw.match(ACRONYM) ?? []))];
  return found.reduce(
    (text, sigla) => text.replace(new RegExp(`\\b${sigla}\\b`, "gi"), sigla),
    out,
  );
};

const cap = (value?: string) => {
  const raw = squash(value);
  return keepAcronyms(raw, sentenceLead(raw));
};
const low = (value?: string) => {
  const text = squash(value);
  // Frase que começa por sigla continua em caixa alta.
  if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,6}\b/.test(text)) return text;
  return keepAcronyms(text, lowerInitial(text));
};

const SUB_ECHO = 0.68;

/** Contrai preposição + artigo ("de o" -> "do") para a frase não sair torta. */
const contract = (prep: "de" | "a", text: string) => {
  const match = /^(o|a|os|as)\s+(.*)$/i.exec(text.trim());
  const cap1 = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
  if (!match) return prep === "de" ? cap1(`${prep} ${text}`) : `${prep} ${text}`;
  const table: Record<string, Record<string, string>> = {
    de: { o: "do", a: "da", os: "dos", as: "das" },
    a: { o: "ao", a: "à", os: "aos", as: "às" },
  };
  const joined = `${table[prep][match[1].toLowerCase()]} ${match[2]}`;
  return prep === "de" ? cap1(joined) : joined;
};

const usable = (text: string) =>
  text.length > 12 &&
  !hasDanglingEnding(text) &&
  !isStale(text) &&
  !hookViolatesGuardrails(text);


/** Palavra protagonista para cartaz tipográfico (a mais forte que couber). */
const bigWord = (source?: string) => {
  const words = squash(source)
    .replace(/[.,;:()"“”]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 5 && word.length <= 12);
  return words.sort((a, b) => b.length - a.length)[0] ?? "";
};

/** Recorta uma frase completa ao redor da palavra de destaque. Assim lead, big
 * e tail continuam sendo a mesma ideia, em vez de três campos independentes. */
const typoFromSentence = (sentence: string, preferred?: string) => {
  const clean = squash(sentence);
  const word = bigWord(preferred) || bigWord(clean);
  if (!clean || !word) return undefined;
  const match = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").exec(clean);
  if (!match || match.index === undefined) return undefined;
  const lead = clean.slice(0, match.index).trim();
  const tail = clean.slice(match.index + match[0].length).trim();
  return {
    lead: fit(cap(lead), 64),
    big: match[0].toUpperCase(),
    tail: fit(tail, 92),
  };
};

/**
 * Frases da rota. Retorna só os acervos que a rota consegue sustentar, para o
 * diretor colocá-los na frente do acervo geral.
 */
export const composeRouteCopy = (
  route: NarrativeRoute | undefined,
  options: {
    brand?: string;
    patientVoice?: boolean;
    /** Faz a mesma conexão ganhar outro ritmo em cada arte/lote. */
    seed?: string;
    /** Posição da arte na leva: distribui os campos do kit entre as artes. */
    rotate?: number;
    /** Memória da marca: permite trocar o molde antes de abandonar a rota. */
    weightOf?: (signature: string) => number;
  } = {},
): Partial<WorldContent> => {
  if (!route) return {};
  const terms = (text: string) => applyTerms(text, { patientVoice: options.patientVoice });

  const tension = squash(route.tension);
  const desire = squash(route.desire);
  const proof = squash(route.proof);
  const feature = squash(route.feature);
  const cta = squash(route.cta);
  const who = squash(route.audienceLabel);
  /** Cena concreta, objeção real, inimigo declarado e preço da inércia. */
  const scene = squash(route.scene);
  const objection = squash(route.objection);
  const enemy = squash(route.enemy);
  const stakes = squash(route.stakes);
  /** Momento de gatilho e método traduzido em linguagem de leigo. */
  const trigger = squash(route.trigger);
  const methodPlain = squash(route.methodPlain);
  const lexicalTerm = squash(route.lexicalTerm);
  const lexicalPerception = squash(route.lexicalPerception);
  const completeReasoning = Boolean(scene && feature && proof && desire);
  const featureIsList = isBareEnumeration(feature);
  const mechanismAction = featureIsList
    ? `investigar a presença de ${low(feature)}`
    : low(feature);


  /** Fio da arte: o que dói/o que se quer, o que muda e a prova. */
  // Um campo do manual também pode já chegar incompleto. Ele continua guardado
  // como dado da marca, mas nunca assume um slot visível sem complemento.
  const lead = [tension, scene, desire, feature].find((item) => item && !hasDanglingEnding(item)) ?? "";
  const turn = feature || proof || desire;
  const gain = desire || proof || feature;
  if (!lead || !turn) return {};

  /**
   * GANCHOS NOMEADOS: a abertura deixa de ser colagem de campos. Cada tipo da
   * biblioteca (`hookTaxonomy.ts`) só é elegível quando o manual tem o campo que
   * ele exige, o molde é conferido (duas partes, sem promessa proibida) e o tipo
   * escolhido varia com a posição da arte no lote.
   */
  type Frame = { field: string; strong: string; rest: string };
  const hookFields: HookFields = {
    dor: tension,
    objecao: objection,
    inimigo: enemy,
    prova: proof,
    cena: scene,
    desejo: desire,
    gatilho: trigger,
    mecanismo: feature,
    consequencia: stakes,
    termo: lexicalTerm,
    percepcao: lexicalPerception,
  };
  const hookFrames: Frame[] = eligibleHooks(hookFields)
    .map((type) => ({ type, shape: buildHook(type, hookFields) }))
    .filter((entry): entry is { type: (typeof entry)["type"]; shape: NonNullable<(typeof entry)["shape"]> } =>
      Boolean(entry.shape),
    )
    .map(({ type, shape }) => ({
      field: HOOK_FIELD_LABEL[type.requires[0]] ?? "core",
      strong: fit(shape.strong, 40),
      rest: fit(shape.rest, 52),
    }))

    .filter((frame) => Boolean(frame.strong && frame.rest));

  const headlinePool: Frame[] = [
    ...(completeReasoning
      ? [
          { field: "reasoning", strong: fit(cap(scene), 42), rest: fit(cap(featureIsList ? `É hora de ${mechanismAction}` : feature), 54) },
          { field: "reasoning", strong: fit(cap(lexicalPerception || scene), 42), rest: fit(cap(featureIsList ? `A investigação procura ${low(feature)}` : feature), 54) },
        ]
      : []),
    ...hookFrames,
    // Molduras diretas dos campos do kit: continuam válidas e somam variedade.
    ...(scene ? [{ field: "scene", strong: fit(cap(scene), 30), rest: fit(cap(gain), 44) }] : []),
    ...(trigger && !isClause(turn)
      ? [{ field: "trigger", strong: fit(cap(trigger), 32), rest: fit(`É hora de ${featureIsList ? mechanismAction : low(turn)}`, 42) }]
      : []),
    // Objeção é contraste, não promessa: o mecanismo/virada ocupa o destaque.
    // Isso impede alternativas rejeitadas ("IA genérica", "tentativa e erro")
    // de virarem a palavra-cartaz do modelo tipográfico.
    ...(objection ? [{ field: "objection", strong: fit(cap(turn), 32), rest: fit(`Em vez de ${low(objection)}`, 44) }] : []),
    ...(enemy && !isClause(turn)
      ? [{ field: "enemy", strong: fit(cap(turn), 30), rest: fit(`Não ${low(enemy)}`, 42) }]
      : []),
    ...(stakes ? [{ field: "stakes", strong: fit("Enquanto nada muda", 28), rest: fit(low(stakes), 44) }] : []),

    { field: "core", strong: fit(cap(lead), 28), rest: fit(cap(gain), 44) },
    ...(isClause(turn)
      ? [{ field: "core", strong: fit(cap(gain), 30), rest: fit(cap(turn), 44) }]
      : [{ field: "core", strong: fit(cap(gain), 30), rest: fit(`começa com ${low(turn)}`, 42) }]),
    { field: "core", strong: fit(contract("de", low(lead)), 30), rest: fit(contract("a", low(gain)), 42) },
    ...(isClause(gain)
      ? [{ field: "core", strong: fit(cap(turn), 28), rest: fit(cap(gain), 44) }]
      : [{ field: "core", strong: fit(cap(turn), 28), rest: fit(`para ${low(gain)}`, 42) }]),
    { field: "core", strong: fit(`Menos ${low(lead)}`, 30), rest: fit(`mais ${low(gain)}`, 42) },
  ].filter((frame) => Boolean(frame.strong && frame.rest && usable(`${frame.strong} ${frame.rest}`)));

  if (!headlinePool.length) return {};


  /**
   * LIGAÇÃO SEGURA: molduras com encaixe nominal ("É aí que entra X") só valem
   * quando X é um grupo nominal. Se X já é uma frase com verbo, usamos a ligação
   * por frase para não colar duas orações sem sentido.
   */
  const linkNominal = (lead: string, bridge: string, tail: string, fallback: string) =>
    isClause(tail) ? `${cap(lead)}. ${cap(tail)}${fallback}` : `${cap(lead)}. ${bridge} ${low(tail)}.`;

  /** Apoios que respondem à objeção, situam a cena e nomeiam o preço da inércia. */
  const extraSubs: Array<{ field: string; text: string }> = [
    ...(completeReasoning
      ? [{
          field: "reasoning",
          text: featureIsList
            ? `${cap(scene)} pode envolver agentes diferentes, como ${low(feature)}. ${cap(proof)} ajuda a identificar o que está presente e orienta ${low(desire)}.`
            : `${cap(scene)}. ${cap(feature)} explica o que precisa ser investigado; ${low(proof)} ajuda a esclarecer e orienta ${low(desire)}.`,
        }]
      : []),
    ...(lexicalTerm && lexicalPerception
      ? [{
          field: "lexical",
          text: proof
            ? `${cap(lexicalPerception)} merece atenção. ${cap(proof)} ajuda a entender o que está acontecendo e orienta o próximo passo.`
            : `${cap(lexicalPerception)} pode ter relação com ${low(lexicalTerm)} e merece uma avaliação cuidadosa.`,
        }]
      : []),
    ...(objection ? [{ field: "objection", text: `Você pensa: ${low(objection)}. ${cap(turn)} responde a isso.` }] : []),
    ...(stakes ? [{ field: "stakes", text: `Deixar como está tem preço: ${low(stakes)}.` }] : []),
    ...(scene ? [{ field: "scene", text: linkNominal(scene, "É aí que entra", turn, ".") }] : []),
    ...(trigger ? [{ field: "trigger", text: linkNominal(trigger, "Esse é o momento de", turn, ".") }] : []),
    ...(methodPlain
      ? [{
          field: "method",
          text: `${cap(methodPlain)}. Essa análise dá base à decisão clínica, com mais clareza e menos improviso.`,
        }]
      : []),
    ...(enemy
      ? [{
          field: "enemy",
          text: isClause(turn)
            ? `Aqui não tem ${low(enemy)}. ${cap(turn)}.`
            : `Aqui não tem ${low(enemy)}. Tem ${low(turn)}.`,
        }]
      : []),
  ];


  const buildFrame = (frame: number): Partial<WorldContent> => {
    const out: Partial<WorldContent> = {};
    const headlines = headlinePool;
    const headline = headlines[frame % headlines.length];
    if (usable(`${headline.strong} ${headline.rest}`) && headline.strong && headline.rest) {
      out.headlines = [{ strong: terms(headline.strong), rest: terms(headline.rest) }];
    }

    const subsByKind: Record<NarrativeRoute["kind"], string[]> = {
      "pain-to-desire": [
        `${cap(lead)}. O caminho passa por ${low(turn)}.`,
        `${cap(turn)} muda o ponto de partida: ${low(gain)}.`,
        `Entre ${low(lead)} e ${low(gain)}, entra ${low(turn)}.`,
        `${cap(gain)} não começa no fim. Começa com ${low(turn)}.`,
        `${cap(lead)} pede outra resposta: ${low(turn)}.`,
      ],
      "desire-through-proof": [
        `${cap(gain)}. A base é ${low(proof || turn)}.`,
        `${cap(proof || turn)} dá base para ${low(gain)}.`,
        `Antes de ${low(gain)}, vem ${low(proof || turn)}.`,
        `${cap(gain)} ganha forma quando existe ${low(proof || turn)}.`,
        `A diferença entre desejar e avançar: ${low(proof || turn)}.`,
      ],
      "feature-to-human": isClause(turn)
        ? [
            `${cap(turn)}. Na prática, ${low(gain)}.`,
            `${cap(turn)}. Isso abre espaço para ${low(gain)}.`,
            `${cap(turn)}. Assim, ${low(gain)}.`,
            `${cap(turn)}. O resultado é ${low(gain)}.`,
          ]
        : [
            `${cap(turn)}. Na prática, ${low(gain)}.`,
            `Com ${low(turn)}, fica possível ${low(gain)}.`,
            `${cap(turn)} existe para tornar possível ${low(gain)}.`,
            `${cap(gain)} começa com ${low(turn)}.`,
          ],
      "journey-bridge": [
        `${cap(turn)} do começo ao fim: ${low(gain)}.`,
        `${cap(lead)} é o início. ${cap(gain)} é a direção.`,
        `O elo entre ${low(lead)} e ${low(gain)} é ${low(turn)}.`,
        `${cap(turn)} conecta o ponto de partida a ${low(gain)}.`,
        `Uma jornada coerente liga ${low(lead)} a ${low(gain)}.`,
      ],
    };
    /**
     * PAR OBRIGATÓRIO: o apoio nunca repete o campo que já está no destaque.
     * Se o destaque abriu com a cena, o apoio entra com objeção, consequência
     * ou método — e vice-versa. Só quando nenhum campo do kit sobra é que o
     * apoio cai no acervo de fio narrativo.
     */
    const otherFields = extraSubs.filter((item) => item.field !== headline.field);
    const coherentReasoning = completeReasoning
      ? extraSubs.filter((item) => item.field === "reasoning")
      : [];
    const subPool = [
      ...otherFields.map((item) => item.text),
      ...(otherFields.length ? [] : extraSubs.map((item) => item.text)),
      ...subsByKind[route.kind].filter((candidate) => !hasDanglingEnding(candidate)),
    ];
    /**
     * DEDUPE POR TEXTO FINAL: antes a regra só evitava repetir o CAMPO do kit.
     * Agora o apoio é comparado com a frase que realmente está no destaque —
     * apoio parecido demais é descartado e o próximo candidato entra.
     */
    const headlineText = `${headline.strong} ${headline.rest}`;
    const rotateFrom = <T,>(items: T[]) =>
      items.length ? items.map((_, i) => items[(i + frame) % items.length]) : [];
    const mergedSubs = [
      ...coherentReasoning.map((item) => item.text),
      ...otherFields.map((item) => item.text),
      ...subPool,
      ...subsByKind[route.kind].filter((candidate) => !hasDanglingEnding(candidate)),
    ];
    const subCandidates = rotateFrom([...new Set(mergedSubs)]);

    const pickDistinct = (candidates: string[], against: string[], max = 190) =>
      candidates.find(
        (candidate) =>
          usable(candidate) &&
          candidate.length <= max &&
          against.every((previous) => textSimilarity(candidate, previous) < SUB_ECHO),
      ) ?? candidates.find((candidate) => usable(candidate) && candidate.length <= max);
    const sub = pickDistinct(subCandidates, [headlineText]);
    if (sub) out.subs = [terms(fit(sub, 188))];

    if (who) {
      const kickerFrames = [who, `Para ${low(who)}`, `No dia a dia de ${low(who)}`];
      const kicker = shortKicker(kickerFrames[frame % kickerFrames.length], 28);
      if (kicker) out.kickers = [terms(kicker)];
    }

    const closingTitles = [cap(gain), `O próximo passo: ${low(gain)}`, `Agora, ${low(gain)}`, `Pronto para ${low(gain)}?`];
    const causalClosing = proof && desire
      ? `${cap(proof)}. É isso que dá base para ${low(desire)}.`
      : proof && feature
        ? `${cap(proof)} esclarece o que ${low(feature)} precisa mostrar.`
        : `${cap(turn)}. Assim, a decisão responde a ${low(lead)}.`;
    const closingTitle = fit(closingTitles[frame % closingTitles.length], 52);
    // O fecho não é mais sorteado como uma terceira frase independente. Ele
    // sempre explicita como a prova conduz ao benefício/decisão da abertura.
    // Fechamento é uma unidade de sentido. O limite anterior (118) podia parar
    // em “É isso que dá”, apagando justamente decisão e benefício. Os blocos de
    // fecho já reduzem o corpo visualmente; aqui preservamos a conclusão inteira.
    const closingSub = fit(cap(causalClosing), 168);
    if (closingTitle && closingSub && cta) {
      out.closings = [{ title: terms(closingTitle), sub: terms(closingSub), cta: terms(fit(cta, 28)) }];
    }


    const typoSentence = textSimilarity(turn, gain) >= SUB_ECHO
      ? `${cap(lead)}. ${cap(turn)} orienta o próximo passo.`
      : `${cap(lead)}. ${cap(turn)} abre caminho para ${low(gain)}.`;
    const typo = typoFromSentence(typoSentence, turn);
    if (typo?.lead && typo.big && typo.tail) {
      out.typos = [{ lead: terms(typo.lead), big: terms(typo.big), tail: terms(typo.tail) }];
    }

    /**
     * A rota completa também alimenta modelos informativos. Antes só hero,
     * tipografia e fecho recebiam a matriz; listas, cards e histórias voltavam
     * ao acervo genérico mesmo quando o manual estava rico.
     */
    const routeSteps = [
      scene ? { title: "O que aparece", description: cap(scene) } : undefined,
      feature ? { title: "O que pode estar por trás", description: cap(feature) } : undefined,
      proof ? { title: "O que ajuda a esclarecer", description: cap(proof) } : undefined,
      desire ? { title: "O que essa decisão protege", description: cap(desire) } : undefined,
    ].filter((item): item is { title: string; description: string } => Boolean(item));
    if (routeSteps.length >= 3) {
      out.features = routeSteps.map((item, index) => ({
        tag: shortKicker(who || route.audienceLabel || "Entenda", 28),
        title: terms(fit(item.title, 38)),
        headline: terms(fit(item.description, 56)),
        description: terms(fit(item.description, 150)),
        topic: undefined,
      }));
      out.lists = [{
        heading: terms(fit(scene || lead, 72)),
        items: routeSteps.slice(1).map((item) => terms(item.description)),
        closing: terms(fit(proof || cta || gain, 110)),
      }];
      out.stories = [{
        kicker: terms(shortKicker(who || "Leitura clínica", 28)),
        title: terms(fit(scene || lead, 70)),
        beats: [feature, proof].filter(Boolean).map((item) => terms(cap(item))),
        turn: terms(fit(desire || gain, 100)),
        moral: terms(fit(cta || proof || turn, 100)),
      }];
      if (lexicalTerm && lexicalPerception) {
        /*
         * Citação = convite, não correção. Antes saía "X não é só um nome" —
         * cacoete de negação que não vende. Agora a frase mostra a solução como
         * realidade próxima, ao alcance de quem entra para a marca.
         */
        const brandName = squash(options.brand);
        const isAliviaBrand = /aliv\.?i?a/i.test(brandName);
        const joinFrames = isAliviaBrand
          ? [
              `${cap(lexicalPerception)} pode ser a sua rotina. Basta fazer parte do time Aliv.iA.`,
              `${cap(lexicalPerception)} está mais perto do que parece. É assim no time Aliv.iA.`,
              `${cap(lexicalPerception)} já é realidade para quem faz parte do time Aliv.iA.`,
            ]
          : [
              `${cap(lexicalPerception)} pode ser a sua realidade. Está mais perto do que parece.`,
              `${cap(lexicalPerception)} pode fazer parte do seu dia a dia, a partir de agora.`,
            ];
        const usefulQuote = joinFrames[frame % joinFrames.length];
        out.quotes = [{ text: terms(usefulQuote) }];
      }
      out.kinetic = [{
        kicker: terms(shortKicker(who || "Decisão", 28)),
        word: terms(bigWord(lexicalTerm || feature || desire) || "Clareza"),
        caption: terms(fit(proof || feature, 110)),
      }];
    }
    return out;
  };

  const frameCount = Math.max(5, headlinePool.length, extraSubs.length + 5);
  /**
   * EQUILÍBRIO DENTRO DO LOTE: `rotate` é a posição da arte na leva. Sem ele,
   * duas artes com acervo parecido caíam no mesmo campo do kit; com ele cada
   * arte começa a busca em um campo diferente (cena, gatilho, objeção...).
   */
  const offset =
    (createRng(`storytelling:${options.seed ?? route.signature}`).int(frameCount) + (options.rotate ?? 0)) % frameCount;
  const frames = Array.from({ length: frameCount }, (_, index) => (index + offset) % frameCount);
  if (!options.weightOf) return buildFrame(frames[0]);

  const scored = frames.map((frame, order) => {
    const content = buildFrame(frame);
    const signatures: string[] = [];
    const collect = (value: unknown) => {
      if (typeof value === "string" && value.trim()) signatures.push(phraseSignature(value));
      else if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach(collect);
    };
    collect(content);
    const freshness = signatures.length
      ? signatures.reduce((sum, signature) => sum + (options.weightOf?.(signature) ?? 1), 0) / signatures.length
      : 0;
    return { content, freshness, order };
  });
  scored.sort((a, b) => b.freshness - a.freshness || a.order - b.order);
  return scored[0].content;
};
