/**
 * LÉXICO DO MOTOR CRIATIVO (variedade linguística global)
 *
 * Problema que este módulo resolve: o acervo de copy do Studio é finito, então
 * navegando muito o usuário lê as MESMAS palavras. Aqui a mesma mensagem "A"
 * ganha roupagens diferentes — sinônimos inteligentes, escolhidos de forma
 * determinística (mesma seed ⇒ mesma arte) e coerentes com o REGISTRO de voz
 * declarado no kit da marca.
 *
 * REGRAS DURAS
 * - O texto do campo "tom de voz" NUNCA é renderizado: ele só classifica o
 *   registro (que vocabulário pode ser usado).
 * - Nenhum sinônimo introduz nome de produto, marca ou jargão clínico: as
 *   ideias continuam vindo do kit; aqui só muda a roupagem.
 * - Substituição preserva capitalização da palavra original.
 */

import { createRng } from "./rng";

export type VoiceRegister = "tecnico" | "proximo" | "direto" | "inspirador" | "sobrio";

export const VOICE_REGISTERS: VoiceRegister[] = ["tecnico", "proximo", "direto", "inspirador", "sobrio"];

/** Pistas textuais que classificam o tom de voz do kit em um registro. */
const REGISTER_HINTS: Record<VoiceRegister, string[]> = {
  tecnico: ["técnic", "cientí", "clínic", "preciso", "rigor", "dados", "evidênc", "formal", "profissional", "especialista"],
  proximo: ["próxim", "acolhed", "human", "amig", "leve", "empát", "carinho", "conversa", "informal", "descontra"],
  direto: ["direto", "objetiv", "sem enrolação", "prátic", "seco", "claro", "simples", "assertiv"],
  inspirador: ["inspirad", "motivac", "emocion", "transform", "sonho", "propósit", "energ", "aspiracion"],
  sobrio: ["sóbri", "elegan", "premium", "discret", "minimal", "sofistic", "sério", "institucional"],
};

/**
 * Postura padrão do motor (diretrizes ago/2026): sócio mais experiente — direto,
 * adulto, prático. Só vale quando o kit NÃO declara tom de voz; se o kit declara,
 * o kit sempre ganha.
 */
export const DEFAULT_REGISTER: VoiceRegister = "direto";

/**
 * Classifica o tom de voz livre do kit em um registro. Sem tom declarado, cai na
 * postura padrão (`DEFAULT_REGISTER`) em vez de sortear pelo nome da marca.
 */
export const voiceRegister = (tone?: string | null, _fallbackSeed = "marca"): VoiceRegister => {
  const text = (tone ?? "").toLowerCase();
  if (text.trim()) {
    let best: { register: VoiceRegister; score: number } = { register: "proximo", score: 0 };
    VOICE_REGISTERS.forEach((register) => {
      const score = REGISTER_HINTS[register].reduce((sum, hint) => (text.includes(hint) ? sum + 1 : sum), 0);
      if (score > best.score) best = { register, score };
    });
    if (best.score > 0) return best.register;
  }
  return DEFAULT_REGISTER;
};

/**
 * Matriz de sinônimos por registro. Cada entrada é a palavra canônica que mais
 * aparece no acervo; os arrays trazem trocas equivalentes em sentido.
 */
type SynonymRow = Partial<Record<VoiceRegister, string[]>> & { all: string[] };

