import type { Rng } from "./rng";
import type { WorldContent } from "./content";
import type { BlockKind } from "./composePage";

/**
 * Gera a legenda de venda pronta para o Instagram a partir do conteúdo já
 * escrito da seção (sem chamada de IA, custo zero de créditos).
 *
 * Estrutura: gancho → contexto → prova → oferta → CTA → hashtags.
 */

const ANGLES: Record<BlockKind, (c: WorldContent, rng: Rng) => string[]> = {
  hero: (c, rng) => {
    const h = rng.pick(c.headlines);
    return [h.strong, h.rest];
  },
  marquee: (c, rng) => [
    `${rng.pick(c.marquee).slice(0, 3).join(" • ")}`,
    "Tudo isso dentro de um só fluxo de raciocínio clínico.",
  ],
  metrics: (c, rng) => {
    const set = rng.pick(c.metrics);
    return [
      `${set[0].prefix ?? ""}${set[0].value}${set[0].suffix ?? ""} ${set[0].label}.`,
      `E não para aí: ${set[1].value}${set[1].suffix ?? ""} ${set[1].label}.`,
    ];
  },
  journey: (c, rng) => {
    const j = rng.pick(c.journeys);
    return [j.heading, j.steps.map((s) => s.title).join(" → ") + "."];
  },
  feature: (c, rng) => {
    const f = rng.pick(c.features);
    return [f.title, f.description];
  },
  compare: (c, rng) => {
    const cmp = rng.pick(c.compare);
    return [cmp.title, `Antes: ${cmp.before[0]}. Depois: ${cmp.after[0]}.`];
  },
  kinetic: (c, rng) => {
    const k = rng.pick(c.kinetic);
    return [`${k.word}.`, k.caption];
  },
  quote: (c, rng) => [rng.pick(c.quotes).text, rng.pick(c.subs)],
  closing: (c, rng) => {
    const cl = rng.pick(c.closings);
    return [cl.title, cl.sub];
  },
};

export const buildCaption = (content: WorldContent, kind: BlockKind, rng: Rng) => {
  const [hook, context] = ANGLES[kind](content, rng);
  const { sales } = content;

  const proofs = rng.pickMany(sales.proofs, 3);
  const objection = rng.pick(sales.objections);
  const offer = rng.pick(sales.offers);
  const cta = rng.pick(sales.ctas);
  const tags = rng.pickMany(sales.hashtags, 8);

  return [
    hook,
    "",
    context,
    "",
    `Para ${sales.audience}:`,
    ...proofs.map((p) => `• ${p}`),
    "",
    objection,
    "",
    offer,
    `👉 ${cta}`,
    "",
    tags.map((t) => `#${t}`).join(" "),
  ].join("\n");
};
