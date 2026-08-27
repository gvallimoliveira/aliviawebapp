import type { WorldContent } from "@/pages/studio/content";
import type { TopicId } from "@/pages/studio/topics";
import { GLOBAL_SEGMENT, type BrandAudience, type ContentAngle } from "./audiences";

/**
 * CONTEÚDO EDITORIAL GENÉRICO DE UMA MARCA DO CLIENTE
 *
 * O motor de artes é o mesmo do Studio interno, mas o acervo de copy aqui é
 * neutro: nasce do kit de marca (nome, nicho, tom) e nunca fala de fisioterapia
 * nem cita o Aliv.iA.
 *
 * REGRA DE IMAGEM: só usamos `topic` sem screenshot cadastrado — nenhuma tela do
 * app clínico pode vazar para a arte de um cliente. Os tópicos abaixo existem
 * apenas para alimentar o estudo de cobertura do motor.
 */
const NEUTRAL_TOPICS: TopicId[] = [
  "pricing",
  "documents",
  "archive",
  "governance",
  "multi-condition",
  "steps-method",
  "difi",
  "shared-record",
  "institutional-link",
  "discharge-report",
];

const topicAt = (i: number) => NEUTRAL_TOPICS[i % NEUTRAL_TOPICS.length];

export type BrandKit = {
  name: string;
  niche?: string | null;
  tone?: string | null;
  /** Descrição livre do que a marca faz (alimenta subtítulos e legendas). */
  description?: string | null;
  /** Palavras-chave da marca (alimentam kickers e marquee). */
  keywords?: string[] | null;
};

/** Slogan padrão quando a marca ainda não escreveu o dela. */
export const brandSlogan = (kit: BrandKit) =>
  kit.tone?.trim() || (kit.niche?.trim() ? `${kit.niche.trim()} com presença todo dia.` : "Presença digital todo dia.");

/**
 * Monta o acervo de copy da marca no contrato `WorldContent`, para que todos os
 * blocos (hero, stats, carrossel, storytelling…) funcionem sem alteração.
 */
