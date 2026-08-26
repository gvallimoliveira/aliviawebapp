import type { Rng } from "./rng";
import type { WorldContent } from "./content";
import type { BlockKind } from "./composePage";
import { BRAND_DNA } from "./content/brandDna";
import { BRAND_SLOGAN } from "./brand";

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
    return [f.headline ?? f.title, f.description];
  },
  stats: (c, rng) => {
    const s = rng.pick(c.stats);
    return [s.heading, s.items.map((it) => `${it.value} — ${it.label}`).join(" · ")];
  },
  triptych: (c, rng) => {
    const t = rng.pick(c.triptychs);
    return [t.heading, t.panels.map((p) => `${p.word}: ${p.line}`).join(" ")];
  },
  typo: (c, rng) => [rng.pick(c.typos).big, rng.pick(c.subs)],
  pinup: (c, rng) => {
    const f = rng.pick(c.features);
    return [f.headline ?? f.title, f.description];
  },
  story: (c, rng) => {
    const s = rng.pick(c.stories);
    return [s.title, `${s.beats.join(" ")} ${s.turn} ${s.moral}`];
  },
  list: (c, rng) => {
    const l = rng.pick(c.lists);
    return [l.heading, [...l.items.map((item) => `• ${item}`), "", l.closing].join("\n")];
  },
  brand: (_c, rng) => [rng.pick(BRAND_DNA.statements), BRAND_SLOGAN],
  photoType: (c, rng) => {
    const h = rng.pick(c.headlines);
    return [`${h.strong} ${h.rest}`, rng.pick(c.subs)];
  },
  photoSplit: (c, rng) => {
    const h = rng.pick(c.headlines);
    return [`${h.strong} ${h.rest}`, rng.pick(c.subs)];
  },
  photoPortrait: (c, rng) => [rng.pick(c.quotes).text, rng.pick(BRAND_DNA.statements)],
  carousel: (c, rng) => {
    const car = rng.pick(c.carousels);
    return [
      car.title,
      [...car.slides.map((s) => `${s.heading} — ${s.body}`), "", `${car.cta.title}. ${car.cta.sub}`].join("\n"),
    ];
  },
  compare: (c, rng) => {
    const cmp = rng.pick(c.compare);
    return [cmp.title, `Antes: ${cmp.before[0]}. Depois: ${cmp.after[0]}.`];
  },
  kinetic: (c, rng) => {
    const k = rng.pick(c.kinetic);
    return [`${k.word}.`, k.caption];
  },
  echo: (c, rng) => {
    const k = rng.pick(c.kinetic);
    return [`${k.word}. ${k.word}. ${k.word}.`, `${k.kicker} — ${k.caption}`];
  },
  mono: (c, rng) => {
    const t = rng.pick(c.typos);
    return [`${t.lead ? `${t.lead} ` : ""}${t.big}${t.tail}`, rng.pick(c.subs)];
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
