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
import { lowerInitial, readsWell } from "@/pages/studio/grammar";
import { isStudioSelfBrand } from "@/pages/studio/persuasion";
import type { ContentAngle } from "./audiences";
import type { Relation } from "./relational";
import { findStudioSelfCharm, type StudioSelfCharmRow } from "./studioSelfCharm";
import { professionFor, wantsProfession } from "./professions";

import { findAliviaCoreCharm, isAliviaCoreBrand, type AliviaCoreCharmRow } from "./aliviaCoreCharm";
import { matchesVestibular, vestibularLines } from "./vestibularLexicon";
import { matchesMsk, mskLines } from "./mskLexicon";


const clean = (text?: string) => (text ?? "").trim().replace(/\s+/g, " ");
const noDot = (text?: string) => clean(text).replace(/\s*[.!?…]+$/, "");
const lower1 = lowerInitial;
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
      strong: "Nem toda tontura é labirintite",
      rest: ". Muitas vezes é um cristal no canal errado.",
    },
    sub: "A avaliação de VPPB mostra qual canal semicircular está envolvido; as manobras posicionais corretivas vêm depois disso.",
    cta: "Investigar a minha tontura",
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
  brand?: string,
): WorldContent => {
  const probe = [
    relation?.keyword,
    relation?.who,
    relation?.audience?.label,
    relation?.audience?.description,
    relation?.hook,
  ]
    .filter(Boolean)
    .join(" · ");
  const vestibular = matchesVestibular(probe);

  /**
   * TONTURA: o público vestibular ganha o vocabulário real (labirintite, VPPB,
   * cristais/otocônias, canais semicirculares, avaliação e manobras posicionais
   * corretivas) em qualquer ângulo — inclusive "informar".
   */
  const base = vestibular
    ? (() => {
        const lines = vestibularLines(`${brand ?? "marca"}:${probe}:${angle}`);
        return {
          ...content,
          headlines: [...lines.headlines, ...content.headlines],
          subs: [...lines.subs, ...content.subs],
          quotes: [...lines.quotes, ...content.quotes],
          lists: [
            { heading: "Tontura: o que é o quê", items: lines.glossary, closing: lines.ctas[0] },
            ...content.lists,
          ],
          sales: { ...content.sales, ctas: [...new Set([...lines.ctas, ...content.sales.ctas])] },
        };
      })()
    : content;

  /**
   * ESPORTISTA / PÓS-OPERATÓRIO / DOR CRÔNICA: vocabulário concreto de lesões
   * (LCA, menisco, manguito rotador, ombro do arremessador, lesão muscular,
   * tendinopatias, dor patelofemoral, impactação do quadril, entorse de
   * tornozelo). Vale para qualquer ângulo, inclusive "informar".
   */
  const withMsk = (() => {
    if (vestibular || !matchesMsk(probe)) return base;
    const lines = mskLines(probe, `${brand ?? "marca"}:${probe}:${angle}`);
    if (!lines) return base;
    return {
      ...base,
      headlines: [...lines.headlines, ...base.headlines],
      subs: [...lines.subs, ...base.subs],
      quotes: [...lines.quotes, ...base.quotes],
      lists: [
        { heading: `${lines.topic.glossary[0]?.term ?? "Lesão"}: o que é o quê`, items: lines.glossary, closing: lines.ctas[0] },
        ...base.lists,
      ],
      sales: { ...base.sales, ctas: [...new Set([...lines.ctas, ...base.sales.ctas])] },
    };
  })();

  if (angle === "informar") return withMsk;

  content = withMsk;

  /**
   * Marca do próprio produto: o guia de copy do manual do Aliv.iA Studio tem
   * precedência sobre a tabela de sub-nichos clínicos (que fala de paciente).
   */
  const selfRow: StudioSelfCharmRow | undefined = isStudioSelfBrand(brand ?? "")
    ? findStudioSelfCharm(probe)
    : undefined;


  /**
   * Marca Aliv.iA (app clínico): acervo próprio dos 6 públicos do guia
   * (paciente, autônomo, clínica, estudante, recém-formado, institucional).
   * Nunca vale para o Studio nem para marcas de cliente.
   */
  const coreRow: AliviaCoreCharmRow | undefined =
    !selfRow && isAliviaCoreBrand(brand ?? "") ? findAliviaCoreCharm(probe) : undefined;

  const row: SubNicheCharm | StudioSelfCharmRow | AliviaCoreCharmRow | undefined =
    selfRow ?? coreRow ?? findSubNicheCharm(relation);
  // O molde do ângulo "dor" usa a palavra dor literalmente. Em vestibular,
  // preservamos a intenção (nomear o incômodo), mas só com o léxico específico.
  const frames = relation && !vestibular
    ? charmFrames(relation, angle)
    : { headlines: [], subs: [], closings: [] };
  const cta = charmCta(relation?.cta ?? "");

  /**
   * PROFISSÃO CONCRETA: nos públicos genéricos do guia do Studio (autônomo,
   * pequena empresa, serviço local), a arte nomeia uma profissão real para quem
   * lê se reconhecer na primeira linha. Determinístico pelo acervo do lote.
   */
  const professional =
    selfRow && wantsProfession(selfRow.id)
      ? professionFor(`${selfRow.id}:${relation?.keyword ?? ""}:${content.headlines[0]?.strong ?? ""}`)
      : undefined;
  const professionLines = professional
    ? {
        headline: {
          strong: `Você é ${professional.noun}`,
          rest: `, não social media do seu próprio ${professional.place.replace(/^n[oa]s? /, "")}.`,
        },
        sub: `O seu dia é ${professional.work} — e ainda sobra o feed para resolver ${professional.place}. O Studio devolve essa parte para você.`,
      }
    : undefined;

  const headlines = [
    ...(professionLines ? [professionLines.headline] : []),
    ...(row ? [row.headline] : []),
    ...frames.headlines,
    ...content.headlines,
  ];
  const subs = [
    ...(professionLines ? [professionLines.sub] : []),
    ...(row ? [row.sub] : []),
    ...frames.subs,
    ...content.subs,
  ];

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