export const buildBrandContent = (kit: BrandKit): WorldContent => {
  const brand = kit.name.trim() || "Sua marca";
  const niche = (kit.niche ?? "").trim() || "o seu mercado";
  const tone = brandSlogan(kit);
  const words = (kit.keywords ?? []).map((w) => w.trim()).filter(Boolean);
  const description = (kit.description ?? "").trim();

  return {
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
    headlines: [
      { strong: brand, rest: " existe para resolver o que ninguém resolveu." },
      { strong: "Feito com método", rest: `, não com sorte.` },
      { strong: "Quem escolhe bem", rest: " volta." },
      { strong: `A referência em ${niche}`, rest: " começa aqui." },
      { strong: "Simples de entender.", rest: " Difícil de esquecer." },
    ],
    subs: [
      tone,
      ...(description ? [description] : []),
      `${brand} trabalha com processo claro, do primeiro contato à entrega.`,
      `Em ${niche}, detalhe não é enfeite — é resultado.`,
      "Uma decisão bem tomada economiza meses.",
    ],
    kinetic: [
      { kicker: "O QUE MOVE A MARCA", word: "Cuidado", caption: "Cada entrega passa por revisão." },
      { kicker: "NOSSA APOSTA", word: "Constância", caption: "Aparecer sempre vence aparecer muito." },
      { kicker: "PROMESSA", word: "Clareza", caption: "Você sabe o que vai receber antes de fechar." },
    ],
    metrics: [
      [
        { value: 100, suffix: "%", label: "das entregas com revisão final" },
        { value: 48, suffix: "h", label: "para o primeiro retorno" },
        { value: 9, suffix: "/10", label: "clientes indicariam" },
      ],
      [
        { value: 12, label: "meses de acompanhamento" },
        { value: 3, label: "etapas até o resultado" },
        { value: 0, label: "surpresa no orçamento" },
      ],
    ],
    stats: [
      {
        heading: "Números que a gente assume",
        items: [
          { value: "48h", label: "para responder", note: "sem cliente esperando no vácuo" },
          { value: "3 etapas", label: "do briefing à entrega", note: "processo simples de acompanhar" },
          { value: "1 responsável", label: "por projeto", note: "você sempre sabe com quem falar" },
        ],
      },
      {
        heading: "O que muda com processo",
        items: [
          { value: "-40%", label: "de retrabalho", note: "o combinado fica escrito" },
          { value: "2x", label: "mais previsibilidade", note: "prazo é compromisso" },
          { value: "100%", label: "do escopo revisado", note: "nada entra sem aprovação" },
        ],
      },
    ],
    triptychs: [
      {
        heading: "Três palavras que resumem a marca",
        panels: [
          { word: "Escuta", line: "Entender antes de propor.", topic: topicAt(0) },
          { word: "Método", line: "Cada etapa com começo e fim.", topic: topicAt(1) },
          { word: "Entrega", line: "No prazo combinado.", topic: topicAt(2) },
        ],
      },
      {
        heading: "Como a gente trabalha",
        panels: [
          { word: "Simples", line: "Sem jargão, sem letra miúda.", topic: topicAt(3) },
          { word: "Direto", line: "Um responsável, um canal.", topic: topicAt(4) },
          { word: "Honesto", line: "O que não cabe, a gente avisa.", topic: topicAt(5) },
        ],
      },
    ],
    typos: [
      { lead: "A gente cuida do processo.", big: "Você", tail: " colhe o resultado." },
      { lead: "Menos promessa.", big: "Mais entrega", tail: "." },
      { lead: `Em ${niche},`, big: " consistência", tail: " vale mais que sorte." },
      { lead: "O barato sai caro.", big: "O certo", tail: " sai uma vez." },
      { lead: "Detalhe não é enfeite.", big: "É resultado", tail: "." },
      { lead: brand, big: " existe", tail: " para resolver." },
    ],
    compare: [
      {
        title: "Antes e depois de trabalhar com processo",
        before: ["Prazo aberto", "Escopo confuso", "Retrabalho constante", "Cliente perdido no meio"],
        after: ["Prazo escrito", "Escopo aprovado", "Revisão a cada etapa", "Um responsável do início ao fim"],
      },
      {
        title: `Como ${brand} encara ${niche}`,
        before: ["Achismo", "Correria", "Improviso"],
        after: ["Diagnóstico", "Planejamento", "Execução medida"],
      },
      {
        title: "Escolher por preço x escolher por resultado",
        before: ["Mais barato agora", "Refazer depois"],
        after: ["Investimento claro", "Uma vez, bem feito"],
      },
    ],
    journeys: [
      {
        kicker: "COMO FUNCIONA",
        heading: "Três etapas até o resultado",
        steps: [
          { title: "Conversa inicial", description: "Entendemos o cenário e o que você quer alcançar.", topic: topicAt(0) },
          { title: "Plano combinado", description: "Escopo, prazo e valor no papel, sem letra miúda.", topic: topicAt(1) },
          { title: "Execução e entrega", description: "Você acompanha cada etapa até a entrega final.", topic: topicAt(2) },
        ],
      },
      {
        kicker: "DO PRIMEIRO CONTATO À ENTREGA",
        heading: "Nada acontece sem o seu aval",
        steps: [
          { title: "Diagnóstico", description: "O que está travando hoje.", topic: topicAt(3) },
          { title: "Proposta", description: "O caminho mais curto até o resultado.", topic: topicAt(4) },
          { title: "Acompanhamento", description: "Ajustes com você, não depois de você.", topic: topicAt(5) },
          { title: "Fechamento", description: "Entrega revisada e documentada.", topic: topicAt(6) },
        ],
      },
    ],
    features: [
      {
        tag: "PROCESSO",
        title: "Escopo escrito antes de começar",
        description: "Você aprova o que será feito, o prazo e o valor. Nada entra depois sem combinar.",
        topic: topicAt(0),
        headline: "O combinado no papel",
      },
      {
        tag: "ATENDIMENTO",
        title: "Um responsável do início ao fim",
        description: "Sem repetir a sua história para três pessoas diferentes.",
        topic: topicAt(1),
        headline: "Uma pessoa, um canal",
      },
      {
        tag: "QUALIDADE",
        title: "Revisão final obrigatória",
        description: "Nenhuma entrega sai sem passar por uma última leitura crítica.",
        topic: topicAt(2),
        headline: "Ninguém entrega no escuro",
      },
      {
        tag: "TRANSPARÊNCIA",
        title: "Você acompanha cada etapa",
        description: "Atualizações objetivas, sem precisar cobrar notícia.",
        topic: topicAt(3),
        headline: "Sem cliente no vácuo",
      },
    ],
    quotes: [
      { text: `“${tone}”` },
      { text: "“Fui atendida por uma pessoa só, do começo ao fim.”" },
      { text: "“O orçamento foi o mesmo do início ao fim.”" },
      { text: "“Entregaram no dia combinado. Isso já é raro.”" },
    ],
    marquee: [
      [brand, niche, "processo", "entrega", "constância"],
      words.length >= 3 ? words.slice(0, 6) : ["clareza", "prazo", "revisão", "resultado"],
      ["escuta", "método", "cuidado", brand],
    ],
    closings: [
      { title: "Vamos conversar?", sub: `Conte o seu cenário e ${brand} responde com um caminho.`, cta: "Chamar no direct" },
      { title: "Sua próxima entrega pode ser diferente", sub: "Comece por uma conversa sem compromisso.", cta: "Falar com a gente" },
      { title: `${brand} está com agenda aberta`, sub: "Poucas vagas por mês para manter o padrão.", cta: "Garantir a minha vaga" },
      { title: "Compartilhe com quem precisa", sub: "Alguém do seu contato está procurando isso hoje.", cta: "Enviar agora" },
    ],
    stories: [
      {
        kicker: "CLIENTE REAL, NOME PROTEGIDO",
        title: "Ela chegou depois de dois orçamentos frustrados",
        beats: [
          "O primeiro prometeu rápido e sumiu.",
          "O segundo cobrou a mais no meio do caminho.",
          "Na terceira tentativa, ela pediu tudo por escrito.",
        ],
        turn: "Foi a primeira vez que o prazo bateu com o combinado.",
        moral: "Processo não é burocracia — é respeito com quem paga.",
      },
      {
        kicker: "ACONTECE TODA SEMANA",
        title: "O projeto que travou por falta de uma conversa",
        beats: ["Ninguém tinha a visão completa.", "Cada etapa dependia de um lembrete.", "O prazo virou opinião."],
        turn: "Bastou definir um responsável para tudo destravar.",
        moral: "Clareza economiza mais tempo que pressa.",
      },
    ],
    lists: [
      {
        heading: "4 sinais de que você está no lugar errado",
        items: [
          "O orçamento muda no meio do caminho",
          "Você precisa cobrar notícia",
          "Ninguém assume o prazo",
          "O escopo nunca foi escrito",
        ],
        closing: `${brand} resolve os quatro no primeiro encontro.`,
      },
      {
        heading: "3 perguntas antes de contratar qualquer serviço",
        items: ["Quem é o meu responsável?", "O que exatamente está incluído?", "O que acontece se atrasar?"],
        closing: "Se a resposta demora, o problema já começou.",
      },
    ],
    carousels: [
      {
        kicker: "PASSO A PASSO",
        title: "Como a gente trabalha",
        coverSub: `${brand}, sem mistério.`,
        slides: [
          { heading: "1. Conversa", body: "Entendemos o cenário antes de propor qualquer coisa.", topic: topicAt(0) },
          { heading: "2. Plano", body: "Escopo, prazo e valor escritos e aprovados por você.", topic: topicAt(1) },
          { heading: "3. Entrega", body: "Execução acompanhada, com revisão final obrigatória.", topic: topicAt(2) },
        ],
        cta: { title: "Quer começar?", sub: "Manda uma mensagem — a primeira conversa é sem compromisso." },
      },
      {
        kicker: "GUIA RÁPIDO",
        title: `3 erros comuns em ${niche}`,
        coverSub: "E como evitar cada um.",
        slides: [
          { heading: "Escolher só pelo preço", body: "O barato costuma cobrar duas vezes.", topic: topicAt(3) },
          { heading: "Começar sem escopo", body: "Sem combinado escrito, todo mundo perde.", topic: topicAt(4) },
          { heading: "Aceitar prazo vago", body: "Data sem responsável é só desejo.", topic: topicAt(5) },
        ],
        cta: { title: "Evite os três", sub: `Fale com ${brand} antes de fechar qualquer coisa.` },
      },
    ],
    sales: {
      audience: niche,
      proofs: [
        "Escopo, prazo e valor escritos antes de começar",
        "Um responsável do início ao fim",
        "Revisão final em toda entrega",
      ],
      objections: [
        "Não é mais caro: é previsível.",
        "Não precisa decidir hoje — a primeira conversa é sem compromisso.",
      ],
      offers: ["Primeira conversa gratuita", "Agenda limitada por mês para manter o padrão"],
      ctas: ["Chama no direct", "Manda mensagem", "Comenta aqui que eu te chamo"],
      hashtags: [brand.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(), niche.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()],
    },
  };
};

