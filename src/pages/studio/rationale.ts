/**
 * FILTRO INTERNO DE NEXO (leitura de sentido de cada arte)
 *
 * Regra da casa: nenhuma arte sai do Studio sem que o motor consiga EXPLICAR,
 * em linguagem de leigo, três coisas:
 *
 *   1. o que a pessoa vê (elementos),
 *   2. o que a arte diz (mensagem, ancorada no público real da marca),
 *   3. o que ela quer despertar em quem lê (intenção).
 *
 * Se essa linha de raciocínio não fecha — falta matéria-prima no kit, o bloco
 * ficaria sem conteúdo, não há CTA, não há a quem falar — a arte NÃO é
 * intuitiva e é substituída por um formato que fecha o raciocínio. O filtro é
 * 100% local e determinístico: não gasta crédito de IA e a mesma seed continua
 * gerando a mesma arte.
 */
import type { BlockKind, ComposedBlock } from "./composePage";
import type { WorldContent } from "./content/types";
import { hasBannedJargon } from "./persuasion";

/** Explicação de uma arte, do jeito que se contaria para um leigo. */
export type ArtRationale = {
  kind: BlockKind;
  /** Nome do formato em linguagem comum ("cartaz de frase", "lista numerada"). */
  format: string;
  /** O que a pessoa vê na arte. */
  elements: string;
  /** O que a arte diz, com o público e a palavra-chave reais da marca. */
  message: string;
  /** O que a arte quer despertar em quem lê. */
  effect: string;
  /** Motivos que impedem a explicação de fechar. Vazio = arte aprovada. */
  gaps: string[];
  ok: boolean;
};

/** Contexto que o filtro precisa para julgar a arte. */
export type RationaleContext = {
  content: WorldContent;
  /** Nome do público ativo ("Dor crônica", "Clínica", "360°"). */
  audienceLabel: string;
  /** Palavra-chave que ancora o assunto na arte. */
  keyword: string;
  /** Chamada direta para o público ("Você que convive com dor há meses"). */
  hook: string;
  /** Objetivo/CTA do público. */
  cta: string;
  /** Objetivo do lote: informar, dor, desejo ou venda. */
  angle: "informar" | "dor" | "desejo" | "venda";
  /** Quantidade de fotos do acervo disponíveis para esta marca. */
  photoCount: number;
  brandName: string;
};

type Sense = {
  /** Nome do formato para leigo. */
  format: string;
  /** O que se vê. */
  sees: string;
  /** Que trabalho essa arte faz na comunicação. */
  job: string;
  /** Matéria-prima obrigatória: sem ela o bloco renderiza vazio ou genérico. */
  needs?: (c: WorldContent) => boolean;
  /** Depende do acervo de fotos da conta. */
  needsPhoto?: boolean;
  /** Nome do campo que falta, para a mensagem de lacuna. */
  needsLabel?: string;
};

const some = (arr?: unknown[]) => Array.isArray(arr) && arr.length > 0;

/**
 * Dicionário de sentido dos blocos. Cada linha é a resposta a "por que esta
 * arte existe?" — é daqui que sai a explicação mostrada ao cliente.
 */
