import type { WorldContent } from "@/pages/studio/content";
import type { TopicId } from "@/pages/studio/topics";

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

  return {
    id: "pro",
    label: brand,
    kickers: [
      brand.toUpperCase(),
      `${niche.toUpperCase()}`,
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
      ["clareza", "prazo", "revisão", "resultado"],
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