/* ------------------------------------------------------------------------- */
/* SEGMENTAÇÃO: nicho específico x visão global 360°                          */
/* ------------------------------------------------------------------------- */

/**
 * Aplica um público (nicho) sobre o acervo base: dores, desejos, provas e CTA
 * daquele segmento entram na frente, mantendo todos os outros blocos vivos.
 */
const applyAudience = (base: WorldContent, brand: string, audience: BrandAudience): WorldContent => {
  const who = audience.label.trim();
  const pains = audience.pains ?? [];
  const desires = audience.desires ?? [];
  const proof = audience.proof ?? [];
  const cta = audience.cta?.trim() || "Falar com a gente";
  const desc = audience.description?.trim();

  return {
    ...base,
    label: `${brand} · ${who}`,
    kickers: [`PARA ${who.toUpperCase()}`, who.toUpperCase(), ...base.kickers],
    headlines: [
      ...(pains[0] ? [{ strong: pains[0], rest: " não precisa ser a sua rotina." }] : []),
      ...(desires[0] ? [{ strong: desires[0], rest: " começa com uma decisão." }] : []),
      { strong: `Feito para ${who.toLowerCase()}`, rest: ", não para todo mundo." },
      ...base.headlines,
    ],
    subs: [...(desc ? [desc] : []), ...proof.slice(0, 2), ...base.subs],
    kinetic: [
      ...(pains[0] ? [{ kicker: `A DOR DE ${who.toUpperCase()}`, word: "Hoje", caption: pains[0] }] : []),
      ...(desires[0] ? [{ kicker: "O QUE MUDA", word: "Depois", caption: desires[0] }] : []),
      ...base.kinetic,
    ],
    compare: [
      ...(pains.length && desires.length
        ? [{ title: `${who}: antes e depois`, before: pains, after: desires }]
        : []),
      ...base.compare,
    ],
    lists: [
      ...(pains.length >= 3
        ? [{
            heading: `${pains.length} coisas que ${who.toLowerCase()} não deveria aceitar`,
            items: pains,
            closing: `${brand} resolve isso com processo, não com promessa.`,
          }]
        : []),
      ...base.lists,
    ],
    quotes: [...(desires[0] ? [{ text: `“${desires[0]}.”` }] : []), ...base.quotes],
    marquee: [[who, ...pains.slice(0, 2), ...desires.slice(0, 2)].filter(Boolean), ...base.marquee],
    closings: [
      { title: `${who}: o próximo passo é seu`, sub: desires[0] ?? `Fale com ${brand} hoje.`, cta },
      ...base.closings,
    ],
    sales: {
      ...base.sales,
      audience: who,
      proofs: proof.length ? proof : base.sales.proofs,
      objections: pains.length ? [`Você já tentou e não deu certo? O problema era ${pains[0].toLowerCase()}.`, ...base.sales.objections] : base.sales.objections,
      ctas: [cta, ...base.sales.ctas],
    },
  };
};