const SENSE: Record<BlockKind, Sense> = {
  hero: {
    format: "abertura",
    sees: "uma frase grande de abertura com o assunto em destaque e uma linha de apoio",
    job: "apresentar o tema em dois segundos e prender a atenção antes do resto",
  },
  marquee: {
    format: "índice numerado",
    sees:
      "uma afirmação em cima, abaixo dela uma lista numerada com os pontos do assunto e, no pé, uma linha de fecho",
    job: "organizar o assunto em tópicos: quem passa o olho entende o escopo sem ler tudo",
    needs: (c) => some(c.marquee) && some(c.headlines),
    needsLabel: "tópicos do assunto e uma frase que diga o que a lista significa",
  },

  metrics: {
    format: "números",
    sees: "números grandes com o que cada um representa",
    job: "trocar promessa por evidência: quem duvida para no número",
    needs: (c) => some(c.metrics),
    needsLabel: "números/indicadores",
  },
  stats: {
    format: "números com contexto",
    sees: "números acompanhados de uma nota explicando de onde vêm",
    job: "sustentar a afirmação com contexto, evitando o número solto",
    needs: (c) => some(c.stats),
    needsLabel: "estatísticas com nota de contexto",
  },
  journey: {
    format: "passo a passo",
    sees: "etapas numeradas do começo ao resultado",
    job: "tirar o medo do desconhecido mostrando o caminho inteiro",
    needs: (c) => some(c.journeys),
    needsLabel: "etapas do processo",
  },
  feature: {
    format: "recurso em destaque",
    sees: "um recurso com título, explicação curta e imagem do próprio produto",
    job: "mostrar utilidade concreta de uma parte do serviço",
    needs: (c) => some(c.features),
    needsLabel: "soluções que você oferece",
  },
  compare: {
    format: "antes e depois",
    sees: "duas colunas: como é hoje e como fica depois",
    job: "deixar visível o custo de continuar como está",
    needs: (c) => some(c.compare),
    needsLabel: "contraste antes/depois",
  },
  kinetic: {
    format: "palavra em movimento",
    sees: "uma palavra forte em movimento com uma legenda curta",
    job: "gravar uma única ideia na memória",
    needs: (c) => some(c.kinetic),
    needsLabel: "palavras de impacto",
  },
  quote: {
    format: "frase de autoridade",
    sees: "uma frase entre aspas ocupando a arte",
    job: "emprestar credibilidade e convidar ao compartilhamento",
    needs: (c) => some(c.quotes),
    needsLabel: "frases de posicionamento",
  },
  typo: {
    format: "cartaz de frase",
    sees: "uma frase curta em tipografia grande com uma palavra em destaque",
    job: "entregar a ideia central de relance, sem nada para ler além dela",
    needs: (c) => some(c.typos) || some(c.headlines),
    needsLabel: "frases curtas da marca",
  },
  echo: {
    format: "frase repetida",
    sees: "a mesma ideia repetida em camadas, com uma variação em destaque",
    job: "criar ritmo e insistência sobre um único ponto",
    needs: (c) => some(c.typos) || some(c.headlines),
    needsLabel: "frases curtas da marca",
  },
  mono: {
    format: "cartaz de uma palavra",
    sees: "uma palavra sozinha, gigante, com assinatura da marca",
    job: "marcar território visual e reforçar identidade",
  },
  triptych: {
    format: "três pilares",
    sees: "três palavras com uma linha de explicação cada",
    job: "resumir a promessa em três apoios fáceis de lembrar",
    needs: (c) => some(c.triptychs),
    needsLabel: "três pilares da promessa",
  },
  pinup: {
    format: "cartaz ilustrado",
    sees: "um cartaz com ilustração autoral e uma chamada",
    job: "criar desejo pelo clima da imagem antes do argumento",
    needs: (c) => c.features.some((f) => !!f.poster),
    needsLabel: "ilustração de campanha",
  },
  story: {
    format: "mini-história",
    sees: "uma história curta em cenas, com uma virada e um fecho",
    job: "gerar identificação: quem se reconhece na cena confia no fecho",
    needs: (c) => some(c.stories),
    needsLabel: "casos anonimizados",
  },
  list: {
    format: "lista numerada",
    sees: "uma lista de itens numerados com um fecho",
    job: "entregar utilidade imediata, mesmo para quem ainda não conhece a marca",
    needs: (c) => some(c.lists),
    needsLabel: "listas de valor (sinais, erros, dicas)",
  },
  brand: {
    format: "assinatura da marca",
    sees: "o nome da marca, o contato e a frase de identidade",
    job: "fechar a sequência dizendo quem falou e onde encontrar",
  },
  carousel: {
    format: "carrossel",
    sees: "uma sequência: capa, desenvolvimento e arte de chamada no fim",
    job: "desenvolver um raciocínio inteiro e terminar pedindo a ação",
    needs: (c) => some(c.carousels),
    needsLabel: "roteiros de carrossel",
  },
  photoType: {
    format: "foto com frase",
    sees: "uma foto sua com uma frase por cima",
    job: "juntar prova real (é você, é o seu atendimento) com a mensagem",
    needsPhoto: true,
  },
  photoSplit: {
    format: "foto ao lado do texto",
    sees: "metade foto, metade texto explicando o assunto",
    job: "dar rosto ao argumento sem abrir mão da leitura",
    needsPhoto: true,
  },
  photoPortrait: {
    format: "retrato",
    sees: "um retrato em destaque com nome e assinatura",
    job: "criar vínculo com a pessoa por trás do serviço",
    needsPhoto: true,
  },
  search: {
    format: "barra de busca",
    sees: "uma barra de busca com o que a pessoa digitaria",
    job: "mostrar que a arte responde exatamente à dúvida que a pessoa pesquisa",
  },
  device: {
    format: "tela de celular",
    sees: "a tela de um celular com o produto em uso",
    job: "provar que existe e funciona, reduzindo a desconfiança",
  },
  door: {
    format: "porta / passagem",
    sees: "uma passagem entre o problema e o resultado",
    job: "convidar a atravessar: decisão fácil de imaginar",
  },
  stage: {
    format: "palco",
    sees: "o assunto iluminado no centro, como anúncio de evento",
    job: "dar importância ao tema e criar expectativa",
  },
  constellation: {
    format: "constelação",
    sees: "pontos ligados formando um mapa do assunto",
    job: "mostrar que peças soltas viram um sistema quando bem conduzidas",
  },
  signpost: {
    format: "placa de sinalização",
    sees: "placas apontando caminhos com escolhas escritas",
    job: "colocar a pessoa diante da escolha que ela já está fazendo",
  },
  billboard: {
    format: "outdoor",
    sees: "uma chamada curta de outdoor, lida de longe",
    job: "gravar a marca com uma frase única e direta",
  },
  notify: {
    format: "notificação",
    sees: "uma notificação de celular com uma boa notícia",
    job: "materializar o resultado desejado no formato em que ele chegaria",
  },
  toggle: {
    format: "chave liga/desliga",
    sees: "uma chave entre dois estados, com o antes e o depois",
    job: "mostrar que a mudança começa por uma decisão simples",
  },
  trend: {
    format: "gráfico de evolução",
    sees: "uma linha subindo em ziguezague com marcos no caminho",
    job: "prometer progresso realista, com recaídas incluídas",
  },
  focus: {
    format: "foco",
    sees: "muitos elementos apagados e um só nítido",
    job: "defender a prioridade: uma coisa por vez",
  },
  diverge: {
    format: "dois caminhos",
    sees: "dois caminhos que se separam a partir do mesmo ponto",
    job: "confrontar o custo de não decidir",
  },
  outbox: {
    format: "mensagem enviada",
    sees: "uma mensagem pronta, como se já tivesse sido enviada",
    job: "encurtar a distância até o primeiro contato",
  },
  steps: {
    format: "método em etapas",
    sees: "as etapas do método autoral, nomeadas e em ordem",
    job: "mostrar que existe método — não improviso — por trás do serviço",
    needs: (c) => some(c.journeys) || some(c.features),
    needsLabel: "etapas do método",
  },
  difi: {
    format: "mapa de quatro frentes",
    sees: "quatro frentes de trabalho lado a lado, cada uma com o que resolve",
    job: "mostrar que o problema é tratado por inteiro, não em pedaços",
    needs: (c) => some(c.features) || some(c.triptychs),
    needsLabel: "frentes de trabalho / soluções",
  },
  closing: {
    format: "arte de chamada",
    sees: "uma chamada final com o convite para o próximo passo",
    job: "transformar interesse em ação com um pedido claro",
    needs: (c) => some(c.closings) || some(c.sales?.ctas),
    needsLabel: "chamada para ação (CTA)",
  },
};

