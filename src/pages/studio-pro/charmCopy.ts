/**
 * ACERVO CHARMOSO — venda, dor e desejo
 *
 * Duas camadas, ambas locais e determinísticas:
 *
 * 1. `SUBNICHE_CHARM` — tabela "abordagem comum (fria) x abordagem charmosa"
 *    entregue pelo dono do produto (Guia Prático de Escrita, ago/2026). Cada
 *    linha vale para o SUB-NICHO, não para uma marca: qualquer marca que tenha
 *    um público de dor crônica, esportista, pós-operatório, 60+, vestibular ou
 *    feridas passa a escrever assim nos ângulos de venda/dor/desejo. A coluna
 *    fria fica registrada só como contraexemplo (nunca é renderizada).
 *
 * 2. `charmFrames` — frases construídas com os ingredientes da relação eleita
 *    (público × medo/desejo × prova × CTA) seguindo os pilares de
 *    `@/pages/studio/charm`: empatia estruturada, foco no "você", ritmo com
 *    remate seco, antecipação e convite seguro.
 *
 * Nada aqui altera o kit da marca: é acervo de redação, lido em tempo de
 * geração. Os ajustes de marca continuam sendo a fonte primária do conteúdo.
 */

import type { WorldContent } from "@/pages/studio/content";
import { charmCta, charmify, empathyBridge } from "@/pages/studio/charm";
import { readsWell } from "@/pages/studio/grammar";
import type { ContentAngle } from "./audiences";
import type { Relation } from "./relational";

const clean = (text?: string) => (text ?? "").trim().replace(/\s+/g, " ");
const noDot = (text?: string) => clean(text).replace(/\s*[.!?…]+$/, "");
const lower1 = (text: string) => (text ? text.charAt(0).toLowerCase() + text.slice(1) : text);
const upper1 = (text: string) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

export type SubNicheCharm = {
  id: string;
  /** Termos que identificam o público (palavra-chave, rótulo ou descrição). */
  match: RegExp;
  /** Contraexemplo: como NÃO escrever. Documental — nunca vai para a arte. */
  cold: string;
  /** Ponto zero charmoso (título da arte). */
  headline: { strong: string; rest: string };
  /** Apoio que faz a ponte lógica até o método. */
  sub: string;
  /** Convite seguro. */
  cta: string;
};

export const SUBNICHE_CHARM: SubNicheCharm[] = [
  {
    id: "dor-cronica",
    match: /dor\s+cr[oô]nica|dor\s+persistente|dor\s+h[aá]\s+meses/i,
    cold: "Tratamento para dores persistentes com tecnologia. Agende sua sessão hoje.",
    headline: {
      strong: "Se você já tentou de tudo",
      rest: " e ainda não entendeu a sua dor, o problema pode estar na abordagem.",
    },
    sub: "Onde a dor insistiu em ficar, o raciocínio clínico encontra a saída.",
    cta: "Entender a minha dor",
  },
  {
    id: "esportista",
    match: /esportista|atleta|performance|corrida|treino|esporte/i,
    cold: "Fisioterapia esportiva para atletas amadores e profissionais. Volte a treinar.",
    headline: {
      strong: "O seu retorno ao esporte",
      rest: " precisa acontecer com critério, não com pressa.",
    },
    sub: "Vamos desenhar um plano específico para você voltar à atividade que gosta com confiança real.",
    cta: "Quero voltar com critério",
  },
  {
    id: "pos-operatorio",
    match: /p[oó]s[-\s]?operat[oó]rio|p[oó]s[-\s]?cir[uú]rgic|acabou de operar/i,
    cold: "Reabilitação pós-cirúrgica ortopédica especializada. Marque uma avaliação.",
    headline: {
      strong: "A cirurgia foi apenas o primeiro passo",
      rest: ". O que vem depois define o seu resultado.",
    },
    sub: "A sua reabilitação é construída fase a fase, com plano claro e critério para avançar.",
    cta: "Quero um plano por fases",
  },
  {
    id: "60-mais",
    match: /60\s*\+|sessenta|idos[oa]|terceira idade|gera[çc][ãa]o\s*60/i,
    cold: "Fisioterapia preventiva para idosos. Melhoramos seu equilíbrio e força física.",
    headline: {
      strong: "Envelhecer em movimento",
      rest: " é uma escolha, e ela começa antes da primeira queda.",
    },
    sub: "O foco é devolver a sua autonomia, força e confiança para manter a rotina que você ama.",
    cta: "Cuidar do meu movimento",
  },
  {
    id: "vestibular",
    match: /vestibular|tontura|vertigem|labirintite|equil[ií]brio corporal/i,
    cold: "Tratamento eficaz para labirintite e tontura. Entre em contato com a clínica.",
    headline: {
      strong: "Tontura e vertigem",
      rest: " não devem ditar o seu ritmo.",
    },
    sub: "Com avaliação estruturada, o problema é investigado e tratado direto na causa.",
    cta: "Recuperar o meu equilíbrio",
  },
  {
    id: "feridas",
    match: /ferida|[uú]lcera|cicatriza[çc][ãa]o|curativo|les[ãa]o de pele/i,
    cold: "Cuidamos de feridas complexas. Temos os melhores curativos do mercado.",
    headline: {
      strong: "O seu maior desejo",
      rest: " é fechar essa ferida de forma permanente.",
    },
    sub: "Com avaliação rigorosa e tecnologia própria, o foco é a cicatrização avançada.",
    cta: "Parar de adiar esse cuidado",
  },
];