/**
 * Visão 360°: interpola todos os nichos numa leitura única do produto — um
 * painel por público, para mostrar amplitude sem perder concretude.
 */
const applyGlobal = (
  base: WorldContent,
  brand: string,
  audiences: BrandAudience[],
  positioning?: string | null,
): WorldContent => {
  if (!audiences.length) {
    return positioning?.trim() ? { ...base, subs: [positioning.trim(), ...base.subs] } : base;
  }
  const labels = audiences.map((a) => a.label);
  const panels = audiences.slice(0, 3).map((a, i) => ({
    word: a.label,
    line: a.desires?.[0] ?? a.description ?? "Um caminho claro para esse perfil.",
    topic: topicAt(i),
  }));

  return {
    ...base,
    kickers: ["VISÃO 360°", `UM PRODUTO, ${labels.length} PÚBLICOS`, ...base.kickers],
    headlines: [
      { strong: `${labels.length} públicos`, rest: ", um só padrão de qualidade." },
      { strong: brand, rest: ` atende ${labels.slice(0, 3).join(", ").toLowerCase()} no mesmo lugar.` },
      ...base.headlines,
    ],
    subs: [...(positioning?.trim() ? [positioning.trim()] : []), ...base.subs],
    triptychs: [
      ...(panels.length === 3 ? [{ heading: "Para quem é", panels }] : []),
      ...base.triptychs,
    ],
    lists: [
      {
        heading: "Para quem o produto foi feito",
        items: audiences.map((a) => `${a.label} — ${a.desires?.[0] ?? a.description ?? "resultado claro"}`),
        closing: "Cada perfil entra por uma porta diferente e chega ao mesmo padrão.",
      },
      ...base.lists,
    ],
    marquee: [labels, ...base.marquee],
    carousels: [
      {
        kicker: "VISÃO GERAL",
        title: `${brand} por dentro`,
        coverSub: `Um produto, ${labels.length} públicos.`,
        slides: audiences.slice(0, 5).map((a, i) => ({
          heading: a.label,
          body: a.pains?.[0] ? `${a.pains[0]} → ${a.desires?.[0] ?? "caminho claro"}.` : a.description ?? "",
          topic: topicAt(i),
        })),
        cta: { title: "Em qual desses você se encaixa?", sub: "Responde aqui que eu te mostro o caminho." },
      },
      ...base.carousels,
    ],
    sales: {
      ...base.sales,
      audience: labels.join(", "),
      proofs: audiences.flatMap((a) => a.proof?.slice(0, 1) ?? []).concat(base.sales.proofs).slice(0, 6),
    },
  };
};

