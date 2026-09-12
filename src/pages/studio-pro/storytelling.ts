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
  options: { brand?: string; patientVoice?: boolean } = {},
): Partial<WorldContent> => {
  if (!route) return {};
  const terms = (text: string) => applyTerms(text, { patientVoice: options.patientVoice });

  const tension = squash(route.tension);
  const desire = squash(route.desire);
  const proof = squash(route.proof);
  const feature = squash(route.feature);
  const cta = squash(route.cta);
  const who = squash(route.audienceLabel);

  /** Fio da arte: o que dói/o que se quer, o que muda e a prova. */
  const lead = tension || desire || feature;
  const turn = feature || proof || desire;
  const gain = desire || proof || feature;
  if (!lead || !turn) return {};

  const out: Partial<WorldContent> = {};

  const headline = { strong: fit(cap(lead), 28), rest: fit(cap(gain), 44) };
  if (usable(`${headline.strong} ${headline.rest}`) && headline.strong && headline.rest) {
    out.headlines = [{ strong: terms(headline.strong), rest: terms(headline.rest) }];
  }

  const sub = (() => {
    switch (route.kind) {
      case "pain-to-desire":
        return `${cap(lead)}. O caminho passa por ${low(turn)}.`;
      case "desire-through-proof":
        return `${cap(gain)}. A base é ${low(proof || turn)}.`;
      case "feature-to-human":
        return `${cap(turn)}. Na prática, ${low(gain)}.`;
      default:
        return `${cap(turn)} do começo ao fim: ${low(gain)}.`;
    }
  })();
  if (usable(sub) && sub.length <= 190) out.subs = [terms(fit(sub, 188) + (sub.endsWith(".") ? "." : ""))];

  if (who) {
    const kicker = shortKicker(who, 28);
    if (kicker) out.kickers = [terms(kicker)];
  }

  const closingTitle = fit(cap(gain), 52);
  const closingSub = fit(cap(proof || tension || turn), 64);
  if (closingTitle && closingSub && cta) {
    out.closings = [{ title: terms(closingTitle), sub: terms(closingSub), cta: terms(fit(cta, 28)) }];
  }

  const big = bigWord(gain) || bigWord(turn);
  if (big) {
    const tail = fit(cap(turn === big ? gain : turn), 46);
    if (tail) {
      out.typos = [{ lead: terms(fit(cap(lead), 26)), big: terms(big).toUpperCase(), tail: terms(tail) }];
    }
  }

  return out;
};