/** Intenção declarada por objetivo do lote. */
const ANGLE_EFFECT: Record<RationaleContext["angle"], string> = {
  informar: "sair da arte sabendo algo que não sabia antes e enxergar a marca como referência",
  dor: "reconhecer o próprio problema descrito com precisão e sentir que ali tem quem entenda",
  desejo: "imaginar a própria vida depois de resolver o problema e querer esse resultado",
  venda: "entender a oferta e dar o próximo passo agora, sem precisar perguntar mais nada",
};

const trim = (v?: string | null) => (typeof v === "string" ? v.trim() : "");

/**
 * DETALHE DA ARTE CONCRETA.
 *
 * O filtro julga o formato, mas a explicação mostrada ao cliente precisa falar
 * DESTA arte: o arranjo sorteado, o movimento, a posição dela na sequência e —
 * principalmente — as frases que de fato foram renderizadas. Sem isso a
 * explicação sai igual para todas as artes do mesmo tipo.
 */
export type ArtDetail = {
  /** Posição da arte na versão (0-based). */
  index?: number;
  total?: number;
  /** Textos reais lidos da arte renderizada, na ordem de leitura. */
  copy?: string[];
  /** Estilo visual/paleta ativa. */
  styleLabel?: string;
  /** Formato de saída (1:1, 4:5, story). */
  formatLabel?: string;
  /** Nome do modelo criativo (persona) que assinou a composição. */
  personaLabel?: string;
};