/**
 * Ângulo estratégico: reordena o acervo para privilegiar a intenção do post
 * (informar, nomear a dor, gerar desejo ou vender).
 */
const applyAngle = (content: WorldContent, angle: ContentAngle): WorldContent => {
  const rotate = <T,>(list: T[], n: number): T[] =>
    list.length > 1 ? [...list.slice(n % list.length), ...list.slice(0, n % list.length)] : list;

  switch (angle) {
    case "dor":
      return { ...content, kickers: ["ISSO É COM VOCÊ", ...content.kickers] };
    case "desejo":
      return {
        ...content,
        kickers: ["IMAGINA ASSIM", ...content.kickers],
        headlines: rotate(content.headlines, 1),
        kinetic: rotate(content.kinetic, 1),
      };
    case "venda":
      return {
        ...content,
        kickers: ["AGENDA ABERTA", ...content.kickers],
        headlines: rotate(content.headlines, 2),
        closings: rotate(content.closings, 0),
        sales: { ...content.sales, ctas: content.sales.ctas },
      };
    case "informar":
    default:
      return {
        ...content,
        kickers: ["ENTENDA EM 1 MINUTO", ...content.kickers],
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
};

/**
 * Ponto de entrada único do motor: resolve marca + segmento + ângulo em um
 * `WorldContent`. Serve para qualquer cliente, com ou sem nichos cadastrados.
 */
export const buildSegmentContent = ({
  kit,
  base,
  audiences,
  segment,
  angle,
  positioning,
}: SegmentContentInput): WorldContent => {
  const brand = kit.name.trim() || "Sua marca";
  const root = base ?? buildBrandContent(kit);
  if (segment === GLOBAL_SEGMENT) {
    return applyAngle(applyGlobal(root, brand, audiences, positioning), angle);
  }
  const audience = audiences.find((a) => a.id === segment);
  if (!audience) return applyAngle(root, angle);
  return applyAngle(applyAudience(root, brand, audience), angle);
};
