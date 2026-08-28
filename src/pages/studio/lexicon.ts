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
  direto: ["direto", "objetiv", "sem rodeio", "prátic", "seco", "claro", "simples", "assertiv"],
  inspirador: ["inspirad", "motivac", "emocion", "transform", "sonho", "propósit", "energ", "aspiracion"],
  sobrio: ["sóbri", "elegan", "premium", "discret", "minimal", "sofistic", "sério", "institucional"],
};

/**
 * Classifica o tom de voz livre do kit em um registro. Sem tom declarado, o
 * registro sai da própria marca (hash do nome) para que marcas diferentes não
 * soem iguais por padrão.
 */
export const voiceRegister = (tone?: string | null, fallbackSeed = "marca"): VoiceRegister => {
  const text = (tone ?? "").toLowerCase();
  if (text.trim()) {
    let best: { register: VoiceRegister; score: number } = { register: "proximo", score: 0 };
    VOICE_REGISTERS.forEach((register) => {
      const score = REGISTER_HINTS[register].reduce((sum, hint) => (text.includes(hint) ? sum + 1 : sum), 0);
      if (score > best.score) best = { register, score };
    });
    if (best.score > 0) return best.register;
  }
  return VOICE_REGISTERS[createRng(`register:${fallbackSeed}`).int(VOICE_REGISTERS.length)];
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
    direto: ["claro", "direto", "sem rodeio"],
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
    tecnico: ["método", "protocolo", "padrão"],
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
  começa: {
    all: ["começa", "nasce", "parte"],
    tecnico: ["começa", "inicia", "parte"],
    proximo: ["começa", "nasce", "parte"],
    direto: ["começa", "sai"],
    inspirador: ["começa", "nasce", "floresce"],
    sobrio: ["começa", "inicia", "origina"],
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
    all: ["retrabalho", "refação", "trabalho dobrado"],
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
    tecnico: ["processo", "protocolo", "fluxo"],
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
  próximo: {
    all: ["próximo", "seguinte"],
    tecnico: ["próximo", "seguinte"],
    proximo: ["próximo", "seguinte"],
    direto: ["próximo", "seguinte"],
    inspirador: ["próximo", "seguinte"],
    sobrio: ["próximo", "seguinte"],
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

/**
 * Reescreve um texto trocando palavras recorrentes por sinônimos do registro.
 * Determinístico: mesma seed + mesmo texto ⇒ mesmo resultado.
 */
export const applyLexicon = (text: string, options: LexiconOptions): string => {
  if (!text) return text;
  const { register, seed, intensity = 0.65, forbidden = [] } = options;
  let out = text;

  SYNONYM_KEYS.forEach((key) => {
    const variants = synonymsOf(key, register);
    if (variants.length < 2) return;
    const pattern = new RegExp(`\\b${escapeRegex(key)}\\b`, "gi");
    let occurrence = 0;
    out = out.replace(pattern, (match) => {
      const rng = createRng(`lex:${seed}:${key}:${occurrence}:${text.length}`);
      occurrence += 1;
      if (!rng.chance(intensity)) return match;
      const choice = variants[rng.int(variants.length)];
      if (!choice || choice.toLowerCase() === match.toLowerCase()) return match;
      const replacement = matchCase(match, choice);
      if (forbidden.some((bad) => bad && replacement.toLowerCase().includes(bad.toLowerCase()))) return match;
      return replacement;
    });
  });

  return out;
};
