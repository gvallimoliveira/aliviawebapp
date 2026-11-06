import type { BlockKind } from "./composePage";

/**
 * CATÁLOGO DE MODELOS DE ARTE
 *
 * Nomes em português para o usuário escolher que tipos de peça quer receber.
 * Cada modelo aponta para um ou mais blocos do núcleo criativo. Sem seleção,
 * o motor sorteia livremente (modo "Aleatório", padrão).
 */
export type StudioModel = {
  id: string;
  label: string;
  hint: string;
  kinds: BlockKind[];
  /** Só funciona com fotos no acervo. */
  needsPhoto?: boolean;
  /** Arte autoral da marca Aliv.iA — indisponível para outras marcas. */
  needsBrand?: boolean;
};

export const STUDIO_MODELS: StudioModel[] = [
  { id: "manifesto", label: "Manifesto / capa", hint: "Frase de abertura ocupando a arte inteira", kinds: ["hero", "closing"] },
  { id: "letras", label: "Letras grandes", hint: "Tipografia gigante, poucas palavras", kinds: ["typo", "kinetic"] },
  { id: "minimal", label: "Minimalista", hint: "Fundo limpo, uma ideia por arte", kinds: ["mono", "echo"] },
  { id: "citacao", label: "Citação", hint: "Bloco de fala em fundo de destaque", kinds: ["quote"] },
  { id: "carrossel", label: "Carrossel", hint: "Sequência capa → slides → CTA, inclusive em fio de posts", kinds: ["carousel"] },
  { id: "ecossistema", label: "Ecossistema de soluções", hint: "Conecta 3 a 5 funcionalidades em seis argumentos visuais e um carrossel completo", kinds: ["ecosystem", "carousel"], needsBrand: true },
  { id: "foto", label: "Foto do acervo", hint: "Suas fotos com tipografia por cima", kinds: ["photoType", "photoSplit", "photoPortrait", "stage"], needsPhoto: true },
  { id: "fotofundo", label: "Foto como plano de fundo", hint: "Sua foto esmaecida atrás do texto, com véu escurecido (substitui a foto em primeira camada)", kinds: ["photoVeil"], needsPhoto: true },
  { id: "numeros", label: "Números / prova", hint: "Métricas e dados em destaque", kinds: ["metrics", "stats"] },
  { id: "passos", label: "Passo a passo", hint: "Etapas numeradas do processo", kinds: ["journey", "list"] },
  { id: "recurso", label: "Recurso em close", hint: "Um benefício por arte", kinds: ["feature", "triptych"] },
  { id: "antesdepois", label: "Antes e depois", hint: "Comparação de cenário", kinds: ["compare"] },
  { id: "historia", label: "Storytelling", hint: "Narrativa curta em blocos", kinds: ["story"] },
  { id: "institucional", label: "Institucional", hint: "Marca, pilares e assinatura", kinds: ["brand", "constellation"] },
  { id: "busca", label: "Barra de busca", hint: "Pergunta digitada com sugestões", kinds: ["search"] },
  { id: "perguntas", label: "Caixa de perguntas", hint: "Sticker de pergunta convidando o público a mandar a dúvida", kinds: ["askbox"] },
  { id: "promocao", label: "Promoção / plano na tela", hint: "Produto ou assinatura na tela do celular com a palavra da oferta", kinds: ["promoPhone"] },
  { id: "ofertafaixas", label: "Oferta / faixas diagonais", hint: "Faixas cruzadas, título grande e condição comercial em destaque, com as cores da marca", kinds: ["offerRibbon"] },
  { id: "tweet", label: "Post de rede (tweet)", hint: "Print de um post curto com avatar, @, horário e barra de ações", kinds: ["tweet"] },
  { id: "ladoalado", label: "Celular + explicação", hint: "Aparelho de um lado e título, texto e chamada do outro", kinds: ["phoneSide"] },
  { id: "recado", label: "Recado importante", hint: "Cartão de aviso com selo de exclamação sobre chapa de cor", kinds: ["notice"] },
  { id: "impacto", label: "Mão segurando a frase (dar zoom)", hint: "Mão grande em close segurando uma frase minúscula; embaixo, a chamada gigante que instiga dar zoom", kinds: ["punch"] },
  { id: "encolhe", label: "Frase que diminui", hint: "A mesma frase repetida encolhendo até virar um fio — o incômodo (dor, medo, insegurança) perdendo tamanho", kinds: ["shrink"] },
  { id: "perguntaelegante", label: "Pergunta elegante", hint: "Pergunta curta ao público com uma palavra em serifada itálica, sobre foto do acervo ou chapa de cor", kinds: ["elegantAsk"] },
  { id: "citacaoassinada", label: "Citação assinada", hint: "Frase com aspas gigantes e o @ da marca no rodapé, como no post de posicionamento", kinds: ["pullQuote"] },
  { id: "percentual", label: "Dado percentual", hint: "Um percentual gigante do acervo da marca chamando atenção para a dor do público", kinds: ["percent"] },
  { id: "ganchos", label: "Ganchos (frases virais)", hint: "Biblioteca de ganchos de parada de scroll adaptados à marca (ninguém te conta, o erro comum, 90% ignoram…)", kinds: ["hook"] },
  { id: "empilhado", label: "Letras empilhadas (cartaz)", hint: "Palavra repetida em contorno com chapa sólida e tarjas de cor", kinds: ["stackType"] },
  { id: "mockup", label: "Mockup de tela", hint: "Notebook, tablet ou celular", kinds: ["device"] },
  { id: "tutorial", label: "Tutorial com pílula", hint: "Pergunta com a palavra-chave em pílula, aparelho em cena e botão de chamada", kinds: ["tutorial"] },
  { id: "hub", label: "Hub conectado", hint: "Celular no centro com os módulos ligados ao redor e chamada larga embaixo", kinds: ["hub"] },
  { id: "notificacoes", label: "Notificações do app", hint: "Pilha de avisos simulando o app da marca", kinds: ["notify"] },
  { id: "escolha", label: "Escolha / interruptores", hint: "Dois botões: hábito antigo x novo", kinds: ["toggle"] },
  { id: "progresso", label: "Progresso / gráfico", hint: "Traçado subindo e furando o platô", kinds: ["trend", "focus"] },
  { id: "diferente", label: "Sair da fila", hint: "Desvio da rota e frase fora da caixa", kinds: ["diverge", "outbox"] },
  { id: "conceitual", label: "Conceitual", hint: "Porta e placas", kinds: ["door", "signpost"] },
  { id: "metodo", label: "Método (STEPS / D.I.F.I.)", hint: "Artes autorais do método Aliv.iA", kinds: ["steps", "difi"], needsBrand: true },
  { id: "cartaz", label: "Cartaz / faixa", hint: "Pin-up e faixa de termos", kinds: ["pinup", "marquee"] },
];

/**
 * Converte a seleção de modelos nos blocos permitidos do motor.
 *
 * Exclusividade fotográfica: "Foto como plano de fundo" (fotofundo) e
 * "Foto do acervo" (primeira camada) nunca se combinam — se o usuário
 * marcar os dois, o plano de fundo vence e os blocos de foto em primeira
 * camada saem do pool. É um ou outro.
 */
export const kindsForModels = (ids: string[], photoCount = 0, exclusive = false): BlockKind[] => {
  const set = new Set<BlockKind>();
  STUDIO_MODELS.filter((m) => ids.includes(m.id))
    .filter((m) => !m.needsPhoto || photoCount > 0)
    .filter((m) => !m.needsBrand || exclusive)
    .forEach((m) => m.kinds.forEach((k) => set.add(k)));
  if (ids.includes("fotofundo")) {
    (["photoType", "photoSplit", "photoPortrait", "stage"] as BlockKind[]).forEach((k) => set.delete(k));
  }
  return [...set];
};