/** Encontra a linha charmosa do público ativo (palavra-chave, rótulo, descrição). */
export const findSubNicheCharm = (relation?: Relation): SubNicheCharm | undefined => {
  if (!relation) return undefined;
  const probe = [
    relation.keyword,
    relation.who,
    relation.audience?.label,
    relation.audience?.description,
    relation.hook,
  ]
    .filter(Boolean)
    .join(" · ");
  if (!probe.trim()) return undefined;
  return SUBNICHE_CHARM.find((row) => row.match.test(probe));
};

/**
 * Frases charmosas construídas com a relação da arte. Só entram frases que
 * passam pelo portão de português — insumo faltando simplesmente não gera slot.
 */
const charmFrames = (
  relation: Relation,
  angle: ContentAngle,
): { headlines: { strong: string; rest: string }[]; subs: string[]; closings: { title: string; sub: string; cta: string }[] } => {
  const pain = noDot(relation.pain);
  const desire = noDot(relation.desire);
  const proof = noDot(relation.proof);
  const cta = charmCta(relation.cta);

  const headlines: { strong: string; rest: string }[] = [];
  const subs: string[] = [];

  const push = (strong: string, rest: string) => {
    const full = `${strong}${rest}`;
    if (strong && readsWell(full)) headlines.push({ strong, rest });
  };
  const pushSub = (text: string) => {
    const out = charmify(text, { role: "support" });
    if (out && readsWell(out) && !subs.includes(out)) subs.push(out);
  };

  if (angle === "dor" && pain) {
    push(`Se ${lower1(pain)} já virou rotina`, ", o problema pode estar na abordagem.");
    push("Não é falta de força de vontade", `. É ${lower1(pain)} sem explicação até agora.`);
    const bridge = empathyBridge(pain, proof || "Existe um caminho com critério para o seu caso");
    if (bridge) pushSub(bridge);
    if (desire) pushSub(`Você não precisa aceitar isso como normal. ${upper1(lower1(desire))} continua possível.`);
  }

  if (angle === "desejo" && desire) {
    push(`Imagine a sensação de ${lower1(desire)}`, " em uma semana comum, sem pensar duas vezes.");
    push("Tem um detalhe do seu caso", " que muda o plano inteiro.");
    pushSub(`É para lá que o plano aponta. ${proof ? upper1(lower1(proof)) + "." : "O primeiro passo é entender o seu caso."}`);
  }

  if (angle === "venda") {
    if (pain) push(`Onde ${lower1(pain)} insistiu em ficar`, ", um raciocínio bem feito encontra a saída.");
    if (desire) push(`${upper1(lower1(desire))} não é sorte`, ". É consequência de um plano com critério.");
    if (proof) pushSub(`${upper1(lower1(proof))}. O resto se decide olhando o seu caso.`);
    pushSub("Sem pressa e sem promessa: primeiro a gente entende, depois a gente conduz.");
  }

  const closings = headlines.length
    ? [
        { title: charmify(`${headlines[0].strong}${headlines[0].rest}`, { role: "title" }), sub: subs[0] ?? "", cta },
        { title: "Descubra o que estava faltando", sub: subs[1] ?? subs[0] ?? "", cta },
      ]
    : [];

  return { headlines, subs, closings };
};

/**
 * Aplica a escrita charmosa ao acervo — SOMENTE nos ângulos de venda, dor e
 * desejo. O ângulo "informar" segue intocado.
 */
export const applyCharm = (
  content: WorldContent,
  angle: ContentAngle,
  relation?: Relation,
): WorldContent => {
  if (angle === "informar") return content;

  const row = findSubNicheCharm(relation);
  const frames = relation ? charmFrames(relation, angle) : { headlines: [], subs: [], closings: [] };
  const cta = charmCta(relation?.cta ?? "");

  const headlines = [
    ...(row ? [row.headline] : []),
    ...frames.headlines,
    ...content.headlines,
  ];
  const subs = [...(row ? [row.sub] : []), ...frames.subs, ...content.subs];
  const closings = [
    ...(row ? [{ title: `${row.headline.strong}${row.headline.rest}`, sub: row.sub, cta: row.cta }] : []),
    ...frames.closings,
    ...content.closings.map((c, i) => ({ ...c, cta: charmCta(c.cta, i) })),
  ];

  return {
    ...content,
    headlines,
    subs,
    closings,
    quotes: [...(row ? [{ text: `“${row.sub}”` }] : []), ...content.quotes],
    sales: {
      ...content.sales,
      ctas: [...new Set([...(row ? [row.cta] : []), cta, ...content.sales.ctas.map((c, i) => charmCta(c, i))].filter(Boolean))],
      objections: content.sales.objections.map((o) => charmify(o, { role: "support" })),
      offers: content.sales.offers.map((o) => charmify(o, { role: "support" })),
    },
  };
};
