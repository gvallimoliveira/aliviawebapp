import type { Rng } from "./rng";
import type { WorldContent } from "./content";
import type { BlockKind } from "./composePage";
import { BRAND_SLOGAN } from "./brand";
import { rankProofsByAxis, stripColdSpecs } from "./captionCoherence";

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
    rng.pick(c.subs),
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
  brand: (c, rng) => [rng.pick(c.closings).title, BRAND_SLOGAN || rng.pick(c.subs)],
  photoType: (c, rng) => {
    const h = rng.pick(c.headlines);
    return [`${h.strong} ${h.rest}`, rng.pick(c.subs)];
  },
  photoSplit: (c, rng) => {
    const h = rng.pick(c.headlines);
    return [`${h.strong} ${h.rest}`, rng.pick(c.subs)];
  },
  photoPortrait: (c, rng) => [rng.pick(c.quotes).text, rng.pick(c.subs)],
  photoVeil: (c, rng) => {
    const h = rng.pick(c.headlines);
    return [`${h.strong} ${h.rest}`, rng.pick(c.subs)];
  },
  askbox: (c, rng) => {
    const f = rng.pick(c.features);
    return [`Qual a sua dúvida sobre ${f.tag.toLowerCase()}?`, f.description];
  },
  promoPhone: (c, rng) => [
    rng.pick([...(c.sales?.offers ?? []), rng.pick(c.subs)]),
    rng.pick(c.features).description,
  ],
  stackType: (c, rng) => {
    const h = rng.pick(c.headlines);
    return [`${h.strong} ${h.rest}`, rng.pick(c.subs)];
  },
  tweet: (c, rng) => [rng.pick(c.quotes).text, rng.pick(c.subs)],
  phoneSide: (c, rng) => {
    const f = rng.pick(c.features);
    return [f.headline ?? f.title, f.description];
  },
  notice: (c, rng) => {
    const f = rng.pick(c.features);
    return [f.headline ?? f.title, f.description];
  },
  shrink: (c, rng) => {
    const pain = c.compare.length > 0 && c.compare[0].before.length > 0
      ? rng.pick(rng.pick(c.compare).before)
      : rng.pick(c.sales.objections);
    return [`E se isso fosse perdendo tamanho a cada semana?`, pain];
  },
  elegantAsk: (c, rng) => {
    const pain = c.compare.length > 0 && c.compare[0].before.length > 0
      ? rng.pick(rng.pick(c.compare).before)
      : rng.pick(c.sales.objections);
    return [`${pain}?`, rng.pick(c.subs)];
  },
  pullQuote: (c, rng) => [rng.pick(c.quotes).text, rng.pick(c.subs)],
  percent: (c, rng) => {
    const set = rng.pick(c.stats);
    const item = rng.pick(set.items);
    return [`${item.value} — ${item.label}`, item.note];
  },
  hook: (c, rng) => {
    const list = c.hooks ?? [];
    if (list.length === 0) {
      const h = rng.pick(c.headlines);
      return [`${h.strong} ${h.rest}`.trim(), rng.pick(c.subs)];
    }
    const k = rng.pick(list);
    return [`${k.strong} ${k.rest ?? ""}`.trim(), k.sub ?? rng.pick(c.subs)];
  },
  punch: (c, rng) => {
    const h = rng.pick(c.headlines);
    return [h.strong, rng.pick(c.subs)];
  },
  search: (c, rng) => [
    `${rng.pick(c.kickers)}: ${rng.pick(c.headlines).strong}`,
    rng.pick(c.subs),
  ],
  device: (c, rng) => {
    const f = rng.pick(c.features);
    return [f.headline ?? f.title, f.description];
  },
  door: (c, rng) => {
    const h = rng.pick(c.headlines);
    return [`${h.strong} ${h.rest}`, rng.pick(c.subs)];
  },
  stage: (c, rng) => [rng.pick(c.headlines).strong, rng.pick(c.subs)],
  constellation: (c, rng) => [rng.pick(c.kickers), rng.pick(c.subs)],
  signpost: (c, rng) => {
    const cmp = c.compare.length > 0 ? rng.pick(c.compare) : undefined;
    const pain = cmp && cmp.before.length > 0 ? rng.pick(cmp.before) : rng.pick(c.sales.objections);
    const want = cmp && cmp.after.length > 0 ? rng.pick(cmp.after) : rng.pick(c.subs);
    return [`De "${pain}" para "${want}"`, rng.pick(c.subs)];
  },
  billboard: (c, rng) => {
    const h = rng.pick(c.headlines);
    return [`${h.strong} ${h.rest}`, rng.pick(c.closings).sub];
  },
  notify: (c, rng) => [
    `${rng.pick(c.headlines).strong} — o dia a dia acontecendo dentro do app.`,
    rng.pick(c.sales.proofs),
    rng.pick(c.sales.ctas),
  ],
  toggle: (c, rng) => {
    const pair = c.compare.length > 0 ? rng.pick(c.compare) : undefined;
    const off = pair && pair.before.length > 0 ? rng.pick(pair.before) : rng.pick(c.sales.objections);
    const on = pair && pair.after.length > 0 ? rng.pick(pair.after) : rng.pick(c.sales.proofs);
    return [`Desligue: ${off}`, `Ligue: ${on}`, rng.pick(c.sales.ctas)];
  },
  trend: (c, rng) => {
    const h = rng.pick(c.headlines);
    return [`${h.strong} ${h.rest}`, "A evolução não é uma linha reta — mas atravessa o platô.", rng.pick(c.sales.ctas)];
  },
  focus: (c, rng) => {
    const pair = c.compare.length > 0 ? rng.pick(c.compare) : undefined;
    const here = pair && pair.after.length > 0 ? rng.pick(pair.after) : rng.pick(c.sales.proofs);
    return ["Não olhe o caminho inteiro. Olhe a próxima pedra.", here, rng.pick(c.sales.ctas)];
  },
  diverge: (c, rng) => {
    const h = rng.pick(c.headlines);
    return [`${h.strong} ${h.rest}`, rng.pick(c.sales.proofs), rng.pick(c.sales.ctas)];
  },
  outbox: (c, rng) => {
    const t = c.typos.length > 0 ? rng.pick(c.typos) : undefined;
    const line = t ? `${t.lead} ${t.big} ${t.tail}` : `${rng.pick(c.headlines).strong}`;
    return [line, rng.pick(c.subs)];
  },
  tutorial: (c, rng) => {
    const h = rng.pick(c.headlines);
    return [`${h.strong} ${h.rest}`, rng.pick(c.subs), rng.pick(c.closings).cta];
  },
  hub: (c, rng) => {
    const k = rng.pick(c.closings);
    return [k.title, c.features.slice(0, 4).map((f) => f.tag || f.title).join(" • "), k.cta];
  },
  steps: (c, rng) => [
    "STEPS — os 6 degraus da reabilitação: controle da dor, reparo tecidual, mobilidade, força, controle motor e alta.",
    "Cada fase do plano é mapeada a um degrau: você sabe onde está e para onde precisa ir.",
    rng.pick(c.closings).sub,
  ],
  difi: (c, rng) => [
    "Ciclo D.I.F.I.: dor → inibição → fraqueza → incapacidade — e de volta à dor.",
    "É por isso que a dor não melhora sozinha. O plano rompe o ciclo no ponto certo.",
    rng.pick(c.closings).sub,
  ],

  carousel: (c, rng) => {
    const car = rng.pick(c.carousels);
    return [
      car.title,
      [...car.slides.map((s) => `${s.heading} — ${s.body}`), "", `${car.cta.title}. ${car.cta.sub}`].join("\n"),
    ];
  },
  ecosystem: (c, rng) => {
    const ecosystem = rng.pick(c.ecosystems ?? []);
    return [
      ecosystem.title,
      [ecosystem.promise, ...ecosystem.steps.map((step) => `${step.label}: ${step.body}`), ecosystem.closing].join("\n"),
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

  // Eixo temático: as provas seguem o assunto do gancho (top 5 afins, sorteia 3).
  const ranked = rankProofsByAxis(`${hook} ${context}`, sales.proofs);
  const proofs = rng.pickMany(ranked.slice(0, Math.max(3, Math.min(5, ranked.length))), 3);
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
  ].map(stripColdSpecs).join("\n");
};