const SYNONYMS: Record<string, SynonymRow> = {
  clareza: {
    all: ["clareza", "nitidez", "transparência"],
    tecnico: ["clareza", "precisão", "objetividade"],
    proximo: ["clareza", "entendimento", "tranquilidade"],
    direto: ["clareza", "objetividade"],
    inspirador: ["clareza", "lucidez", "direção"],
    sobrio: ["clareza", "sobriedade", "precisão"],
  },
  claro: {
    all: ["claro", "nítido", "compreensível"],
    tecnico: ["claro", "preciso", "inequívoco"],
    proximo: ["claro", "fácil de entender", "tranquilo de acompanhar"],
    direto: ["claro", "direto", "sem enrolação"],
    inspirador: ["claro", "luminoso", "revelador"],
    sobrio: ["claro", "preciso", "límpido"],
  },
  resultado: {
    all: ["resultado", "retorno", "efeito prático"],
    tecnico: ["resultado", "desfecho", "resposta mensurável"],
    proximo: ["resultado", "mudança de verdade", "diferença que aparece"],
    direto: ["resultado", "entrega", "retorno"],
    inspirador: ["resultado", "conquista", "transformação"],
    sobrio: ["resultado", "desempenho", "consistência"],
  },
  resolver: {
    all: ["resolver", "solucionar", "destravar"],
    tecnico: ["resolver", "solucionar", "endereçar"],
    proximo: ["resolver", "dar um jeito", "sair do problema"],
    direto: ["resolver", "acabar com isso", "eliminar"],
    inspirador: ["resolver", "superar", "vencer"],
    sobrio: ["resolver", "conduzir", "solucionar"],
  },
  método: {
    all: ["método", "processo", "caminho"],
    tecnico: ["método", "método estruturado", "padrão"],
    proximo: ["método", "jeito de fazer", "passo a passo"],
    direto: ["método", "processo", "roteiro"],
    inspirador: ["método", "jornada", "caminho"],
    sobrio: ["método", "padrão", "disciplina"],
  },
  cuidado: {
    all: ["cuidado", "atenção", "zelo"],
    tecnico: ["cuidado", "critério", "atenção"],
    proximo: ["cuidado", "carinho", "atenção"],
    direto: ["cuidado", "atenção"],
    inspirador: ["cuidado", "dedicação", "entrega"],
    sobrio: ["cuidado", "zelo", "esmero"],
  },
  proposta: {
    all: ["proposta", "oferta", "entrega"],
    tecnico: ["proposta", "escopo", "solução"],
    proximo: ["proposta", "convite", "ideia"],
    direto: ["proposta", "oferta"],
    inspirador: ["proposta", "promessa", "convite"],
    sobrio: ["proposta", "solução", "escopo"],
  },
  público: {
    all: ["público", "audiência", "quem acompanha"],
    tecnico: ["público", "perfil", "segmento"],
    proximo: ["público", "gente que acompanha", "pessoas certas"],
    direto: ["público", "quem importa"],
    inspirador: ["público", "comunidade", "pessoas certas"],
    sobrio: ["público", "audiência", "segmento"],
  },
  conexão: {
    all: ["conexão", "vínculo", "identificação"],
    proximo: ["conexão", "vínculo", "afinidade"],
    tecnico: ["conexão", "aderência", "alinhamento"],
    direto: ["conexão", "encaixe"],
    inspirador: ["conexão", "vínculo", "pertencimento"],
    sobrio: ["conexão", "alinhamento", "afinidade"],
  },
  identidade: {
    all: ["identidade", "personalidade", "assinatura"],
    tecnico: ["identidade", "padrão visual", "consistência"],
    proximo: ["identidade", "cara própria", "personalidade"],
    direto: ["identidade", "cara própria"],
    inspirador: ["identidade", "essência", "assinatura"],
    sobrio: ["identidade", "assinatura", "consistência"],
  },
  consistência: {
    all: ["consistência", "constância", "regularidade"],
    tecnico: ["consistência", "reprodutibilidade", "padronização"],
    proximo: ["consistência", "constância", "presença de sempre"],
    direto: ["consistência", "constância"],
    inspirador: ["consistência", "disciplina", "constância"],
    sobrio: ["consistência", "regularidade", "rigor"],
  },
  escolha: {
    all: ["escolha", "decisão", "opção"],
    tecnico: ["escolha", "decisão", "critério"],
    proximo: ["escolha", "decisão", "passo"],
    direto: ["escolha", "decisão"],
    inspirador: ["escolha", "decisão", "virada"],
    sobrio: ["escolha", "decisão", "deliberação"],
  },
  valor: {
    all: ["valor", "relevância", "utilidade"],
    tecnico: ["valor", "relevância", "benefício"],
    proximo: ["valor", "utilidade", "o que importa"],
    direto: ["valor", "benefício"],
    inspirador: ["valor", "significado", "propósito"],
    sobrio: ["valor", "relevância", "solidez"],
  },
  entender: {
    all: ["entender", "compreender", "captar"],
    tecnico: ["entender", "compreender", "interpretar"],
    proximo: ["entender", "sacar", "compreender"],
    direto: ["entender", "sacar"],
    inspirador: ["entender", "enxergar", "compreender"],
    sobrio: ["entender", "compreender", "assimilar"],
  },
  simples: {
    all: ["simples", "descomplicado", "direto"],
    tecnico: ["simples", "enxuto", "objetivo"],
    proximo: ["simples", "tranquilo", "descomplicado"],
    direto: ["simples", "direto"],
    inspirador: ["simples", "essencial", "leve"],
    sobrio: ["simples", "essencial", "enxuto"],
  },
  confiança: {
    all: ["confiança", "segurança", "credibilidade"],
    tecnico: ["confiança", "credibilidade", "confiabilidade"],
    proximo: ["confiança", "segurança", "tranquilidade"],
    direto: ["confiança", "segurança"],
    inspirador: ["confiança", "coragem", "segurança"],
    sobrio: ["confiança", "credibilidade", "reputação"],
  },
  presença: {
    all: ["presença", "visibilidade", "lembrança"],
    tecnico: ["presença", "recorrência", "exposição"],
    proximo: ["presença", "estar por perto", "lembrança"],
    direto: ["presença", "visibilidade"],
    inspirador: ["presença", "protagonismo", "lembrança"],
    sobrio: ["presença", "reputação", "visibilidade"],
  },
  diferencial: {
    all: ["diferencial", "diferença", "vantagem"],
    tecnico: ["diferencial", "vantagem", "distinção"],
    proximo: ["diferencial", "diferença", "o que te destaca"],
    direto: ["diferencial", "vantagem"],
    inspirador: ["diferencial", "singularidade", "marca própria"],
    sobrio: ["diferencial", "distinção", "vantagem"],
  },
  mensagem: {
    all: ["mensagem", "recado", "discurso"],
    tecnico: ["mensagem", "comunicação", "discurso"],
    proximo: ["mensagem", "recado", "conversa"],
    direto: ["mensagem", "recado"],
    inspirador: ["mensagem", "narrativa", "discurso"],
    sobrio: ["mensagem", "comunicação", "narrativa"],
  },
  experiência: {
    all: ["experiência", "vivência", "percurso"],
    tecnico: ["experiência", "percurso", "trajeto"],
    proximo: ["experiência", "vivência", "caminho"],
    direto: ["experiência", "percurso"],
    inspirador: ["experiência", "jornada", "vivência"],
    sobrio: ["experiência", "trajetória", "percurso"],
  },
  sorte: {
    all: ["sorte", "acaso", "improviso"],
    tecnico: ["sorte", "acaso", "aleatoriedade"],
    proximo: ["sorte", "acaso", "chute"],
    direto: ["sorte", "chute"],
    inspirador: ["sorte", "acaso", "destino"],
    sobrio: ["sorte", "acaso", "contingência"],
  },
  rotina: {
    all: ["rotina", "dia a dia", "normalidade"],
    tecnico: ["rotina", "operação", "dia a dia"],
    proximo: ["rotina", "dia a dia", "correria de sempre"],
    direto: ["rotina", "dia a dia"],
    inspirador: ["rotina", "dia a dia", "roteiro de sempre"],
    sobrio: ["rotina", "operação", "cotidiano"],
  },
  promessa: {
    all: ["promessa", "discurso", "propaganda"],
    tecnico: ["promessa", "alegação", "discurso"],
    proximo: ["promessa", "conversa bonita", "discurso"],
    direto: ["promessa", "papo"],
    inspirador: ["promessa", "juramento", "compromisso"],
    sobrio: ["promessa", "compromisso", "declaração"],
  },
  retrabalho: {
    all: ["retrabalho", "trabalho dobrado", "tentativa e erro"],
  },
  previsibilidade: {
    all: ["previsibilidade", "segurança", "controle"],
  },
  lembrança: {
    all: ["lembrança", "memória", "recall"],
    proximo: ["lembrança", "memória"],
    tecnico: ["lembrança", "recall", "memória"],
  },
  burocracia: {
    all: ["burocracia", "papelada", "engessamento"],
  },
  opção: {
    all: ["opção", "alternativa", "caminho"],
  },
  ruído: {
    all: ["ruído", "distração", "excesso"],
  },
  processo: {
    all: ["processo", "percurso", "método"],
    tecnico: ["processo", "direcionamento", "fluxo"],
    proximo: ["processo", "caminho", "passo a passo"],
    direto: ["processo", "roteiro"],
    inspirador: ["processo", "jornada", "caminho"],
    sobrio: ["processo", "fluxo", "percurso"],
  },
  decisão: {
    all: ["decisão", "escolha", "definição"],
  },
  padrão: {
    all: ["padrão", "nível", "critério"],
  },

  // ---- Vocabulário de chamada / CTA (o acervo de legendas vive aqui) ----
  comece: {
    all: ["comece", "dê o primeiro passo", "inicie"],
    tecnico: ["comece", "inicie", "dê início"],
    proximo: ["comece", "vamos começar", "dá o primeiro passo"],
    direto: ["comece", "vai agora", "inicie"],
    inspirador: ["comece", "dê o primeiro passo", "abra esse caminho"],
    sobrio: ["comece", "inicie", "dê início"],
  },
  agora: {
    all: ["agora", "hoje", "já"],
    tecnico: ["agora", "desde já", "hoje"],
    proximo: ["agora", "hoje mesmo", "já"],
    direto: ["agora", "já", "hoje"],
    inspirador: ["agora", "hoje mesmo", "neste momento"],
    sobrio: ["agora", "desde já", "hoje"],
  },
  descubra: {
    all: ["descubra", "conheça", "veja"],
    tecnico: ["descubra", "conheça", "verifique"],
    proximo: ["descubra", "veja", "dá uma olhada em"],
    direto: ["descubra", "veja", "conheça"],
    inspirador: ["descubra", "encontre", "revele"],
    sobrio: ["descubra", "conheça", "avalie"],
  },
  caminho: {
    all: ["caminho", "percurso", "rota"],
    tecnico: ["caminho", "percurso", "trajeto"],
    proximo: ["caminho", "jeito", "rumo"],
    direto: ["caminho", "rota", "atalho certo"],
    inspirador: ["caminho", "jornada", "rumo"],
    sobrio: ["caminho", "percurso", "trajetória"],
  },
  melhor: {
    all: ["melhor", "mais sólido", "mais consistente"],
    tecnico: ["melhor", "mais preciso", "mais confiável"],
    proximo: ["melhor", "mais tranquilo", "mais leve"],
    direto: ["melhor", "mais certo", "mais eficiente"],
    inspirador: ["melhor", "mais possível", "mais inspirador"],
    sobrio: ["melhor", "mais sólido", "mais criterioso"],
  },
  ajuda: {
    all: ["ajuda", "apoio", "suporte"],
    tecnico: ["ajuda", "suporte", "assistência"],
    proximo: ["ajuda", "apoio", "uma mão"],
    direto: ["ajuda", "apoio"],
    inspirador: ["ajuda", "apoio", "impulso"],
    sobrio: ["ajuda", "suporte", "acompanhamento"],
  },
  fale: {
    all: ["fale", "converse", "chame"],
    tecnico: ["fale", "converse", "entre em contato"],
    proximo: ["fale", "chama", "manda mensagem"],
    direto: ["fale", "chame", "chama no direct"],
    inspirador: ["fale", "converse", "abra a conversa"],
    sobrio: ["fale", "converse", "entre em contato"],
  },
  saiba: {
    all: ["saiba", "entenda", "veja"],
    tecnico: ["saiba", "entenda", "confira"],
    proximo: ["saiba", "entenda", "veja"],
    direto: ["saiba", "veja", "confira"],
    inspirador: ["saiba", "descubra", "entenda"],
    sobrio: ["saiba", "entenda", "confira"],
  },
  garanta: {
    all: ["garanta", "assegure", "reserve"],
  },
  transforme: {
    all: ["transforme", "mude", "converta"],
    inspirador: ["transforme", "reinvente", "mude"],
    tecnico: ["transforme", "converta", "reorganize"],
  },
  aprenda: {
    all: ["aprenda", "domine", "entenda"],
  },
  evite: {
    all: ["evite", "fuja de", "elimine"],
  },
  ganhe: {
    all: ["ganhe", "conquiste", "acumule"],
  },
  tempo: {
    /* "horas" quebra a concordância de "falta tempo" — sinônimo precisa ser
       singular e do mesmo gênero da palavra original. */
    all: ["tempo", "prazo"],
    proximo: ["tempo", "prazo"],
    tecnico: ["tempo", "prazo", "ciclo"],
  },
  jeito: {
    all: ["jeito", "forma", "maneira"],
  },
  mudança: {
    all: ["mudança", "virada", "transformação"],
  },
  passo: {
    all: ["passo", "etapa", "movimento"],
  },
  história: {
    all: ["história", "narrativa", "trajetória"],
  },
  crescer: {
    all: ["crescer", "evoluir", "avançar"],
  },
  agende: {
    all: ["agende", "marque", "reserve"],
  },
  siga: {
    all: ["siga", "acompanhe", "fique por aqui"],
  },
  novo: {
    all: ["novo", "inédito", "recém-chegado"],
  },
  verdade: {
    all: ["verdade", "fato", "realidade"],
  },
};