/** Arranjo visual escolhido pelo sorteio de tratamento. */
const LAYOUT_NOTES = [
  "o texto ancorado no alto e muito respiro embaixo",
  "o conteúdo centralizado, com a moldura fechando a arte por fora",
  "o peso jogado para a base, do jeito que se lê um cartaz de rua",
  "um arranjo assimétrico: um lado carregado, o outro deliberadamente vazio",
  "camadas sobrepostas, com fundo texturizado passando atrás do texto",
  "a informação organizada em grade, cada pedaço no seu quadro",
];

/** Como o movimento entra na leitura (só quando o bloco tem animação). */
const MOTION_NOTES: Record<string, string> = {
  focusPull: "o texto entra desfocado e ganha nitidez conforme a arte sobe na tela",
  zoomIn: "a arte se aproxima aos poucos, puxando o olho para o centro",
  zoomOut: "a arte começa colada e vai abrindo, revelando o contexto",
  gradientDrift: "o fundo se movimenta devagar, dando vida sem disputar com o texto",
  parallaxScrub: "as camadas correm em velocidades diferentes, criando profundidade",
  maskWipe: "a mensagem é revelada como uma cortina que abre",
  tiltRise: "a arte se endireita ao subir, como se assentasse no lugar",
  slideDrift: "os elementos deslizam para a posição final, um depois do outro",
};

/** Papel da arte na sequência da versão. */
const positionRole = (index?: number, total?: number): string => {
  if (typeof index !== "number" || !total) return "";
  if (index === 0) return "É a primeira arte da leva: o trabalho dela é abrir o assunto";
  if (index === total - 1) return "É a última arte da leva: o trabalho dela é fechar e cobrar a ação";
  if (index < Math.ceil(total / 3)) return `É a ${index + 1}ª arte da leva, ainda na fase de puxar atenção`;
  if (index > total - Math.ceil(total / 3) - 1)
    return `É a ${index + 1}ª arte da leva, já na reta de decisão`;
  return `É a ${index + 1}ª arte da leva, no meio do raciocínio, onde entra o argumento`;
};


/**
 * Frases reais da arte, limpas e sem repetição.
 *
 * Blocos numerados (índice, lista, método) colam o número do item no texto ao
 * serem lidos do DOM ("01Guilherme Vallim"). O número é enfeite de layout, não
 * mensagem: sai antes de citar a frase.
 */
