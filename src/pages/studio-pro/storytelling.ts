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
import { phraseSignature } from "@/pages/studio/picker";
import { createRng } from "@/pages/studio/rng";
import { applyTerms } from "@/pages/studio/terminology";
import { sentenceLead, shortKicker } from "@/pages/studio/typographyGuards";
import type { WorldContent } from "@/pages/studio/content/types";
import type { NarrativeRoute } from "./synapses";

const squash = (value?: string) => (value ?? "").replace(/\s+/g, " ").trim().replace(/\s*[.!?…]+$/, "");

/** Corta por palavras inteiras, sem reticências e sem conectivo pendurado. */
const fit = (raw: string | undefined, max: number): string => {
  const text = squash(raw);
  if (!text) return "";
  if (text.length <= max) return text;
  const words = text.split(" ");
  let acc = "";
  for (const word of words) {
    const next = acc ? `${acc} ${word}` : word;
    if (next.length > max) break;
    acc = next;
  }
  let out = acc || words[0] || "";
  for (let guard = 0; guard < 4; guard += 1) {
    if (!/\b(?:e|ou|mas|que|de|da|do|das|dos|em|no|na|com|sem|por|para|se|como|quando|um|uma|a|o)$/i.test(out)) break;
    out = out.replace(/\s+\S+$/, "");
  }
  return out.trim().replace(/[,:;—–]$/, "").trim();
};

const cap = (value?: string) => sentenceLead(squash(value));
const low = (value?: string) => {
  const text = squash(value);
  return text ? `${text.charAt(0).toLowerCase()}${text.slice(1)}` : "";
};

const usable = (text: string) => text.length > 12 && !isStale(text);

/** Palavra protagonista para cartaz tipográfico (a mais forte que couber). */
const bigWord = (source?: string) => {
  const words = squash(source)
    .replace(/[.,;:()"“”]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 5 && word.length <= 12);
  return words.sort((a, b) => b.length - a.length)[0] ?? "";
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

  /** Fio da arte: o que dói/o que se quer, o que muda e a prova. */
  const lead = tension || desire || feature;
  const turn = feature || proof || desire;
  const gain = desire || proof || feature;
  if (!lead || !turn) return {};

  /**
   * Molduras de destaque. As quatro primeiras vêm dos campos novos do kit
   * (cena, inimigo, consequência) — só existem quando o campo foi preenchido,
   * e é isso que faz a capa abrir com vida em vez de frase de catálogo.
   */
  const headlinePool = [
    ...(scene ? [{ strong: fit(cap(scene), 30), rest: fit(cap(gain), 44) }] : []),
    ...(enemy ? [{ strong: fit(`Não é ${low(enemy)}`, 30), rest: fit(`é ${low(turn)}`, 42) }] : []),
    ...(stakes ? [{ strong: fit("Enquanto nada muda", 28), rest: fit(low(stakes), 44) }] : []),
    { strong: fit(cap(lead), 28), rest: fit(cap(gain), 44) },
    { strong: fit(cap(gain), 30), rest: fit(`começa com ${low(turn)}`, 42) },
    { strong: fit(`De ${low(lead)}`, 30), rest: fit(`a ${low(gain)}`, 42) },
    { strong: fit(cap(turn), 28), rest: fit(`para ${low(gain)}`, 42) },
    { strong: fit(`Menos ${low(lead)}`, 30), rest: fit(`mais ${low(gain)}`, 42) },
  ];

  /** Apoios que respondem à objeção, situam a cena e nomeiam o preço da inércia. */
  const extraSubs = [
    ...(scene ? [`${cap(scene)}. É aí que entra ${low(turn)}.`] : []),
    ...(objection ? [`Você pensa: ${low(objection)}. ${cap(turn)} responde a isso.`] : []),
    ...(stakes ? [`Deixar como está tem preço: ${low(stakes)}.`] : []),
    ...(enemy ? [`Aqui não tem ${low(enemy)}. Tem ${low(turn)}.`] : []),
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
      "feature-to-human": [
        `${cap(turn)}. Na prática, ${low(gain)}.`,
        `${cap(gain)} é o efeito humano de ${low(turn)}.`,
        `${cap(turn)} existe para tornar possível ${low(gain)}.`,
        `Por trás de ${low(gain)}, existe ${low(turn)}.`,
        `${cap(turn)} no processo. ${cap(gain)} na experiência.`,
      ],
      "journey-bridge": [
        `${cap(turn)} do começo ao fim: ${low(gain)}.`,
        `${cap(lead)} é o início. ${cap(gain)} é a direção.`,
        `O elo entre ${low(lead)} e ${low(gain)} é ${low(turn)}.`,
        `${cap(turn)} conecta o ponto de partida a ${low(gain)}.`,
        `Uma jornada coerente liga ${low(lead)} a ${low(gain)}.`,
      ],
    };
    const sub = subsByKind[route.kind][frame % subsByKind[route.kind].length];
    if (usable(sub) && sub.length <= 190) out.subs = [terms(fit(sub, 188))];

    if (who) {
      const kickerFrames = [who, `Para ${low(who)}`, `No dia a dia de ${low(who)}`];
      const kicker = shortKicker(kickerFrames[frame % kickerFrames.length], 28);
      if (kicker) out.kickers = [terms(kicker)];
    }

    const closingTitles = [cap(gain), `O próximo passo: ${low(gain)}`, `Agora, ${low(gain)}`, `Pronto para ${low(gain)}?`];
    const closingSupports = [proof || tension || turn, turn, lead, proof || turn];
    const closingTitle = fit(closingTitles[frame % closingTitles.length], 52);
    const closingSub = fit(cap(closingSupports[frame % closingSupports.length]), 64);
    if (closingTitle && closingSub && cta) {
      out.closings = [{ title: terms(closingTitle), sub: terms(closingSub), cta: terms(fit(cta, 28)) }];
    }

    const bigSources = [gain, turn, lead];
    const big = bigWord(bigSources[frame % bigSources.length]) || bigWord(gain) || bigWord(turn);
    if (big) {
      const leads = [lead, turn, gain];
      const tails = [turn, gain, lead];
      const tail = fit(cap(tails[frame % tails.length]), 46);
      if (tail) {
        out.typos = [{ lead: terms(fit(cap(leads[frame % leads.length]), 26)), big: terms(big).toUpperCase(), tail: terms(tail) }];
      }
    }
    return out;
  };

  const frameCount = 5;
  const offset = createRng(`storytelling:${options.seed ?? route.signature}`).int(frameCount);
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