const SYNONYM_KEYS = Object.keys(SYNONYMS);

const matchCase = (source: string, replacement: string) => {
  if (source === source.toUpperCase() && source.length > 1) return replacement.toUpperCase();
  if (source[0] === source[0]?.toUpperCase()) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Variantes disponíveis para uma palavra canônica no registro dado. */
export const synonymsOf = (word: string, register: VoiceRegister): string[] => {
  const row = SYNONYMS[word.toLowerCase()];
  if (!row) return [];
  const list = row[register] ?? row.all;
  return Array.from(new Set([...list, ...row.all]));
};

export type LexiconOptions = {
  register: VoiceRegister;
  /** Semente da variação — normalmente `${brandId}:${seed}`. */
  seed: string;
  /** Probabilidade de trocar cada palavra elegível (0-1). */
  intensity?: number;
  /**
   * Literais proibidos (nome de outras marcas, jargão de outro nicho). Se a
   * troca introduzir um deles, a palavra original é mantida.
   */
  forbidden?: string[];
};

const ALL_PATTERN = new RegExp(
  `\\b(${SYNONYM_KEYS.slice()
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex)
    .join("|")})\\b`,
  "gi",
);

/** Palavras do texto que têm sinônimo disponível no registro. */
export const lexicalCandidates = (text: string, register: VoiceRegister): string[] => {
  const found: string[] = [];
  for (const match of text.matchAll(ALL_PATTERN)) {
    if (synonymsOf(match[1], register).length >= 2) found.push(match[1]);
  }
  return found;
};

/** Gênero gramatical aproximado (última palavra do termo). */
const genderOf = (term: string) => {
  /* Concordância olha o NÚCLEO do grupo nominal (primeira palavra), não a
     última: "resposta mensurável" é feminino ("a resposta"), e usar o adjetivo
     final gerava erro como "o resposta mensurável". */
  const head = term.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return /a$|ção$|dade$|agem$/.test(head) ? "f" : "m";
};

const DETERMINERS = /\b(o|a|os|as|um|uma|uns|umas|do|da|no|na|ao|à|este|esta|esse|essa|aquele|aquela|seu|sua|meu|minha|nosso|nossa|todo|toda|cada|outro|outra)$/i;

/**
 * Reescreve um texto trocando palavras recorrentes por sinônimos do registro.
 * Determinístico: mesma seed + mesmo texto ⇒ mesmo resultado.
 *
 * A quantidade de trocas é proporcional à intensidade, mas SEMPRE há pelo menos
 * uma troca quando o texto tem alguma palavra elegível — variação "baixa" nunca
 * devolve a frase idêntica.
 */
export const applyLexicon = (text: string, options: LexiconOptions): string => {
  if (!text) return text;
  const { register, seed, intensity = 0.65, forbidden = [] } = options;

  type Hit = { start: number; end: number; word: string; variants: string[] };
  const hits: Hit[] = [];
  for (const match of text.matchAll(ALL_PATTERN)) {
    const word = match[1];
    const start = match.index ?? 0;
    // Concordância: depois de artigo/determinante o sinônimo precisa ter o mesmo gênero.
    const before = text.slice(Math.max(0, start - 24), start).replace(/\s+$/, "");
    const needsGender = DETERMINERS.test(before);
    const variants = synonymsOf(word, register).filter(
      (v) => v.toLowerCase() !== word.toLowerCase() && (!needsGender || genderOf(v) === genderOf(word)),
    );
    if (!variants.length) continue;

    hits.push({ start: match.index ?? 0, end: (match.index ?? 0) + word.length, word, variants });
  }
  if (!hits.length) return text;

  // Quantas trocas: proporcional à intensidade, mínimo 1.
  const quota = Math.max(1, Math.round(intensity * hits.length));
  // Ordem de prioridade determinística (muda com a seed ⇒ palavras diferentes por lote).
  const ordered = hits
    .map((hit, index) => ({ hit, rank: createRng(`lexpick:${seed}:${index}:${hit.word}`).int(10_000) }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, quota)
    .map((item) => item.hit);
  const chosen = new Set(ordered.map((hit) => hit.start));

  let out = "";
  let cursor = 0;
  hits.forEach((hit) => {
    if (!chosen.has(hit.start)) return;
    const rng = createRng(`lex:${seed}:${hit.word}:${hit.start}:${text.length}`);
    const choice = hit.variants[rng.int(hit.variants.length)];
    if (!choice) return;
    const replacement = matchCase(hit.word, choice);
    if (forbidden.some((bad) => bad && replacement.toLowerCase().includes(bad.toLowerCase()))) return;
    out += text.slice(cursor, hit.start) + replacement;
    cursor = hit.end;
  });
  out += text.slice(cursor);

  return out;
};

