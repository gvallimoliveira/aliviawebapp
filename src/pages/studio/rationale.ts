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

/**
 * Leitura interpretativa de uma arte, em quatro dimensões:
 *   1. contexto da marca (INEGOCIÁVEL — vem do manual ou do formulário de marca),
 *   2. público-alvo,
 *   3. objetivo do lote (venda / desejo / dor / visão 360),
 *   4. a arte em si (estética e texto).
 *
 * A arte só passa quando a dimensão 1 fecha E pelo menos 2 das outras 3 fecham.
 */
export type ArtRationale = {
  kind: BlockKind;
  /** Nome do formato em linguagem comum ("cartaz de frase", "lista numerada"). */
  format: string;
  /** Como esta arte se apoia no contexto da marca (obrigatório). */
  brandRead: string;
  /** Como esta arte conversa com o público ativo. */
  audienceRead: string;
  /** Como esta arte serve ao objetivo do lote. */
  objectiveRead: string;
  /** Leitura estética e textual da arte concreta. */
  artRead: string;
  /** Veredito em uma linha: o que fecha e o que não fecha. */
  verdict: string;
  /** Motivos que impedem a leitura de fechar. Vazio = arte aprovada. */
  gaps: string[];
  ok: boolean;
};

/** Material do manual/formulário da marca — base inegociável da interpretação. */
export type BrandContext = {
  niche?: string | null;
  tone?: string | null;
  description?: string | null;
  positioning?: string | null;
  topics?: string[] | null;
  /** Quantas perguntas do formulário de marca estão respondidas. */
  briefAnswered?: number;
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
  /** Manual/formulário da marca. Sem isso nenhuma arte fecha a leitura. */
  brand?: BrandContext;
  /**
   * Par relacional desta arte (medo/desejo eleito). Quando presente, a arte só
   * passa na dimensão de público se o texto tocar o vocabulário desse medo ou
   * desejo — é o que impede copy dirigida no rótulo e genérica no conteúdo.
   */
  relation?: { pain?: string; desire?: string; axis?: "pain" | "desire" };
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
  ecosystem: {
    format: "ecossistema de soluções",
    sees: "uma cadeia de funcionalidades ligadas do começo ao resultado",
    job: "mostrar como recursos complementares resolvem uma jornada inteira para um público específico",
    needs: (c) => some(c.ecosystems),
    needsLabel: "uma cadeia de três a cinco funcionalidades",
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
  photoVeil: {
    format: "foto de fundo com véu",
    sees: "sua foto como plano de fundo esmaecido e o texto claro à frente",
    job: "dar clima e prova real sem roubar a leitura da mensagem",
    needsPhoto: true,
  },
  askbox: {
    format: "caixa de perguntas",
    sees: "um convite com o sticker de pergunta sobre um tema da marca",
    job: "abrir conversa: quem manda a dúvida já entra em contato",
    needs: (c) => some(c.features) || some(c.searchQueries),
    needsLabel: "temas e dúvidas reais do público",
  },
  promoPhone: {
    format: "oferta com o produto na tela",
    sees: "o produto ou plano aberto na tela do celular com a palavra da oferta repetida atrás",
    job: "mostrar o que se compra e qual é a condição, sem rodeio",
    needs: (c) => some(c.features) && (some(c.sales?.offers) || some(c.sales?.ctas) || some(c.subs)),
    needsLabel: "linhas de oferta e recursos do plano",
  },
  stackType: {
    format: "cartaz de letras empilhadas",
    sees: "a palavra-chave repetida em contorno até aterrissar sólida, com tarjas de cor",
    job: "fixar uma palavra da marca com força de cartaz",
    needs: (c) => some(c.headlines),
    needsLabel: "frases curtas da marca",
  },
  offerRibbon: {
    format: "oferta com faixas diagonais",
    sees: "faixas cruzadas no topo, título grande e condição comercial em destaque",
    job: "dar visibilidade a uma oferta real da marca e ao próximo passo",
    needs: (c) => some(c.sales?.offers) && some(c.headlines) && some(c.closings),
    needsLabel: "oferta declarada pela marca, título e chamada",
  },
  tweet: {
    format: "post de rede social",
    sees: "o print de um post curto da marca, com avatar, @, horário e barra de ações",
    job: "fazer uma frase circular como opinião — formato que o público lê sem perceber que é anúncio",
    needs: (c) => some(c.quotes) || some(c.headlines),
    needsLabel: "falas curtas da marca",
  },
  phoneSide: {
    format: "celular ao lado da explicação",
    sees: "o aparelho de um lado e, do outro, título, explicação e chamada",
    job: "mostrar a coisa funcionando e explicar em uma leitura o que ela resolve",
    needs: (c) => some(c.features) && some(c.closings),
    needsLabel: "recursos e chamada de ação",
  },
  notice: {
    format: "recado importante",
    sees: "um cartão de aviso com selo de exclamação sobre chapa de cor",
    job: "dar urgência a uma informação que o público precisa ler agora",
    needs: (c) => some(c.features) || some(c.closings),
    needsLabel: "informação objetiva para avisar",
  },
  punch: {
    format: "frase de impacto",
    sees: "uma mão grande em close segurando uma frase minúscula na pinça, e embaixo a chamada gigante convidando a dar zoom",
    job: "fazer o público ampliar a arte para ler a frase que a mão segura — atenção conquistada pela curiosidade",
    needs: (c) => some(c.headlines) || some(c.quotes),
    needsLabel: "frases curtas e provocativas da marca",
  },
  shrink: {
    format: "frase que diminui",
    sees: "a mesma frase repetida em tamanhos cada vez menores, até virar um fio no pé do bloco",
    job: "mostrar, sem explicar, o incômodo do público perdendo tamanho conforme ele segue o processo",
    needs: (c) => some(c.compare) || some(c.sales?.objections) || some(c.searchQueries),
    needsLabel: "cenário \"antes\" e objeções reais do público",
  },
  elegantAsk: {
    format: "pergunta elegante",
    sees: "uma pergunta curta em letras grandes com uma palavra isolada em serifada itálica, sobre foto esmaecida ou chapa de cor",
    job: "fazer a pessoa se reconhecer na pergunta antes de qualquer oferta",
    needs: (c) => some(c.compare) || some(c.sales?.objections) || some(c.searchQueries),
    needsLabel: "queixas e dúvidas reais do público",
  },
  pullQuote: {
    format: "citação assinada",
    sees: "aspas gigantes, a frase com o fecho em serifada itálica e, no rodapé, o avatar, o nome e o @ da marca",
    job: "fixar posicionamento: a frase circula como opinião assinada por quem tem autoridade no assunto",
    needs: (c) => some(c.quotes),
    needsLabel: "frases de posicionamento da marca",
  },
  percent: {
    format: "dado percentual",
    sees: "um percentual gigante no topo, a frase curta que explica a quem aquilo dói e a seta de continuar",
    job: "usar um número real para nomear o problema do público em um segundo",
    needs: (c) => some(c.stats) || some(c.metrics),
    needsLabel: "percentuais reais declarados no acervo",
  },
  hook: {
    format: "gancho de parada",
    sees: "uma frase de gancho ocupando quase todo o quadro, uma linha de apoio que fecha a ideia e o convite no pé",
    job: "parar o scroll na primeira linha: o gancho aponta um erro comum, uma omissão ou um atalho e só o apoio entrega a explicação",
    needs: (c) => some(c.hooks) || some(c.headlines),
    needsLabel: "ganchos da marca (dor declarada, diferencial e chamada)",
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
  tutorial: {
    format: "tutorial com pílula",
    sees: "uma pergunta com a palavra-chave destacada e a tela do sistema em uso",
    job: "mostrar que a dor da rotina tem solução prática dentro da ferramenta",
  },
  hub: {
    format: "hub conectado",
    sees: "o celular no centro com os módulos ligados ao redor",
    job: "mostrar que tudo fica num só lugar, conectado",
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
  informar:
    "ficar por dentro de algo que a marca comunica, resolve ou considera relevante — sem precisar de aula",
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
  const ctaSource = cta || ctx.content.closings[0]?.cta || ctx.content.sales?.ctas?.[0] || "";
  const subject = keyword || ctx.content.label || ctx.brandName;

  // Matéria-prima do formato (o bloco renderiza vazio sem ela).
  if (sense.needs && !sense.needs(ctx.content)) {
    gaps.push(`o formato "${sense.format}" precisa de ${sense.needsLabel ?? "conteúdo próprio"} e o kit não tem isso preenchido`);
  }
  if (sense.needsPhoto && ctx.photoCount === 0) {
    gaps.push("o formato depende de foto do acervo e a marca ainda não enviou fotos");
  }

  // ---------- texto real da arte ----------
  const copy = cleanCopy(detail?.copy);
  const sentences = copy.filter(isSentence);
  const headline = sentences.slice().sort((a, b) => b.length - a.length)[0] ?? "";
  const labels = copy.filter((t) => !isSentence(t));
  const support = sentences.filter((t) => t !== headline);
  const lead = support[0] ?? "";
  const tail = support.length > 1 ? support[support.length - 1] : "";
  const read = copy.length > 0;
  /**
   * ARTE SEM TEXTO PREVISTO É DEFEITO, NÃO ISENÇÃO. Quando quem chama declara a
   * cópia (o diretor sempre declara) e ela vem vazia, as checagens de público,
   * objetivo e marca precisam REPROVAR — antes elas passavam por omissão e a
   * arte muda ia ao ar aprovada.
   */
  const blind = Array.isArray(detail?.copy) && !read;
  if (blind) gaps.push("a arte não tem texto previsto: o kit não sustenta nenhuma frase para este formato");

  const words = (t: string) =>
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3);
  const artWords = new Set(copy.flatMap(words));
  const brandWords = new Set(words(ctx.brandName));

  // ============ 1. CONTEXTO DA MARCA (inegociável) ============
  const b = ctx.brand ?? {};
  const manual = [b.positioning, b.description, b.niche, b.tone, ...(b.topics ?? [])]
    .map((v) => trim(v))
    .filter(Boolean);
  const briefAnswered = b.briefAnswered ?? 0;
  const hasManual = manual.length > 0 || briefAnswered > 0;
  const manualWords = new Set(manual.flatMap(words));
  const manualShared = [...manualWords].filter((w) => artWords.has(w) && !brandWords.has(w));
  let brandOk = hasManual;
  let brandRead: string;
  if (!hasManual) {
    brandRead = `Não consigo interpretar esta arte: o contexto de ${ctx.brandName} está vazio. Preencha o manual da marca (ou o formulário nos Ajustes da marca) — sem isso qualquer arte é chute bonito.`;
    gaps.push(
      "o contexto da marca não está preenchido (manual da marca ou formulário nos Ajustes) — é o item inegociável da leitura",
    );
  } else if (blind || (read && manualShared.length === 0)) {
    brandOk = false;
    brandRead = `A arte não repete nada do que o manual de ${ctx.brandName} diz sobre ${
      trim(b.niche) || "o negócio"
    }. Ela poderia ser de qualquer marca do mesmo nicho: falta trazer o vocabulário do posicionamento para o texto.`;
    gaps.push("o texto da arte não conversa com o posicionamento do manual/formulário da marca");
  } else {
    brandRead = `Está apoiada no manual de ${ctx.brandName}: ${
      trim(b.positioning) || trim(b.description) || trim(b.niche) || "o posicionamento registrado"
    }.${
      manualShared.length
        ? ` O elo aparece no próprio texto (${manualShared.slice(0, 3).join(", ")}).`
        : ` O tom pedido${trim(b.tone) ? ` — ${trim(b.tone)} — ` : " "}é o que define o acabamento desta arte.`
    }`;
  }

  // ============ 2. PÚBLICO-ALVO ============
  const audienceWords = new Set([...words(keyword), ...words(hook), ...words(audience)]);
  const audienceShared = [...audienceWords].filter((w) => artWords.has(w) && !brandWords.has(w));
  /**
   * COPY RELACIONAL: o par eleito para esta arte (medo ou desejo) precisa
   * aparecer no texto. Sem isso a arte diz o nome do público e fala de nada.
   */
  const rel = ctx.relation ?? {};
  const relText = rel.axis === "desire" ? rel.desire : rel.pain || rel.desire;
  const relWords = new Set(words(relText ?? ""));
  const relShared = [...relWords].filter((w) => artWords.has(w));
  const relDeclared = Boolean(trim(relText ?? ""));
  const relOk = !blind && (!relDeclared || !read || relShared.length > 0);
  const audienceOk = !blind && !!keyword && !!hook && (!read || audienceShared.length > 0) && relOk;
  const audienceRead = blind
    ? `Esta arte iria ao ar sem texto: nenhuma frase do kit sustenta este formato, então não há como ${audience} se reconhecer nela.`
    : !keyword || !hook
    ? `Este público está incompleto (${!keyword ? "sem palavra-chave" : "sem chamada direta"}), então a arte fala para o vazio: eu não sei quem deveria se reconhecer nela.`
    : !relOk
      ? `Diz "${keyword}" no rótulo, mas não toca no que move ${audience} agora (${trim(relText ?? "")}). O público lê o nome dele e não encontra o próprio problema no texto.`
      : audienceShared.length > 0 || !read
        ? `Fala com ${audience}: quem se reconhece em "${hook}"${
            relDeclared ? `, especificamente em ${trim(relText ?? "")}` : ""
          }. O terreno em comum entre a arte e esse público está em ${
            audienceShared.slice(0, 3).join(", ") || `“${keyword}”`
          }.`
        : `Nada do que está escrito cruza com ${audience} ("${hook}"). Do jeito que está, o público certo passa reto — a arte não avisa que é sobre ele.`;
  if (!audienceOk && keyword && hook && relOk) {
    gaps.push(`a arte não menciona o assunto de "${audience}" — o público não se reconhece nela`);
  }
  if (!relOk) {
    gaps.push(`o texto não fala do ${rel.axis === "desire" ? "desejo" : "medo"} escolhido para este público (${trim(relText ?? "")})`);
  }
  if (!keyword) gaps.push(`o público "${audience}" está sem palavra-chave`);
  if (!hook) gaps.push(`o público "${audience}" está sem chamada direta`);


  // ============ 3. OBJETIVO DO LOTE ============
  const OBJECTIVE: Record<RationaleContext["angle"], { probe: RegExp; ask: string }> = {
    venda: {
      probe: /(agend|marque|chame|whats|clique|link|vaga|consulta|avalia|comece|garanta|fale)/i,
      ask: "um pedido explícito de ação (agendar, chamar, clicar)",
    },
    dor: {
      probe: /(dor|dói|noite|manh|semana|mes|mês|ano|carregar|levantar|sentar|dormir|piora|trava|limita|deixa de)/i,
      ask: "uma cena concreta do problema (quando dói, o que deixou de fazer)",
    },
    desejo: {
      probe: /(volta|voltar|conseg|de novo|sem medo|livre|forte|melhor|rotina|viag|treino|brincar|carreg)/i,
      ask: "a imagem do depois (o que a pessoa volta a fazer)",
    },
    informar: {
      // Informativo ≠ educacional: basta comunicar algo concreto — sobre o que
      // a marca faz, resolve ou acredita — sem obrigar estrutura de ensino.
      probe:
        /(porque|por que|como|sinal|erro|motivo|quando|evita|entenda|significa|passo|etapa|método|avalia|atend|trata|cuida|resolve|acredita|funciona|\d)/i,
      ask: "uma informação concreta sobre o que a marca comunica, resolve ou considera relevante",
    },
  };
  const objective = OBJECTIVE[ctx.angle];
  const objectiveHit = copy.some((t) => objective.probe.test(t)) || (ctx.angle === "venda" && !!trim(ctaSource) && !read);
  const objectiveOk = !blind && (objectiveHit || !read);
  const objectiveRead = objectiveOk
    ? `O lote está no objetivo "${ctx.angle}" e esta arte serve a ele: ${sense.job}. A intenção é que quem lê ${ANGLE_EFFECT[ctx.angle]}${
        trim(ctaSource) ? `, com o convite "${trim(ctaSource)}"` : ""
      }.`
    : `O lote está no objetivo "${ctx.angle}", mas esta arte não entrega isso: falta ${objective.ask}. Como está, ela informa a existência da marca e para aí.`;
  if (!objectiveOk) gaps.push(`a arte não cumpre o objetivo "${ctx.angle}": falta ${objective.ask}`);
  if (!trim(ctaSource)) gaps.push("não há próximo passo definido (CTA) para fechar o raciocínio");

  // ============ 4. A ARTE EM SI (estética + texto) ============
  const layoutBase = LAYOUT_NOTES[block.treatment % LAYOUT_NOTES.length];
  const motion = block.motion ? MOTION_NOTES[block.motion] : "";
  const slide = block.slide
    ? ` Como slide ${block.slide.index + 1} de ${block.slide.total}, ela não vive sozinha: prepara o slide seguinte.`
    : "";
  const role = positionRole(detail?.index, detail?.total);
  const jargonInArt = copy.find((t) => hasBannedJargon(t)) ?? "";
  const artOk = read ? !!headline && !jargonInArt : true;
  const craft = [
    `Composição: ${layoutBase}`,
    detail?.styleLabel ? `no estilo ${detail.styleLabel}` : "",
    detail?.formatLabel ? `em ${detail.formatLabel}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  let artRead: string;
  if (!read) {
    artRead = `${craft}.${motion ? ` No movimento, ${motion}.` : ""} Pelo formato, o trabalho é ${sense.job}, sobre ${subject}.`;
  } else if (!headline) {
    artRead = `A arte não afirma nada: mostra ${
      labels.slice(0, 4).map(quote).join(", ") || "apenas rótulos"
    } e deixa a ligação por conta de quem lê. Esteticamente resolve (${craft}), mas texto sem frase inteira só faz sentido para quem já conhece ${ctx.brandName}.`;
  } else {
    artRead = `A frase que carrega é ${quote(headline)}${lead ? `, apoiada por ${quote(lead)}` : ""}${
      tail && tail !== lead ? ` e fechada com ${quote(tail)}` : ""
    }. ${craft}${motion ? `, com ${motion}` : ""}. A hierarquia funciona: o olho cai na frase, o resto é apoio.${
      jargonInArt ? ` Problema: ${quote(jargonInArt)} usa jargão e trava a leitura de quem é leigo.` : ""
    }`;
  }
  if (read && !headline) {
    gaps.push("a arte só mostra palavras soltas, sem nenhuma frase que diga o que elas significam");
  }
  if (jargonInArt) gaps.push("o texto da arte usa jargão de marketing, que afasta em vez de explicar");

  // ============ VEREDITO: marca + 2 de 3 ============
  const hits = [audienceOk, objectiveOk, artOk].filter(Boolean).length;
  const passed = brandOk && hits >= 2;
  const named = [
    audienceOk ? "público" : "",
    objectiveOk ? "objetivo" : "",
    artOk ? "arte" : "",
  ].filter(Boolean);
  const verdict = passed
    ? `Fecha: contexto da marca + ${named.join(" e ")}.${role ? ` ${role}.` : ""}${slide}${
        detail?.personaLabel ? ` Composição do modelo criativo ${detail.personaLabel}.` : ""
      }`
    : brandOk
      ? `Não fecha: além do contexto da marca, preciso de 2 das 3 frentes (público, objetivo, arte) e só ${
          hits === 0 ? "nenhuma" : `${hits}`
        } fecha${hits === 1 ? "" : "m"}.`
      : "Não fecha: o contexto da marca é inegociável e está faltando.";
  if (!passed && gaps.length === 0) gaps.push("a leitura não fecha nas 4 dimensões");

  return {
    kind: block.kind,
    format: sense.format,
    brandRead,
    audienceRead,
    objectiveRead,
    artRead,
    verdict,
    gaps,
    ok: passed,
  };
};



/** Explicação em texto corrido, para legenda, exportação e leitura rápida. */
export const rationaleText = (r: ArtRationale): string =>
  [r.brandRead, r.audienceRead, r.objectiveRead, r.artRead, r.verdict].join(" ");


/**
 * Formatos de reserva: só dependem de frase e assinatura, então fecham o
 * raciocínio em qualquer marca — usados quando a arte sorteada não fecha.
 */
const FALLBACKS: BlockKind[] = ["typo", "hero", "mono", "closing"];

/**
 * FILTRO APLICADO À VERSÃO INTEIRA.
 *
 * Troca cada arte que não passa pelo raciocínio por um formato equivalente que
 * passa, preservando a ordem. O carrossel é indivisível: um slide isolado nunca
 * é trocado. Mas a sequência TAMBÉM é julgada — quando a capa não fecha, ou
 * quando dois slides ou mais falham, o carrossel inteiro é desfeito em artes
 * avulsas que se explicam sozinhas. Antes qualquer slide era devolvido intacto,
 * então o formato de maior risco era o único sem filtro.
 */
export const enforceRationale = (
  blocks: ComposedBlock[],
  ctx: RationaleContext | ((index: number) => RationaleContext),
  /**
   * TEXTO PREVISTO DE CADA ARTE (diretor criativo). Com ele o filtro julga a
   * arte COM as frases na mão — antes ele julgava em branco, e as checagens de
   * "o texto realmente fala com esse público" passavam por omissão.
   */
  copyOf?: (index: number) => string[],
): { blocks: ComposedBlock[]; rationales: ArtRationale[]; fixed: number; gaps: string[] } => {
  const contextFor = (index: number) => typeof ctx === "function" ? ctx(index) : ctx;
  const gapSet = new Set<string>();
  let fixed = 0;
  const detailFor = (index: number): ArtDetail | undefined => {
    const copy = copyOf?.(index);
    return copy ? { index, total: blocks.length, copy } : { index, total: blocks.length };
  };

  /** Sequências de carrossel: início → fim, na ordem em que aparecem. */
  const runs: number[][] = [];
  blocks.forEach((block, index) => {
    if (!block.slide) return;
    const last = runs[runs.length - 1];
    if (last && last[last.length - 1] === index - 1 && blocks[index - 1].slide) last.push(index);
    else runs.push([index]);
  });
  /** Índices de carrossel cuja sequência não se sustenta. */
  const dissolve = new Set<number>();
  runs.forEach((run) => {
    /**
     * Um carrossel é uma peça editorial única. Julgar cada slide contra todas as
     * exigências da marca fazia o filtro reprovar miolos legítimos (um slide
     * pode trazer a dor, outro o método e o último a ação) e dissolver a
     * sequência em várias artes avulsas com a mesma direção. O veredito agora
     * lê capa + miolo + fecho juntos; ainda reprova sequência vazia ou cuja
     * leitura total não fecha.
     */
    const combinedCopy = run.flatMap((index) => copyOf?.(index) ?? []);
    const sequence = explainArt(blocks[run[0]], contextFor(run[0]), {
      index: run[0],
      total: blocks.length,
      copy: combinedCopy,
    });
    const hasEmptySlide = run.some((index) => (copyOf?.(index) ?? []).every((line) => !trim(line)));
    if (sequence.ok && !hasEmptySlide) return;
    sequence.gaps.forEach((g) => gapSet.add(g));
    if (hasEmptySlide) gapSet.add("o carrossel contém slide sem mensagem");
    run.forEach((index) => dissolve.add(index));
  });

  const out = blocks.map((block, index) => {
    const detail = detailFor(index);
    /**
     * Carrossel desfeito: o slide deixa de ser slide E deixa de ser formato de
     * sequência — vira uma arte avulsa de formato de reserva, que se explica
     * sozinha. Sem trocar o formato, um bloco de carrossel sem sequência não
     * teria o que renderizar.
     */
    if (dissolve.has(index)) {
      const loose = { ...block, slide: undefined };
      const solo =
        FALLBACKS.map((kind) => ({ ...loose, kind }))
          .find((candidate) => explainArt(candidate, contextFor(index), detail).ok) ?? { ...loose, kind: FALLBACKS[0] };
      fixed += 1;
      return solo;
    }
    const first = explainArt(block, contextFor(index), detail);
    if (first.ok || block.slide) return block;
    first.gaps.forEach((g) => gapSet.add(g));

    const replacement = FALLBACKS.map((kind) => ({ ...block, kind, motion: block.motion }))
      .find((candidate) => explainArt(candidate, contextFor(index), detail).ok);
    if (!replacement) return block;
    fixed += 1;
    return replacement;
  });

  return {
    blocks: out,
    rationales: out.map((block, index) => explainArt(block, contextFor(index), detailFor(index))),
    fixed,
    gaps: [...gapSet],
  };
};