const cleanCopy = (copy?: string[]): string[] => {
  const seen = new Set<string>();
  return (copy ?? [])
    .map((t) =>
      trim(t)
        .replace(/\s+/g, " ")
        .replace(/^(?:\d{1,2}[.)°º]?\s*)(?=\D)/, "")
        .trim(),
    )
    .filter((t) => {
      if (t.length < 3 || t.length > 220) return false;
      const key = t.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

/** Uma frase de verdade (tem sujeito e ideia) ou só um rótulo solto? */
const isSentence = (t: string) => t.split(/\s+/).filter(Boolean).length >= 4;


const quote = (t: string) => `“${t}”`;

/**
 * Monta a explicação da arte e, no caminho, coleta as lacunas que impedem o
 * raciocínio de fechar.
 */
export const explainArt = (
  block: ComposedBlock,
  ctx: RationaleContext,
  detail?: ArtDetail,
): ArtRationale => {
  const sense = SENSE[block.kind];
  const gaps: string[] = [];

  const keyword = trim(ctx.keyword);
  const hook = trim(ctx.hook);
  const cta = trim(ctx.cta);
  const audience = trim(ctx.audienceLabel) || "público da marca";

  // 1) Matéria-prima do formato.
  if (sense.needs && !sense.needs(ctx.content)) {
    gaps.push(`o formato "${sense.format}" precisa de ${sense.needsLabel ?? "conteúdo próprio"} e o kit não tem isso preenchido`);
  }
  if (sense.needsPhoto && ctx.photoCount === 0) {
    gaps.push("o formato depende de foto do acervo e a marca ainda não enviou fotos");
  }

  // 2) A quem a arte fala e com que assunto.
  if (!keyword) gaps.push(`o público "${audience}" está sem palavra-chave, então a arte não anuncia o assunto`);
  if (!hook) gaps.push(`o público "${audience}" está sem chamada direta, então a arte não diz com quem fala`);

  // 3) Para onde a arte leva.
  const ctaSource = cta || ctx.content.closings[0]?.cta || ctx.content.sales?.ctas?.[0] || "";
  if (!trim(ctaSource)) gaps.push("não há próximo passo definido (CTA) para fechar o raciocínio");

  // 4) Higiene de linguagem: jargão quebra a compreensão do leigo.
  const jargonSample = [keyword, hook, ctaSource].filter(Boolean).join(" ");
  if (jargonSample && hasBannedJargon(jargonSample)) {
    gaps.push("a mensagem usa jargão de marketing, que afasta em vez de explicar");
  }

  const subject = keyword || ctx.content.label || ctx.brandName;

  // ---------- CONTRATO DE SENTIDO (global, igual para todo formato) ----------
  // A leitura não depende do bloco: ela é feita sobre o texto que a arte de fato
  // mostra. Toda arte precisa cumprir quatro coisas, em qualquer formato:
  //   1. dizer uma frase inteira (não só rótulos),
  //   2. tocar o assunto do público (palavra-chave / chamada),
  //   3. entregar algo a quem lê (situação, consequência ou caminho),
  //   4. terminar com um passo ou uma assinatura.
  const copy = cleanCopy(detail?.copy);
  const sentences = copy.filter(isSentence);
  const headline = sentences.slice().sort((a, b) => b.length - a.length)[0] ?? "";
  const labels = copy.filter((t) => !isSentence(t));
  const support = sentences.filter((t) => t !== headline);
  const lead = support[0] ?? "";
  const tail = support.length > 1 ? support[support.length - 1] : "";
  const read = copy.length > 0;

  if (read && !sentences.length) {
    gaps.push(
      "a arte só mostra palavras soltas, sem nenhuma frase que diga o que elas significam para quem lê",
    );
  }

  /** Palavras que ancoram o assunto do público (usadas para medir se a arte fala dele). */
  const words = (t: string) =>
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3);
  const subjectWords = new Set([...words(keyword), ...words(hook), ...words(audience)]);
  const artWords = new Set(copy.flatMap(words));
  const brandWords = new Set(words(ctx.brandName));
  const shared = [...subjectWords].filter((w) => artWords.has(w) && !brandWords.has(w));
  if (read && subjectWords.size > 0 && shared.length === 0) {
    gaps.push(
      `nada do que está escrito na arte toca o assunto de "${audience}" — do jeito que está, ela é decoração bonita e não comunicação`,
    );
  }

  /** A arte entrega algo? (situação vivida, consequência ou caminho) */
  const DELIVERY = /(dor|dói|semana|mes|mês|ano|noite|manh|trabalh|treino|carregar|levantar|sentar|dormir|voltar|melhor|piora|risco|evita|resolve|trata|fortalec|recuper|consegu|deixa|começa|prova|avalia|exame|diagn|consulta|plano)/i;
  const delivers = copy.some((t) => DELIVERY.test(t));
  if (read && sentences.length > 0 && !delivers) {
    gaps.push(
      "a arte afirma algo, mas não mostra situação vivida, consequência nem caminho: quem lê não leva nada para casa",
    );
  }

  const layoutBase = LAYOUT_NOTES[block.treatment % LAYOUT_NOTES.length];
  const motion = block.motion ? MOTION_NOTES[block.motion] : "";
  const slide = block.slide
    ? ` Este é o slide ${block.slide.index + 1} de ${block.slide.total} do carrossel, então ele não vive sozinho: prepara o slide seguinte.`
    : "";
  const role = positionRole(detail?.index, detail?.total);

  // ---------- 1. O QUE SE VÊ: hierarquia real do texto lido ----------
  const hierarchy: string[] = [];
  if (headline) hierarchy.push(`em maior destaque, ${quote(headline)}`);
  if (lead) hierarchy.push(`abaixo, em corpo menor, ${quote(lead)}`);
  if (tail && tail !== lead) hierarchy.push(`fechando, ${quote(tail)}`);
  if (labels.length)
    hierarchy.push(
      `e ${labels.length === 1 ? "o rótulo" : "os rótulos"} ${labels.slice(0, 4).map(quote).join(", ")} como apoio visual`,
    );

  const elements = [
    read
      ? `Nesta arte a pessoa lê, nesta ordem: ${hierarchy.join("; ")}.`
      : `A pessoa vê ${sense.sees}.`,
    ` O arranjo é ${layoutBase}`,
    detail?.styleLabel ? `, no estilo ${detail.styleLabel}` : "",
    detail?.formatLabel ? `, em ${detail.formatLabel}` : "",
    ".",
    motion ? ` No movimento, ${motion}.` : "",
  ].join("");

  // ---------- 2. O QUE ELA DIZ: leitura literal, sem enfeite ----------
  let message: string;
  if (!read) {
    message = `Abra a leitura com a arte na tela para eu citar as frases exatas. Pelo formato, o trabalho dela é ${sense.job}, sobre ${subject}.`;
  } else if (!headline) {
    message = `Do jeito que está, a arte não afirma nada: ela mostra ${
      labels.slice(0, 4).map(quote).join(", ") || "apenas rótulos"
    } e deixa a ligação por conta de quem lê. Para ${audience}, falta uma frase dizendo o que esses termos resolvem — hoje o sentido só existe para quem já conhece ${ctx.brandName}.`;
  } else {
    const link = shared.length
      ? `Ela conversa com ${audience} porque fala de ${shared.slice(0, 3).join(", ")} — o mesmo terreno de "${hook || keyword}".`
      : `Ela ainda não amarra em ${audience}: nenhuma palavra da arte cruza com "${hook || keyword}".`;
    const value = delivers
      ? `O que quem lê leva daqui: reconhece a situação descrita e vê que existe caminho.`
      : `O que falta: a frase afirma, mas não mostra a situação vivida nem o caminho — sem isso a pessoa concorda e segue rolando.`;
    message = `A arte diz, em uma linha: ${quote(headline)}.${
      lead ? ` E completa com ${quote(lead)}.` : ""
    } ${link} ${value}`;
  }

  // ---------- 3. O QUE ELA DESPERTA ----------
  const effect = [
    role ? `${role}. ` : "",
    `O objetivo é que quem lê ${ANGLE_EFFECT[ctx.angle]}`,
    trim(ctaSource) ? ` — e o convite é "${trim(ctaSource)}"` : "",
    ".",
    slide,
    detail?.personaLabel ? ` Composição assinada pelo modelo criativo ${detail.personaLabel}.` : "",
  ].join("");

  return {
    kind: block.kind,
    format: sense.format,
    elements,
    message,
    effect,
    gaps,
    ok: gaps.length === 0,
  };
};



/** Explicação em texto corrido, para legenda, exportação e leitura rápida. */
export const rationaleText = (r: ArtRationale): string =>
  [r.elements, r.message, r.effect].join(" ");

/**
 * Formatos de reserva: só dependem de frase e assinatura, então fecham o
 * raciocínio em qualquer marca — usados quando a arte sorteada não fecha.
 */
const FALLBACKS: BlockKind[] = ["typo", "hero", "billboard", "mono", "closing"];

/**
 * FILTRO APLICADO À VERSÃO INTEIRA.
 *
 * Troca cada arte que não passa pelo raciocínio por um formato equivalente que
 * passa, preservando a ordem e a sequência dos carrosséis (slide de carrossel
 * nunca é trocado isoladamente — a sequência é indivisível; se o kit não tem
 * roteiro, o carrossel inteiro já não é composto).
 */
export const enforceRationale = (
  blocks: ComposedBlock[],
  ctx: RationaleContext,
): { blocks: ComposedBlock[]; rationales: ArtRationale[]; fixed: number; gaps: string[] } => {
  const gapSet = new Set<string>();
  let fixed = 0;

  const out = blocks.map((block) => {
    const first = explainArt(block, ctx);
    if (first.ok || block.slide) return block;
    first.gaps.forEach((g) => gapSet.add(g));

    const replacement = FALLBACKS.map((kind) => ({ ...block, kind, motion: block.motion }))
      .find((candidate) => explainArt(candidate, ctx).ok);
    if (!replacement) return block;
    fixed += 1;
    return replacement;
  });

  return {
    blocks: out,
    rationales: out.map((block) => explainArt(block, ctx)),
    fixed,
    gaps: [...gapSet],
  };
};
