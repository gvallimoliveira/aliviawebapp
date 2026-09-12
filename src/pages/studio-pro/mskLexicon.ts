/**
 * LÉXICO MUSCULOESQUELÉTICO (esportista, pós-operatório, dor crônica, visão 360)
 *
 * Vocabulário pedido pelo dono do produto (set/2026) para as artes deixarem de
 * falar "lesão" no genérico. Cada tema traz o nome real, o que acontece no corpo
 * e onde entra o raciocínio clínico:
 *
 *   ruptura de LCA, lesão de menisco, lesão do manguito rotador, ombro do atleta
 *   arremessador, lesão muscular, tendinopatias, dor anterior no joelho,
 *   condromalácia / dor patelofemoral, impactação do quadril, entorse de tornozelo.
 *
 * Regras de escrita: nada de promessa de cura, nada de autonomia da IA, nada de
 * "protocolo", frases curtas (a arte tem pouco espaço) e escolha determinística
 * — mesma marca/público/ângulo, mesmo texto, zero crédito de IA.
 */
import { createRng } from "@/pages/studio/rng";

export type MskTopic = {
  id: string;
  /** Termos que identificam o tema na relação da arte. */
  match: RegExp;
  /** Públicos em que o tema pode entrar quando o tema não foi citado. */
  contexts: ("esportista" | "posop" | "cronica")[];
  headlines: { strong: string; rest: string }[];
  subs: string[];
  quotes: string[];
  ctas: string[];
  glossary: { term: string; plain: string }[];
};

export const MSK_TOPICS: MskTopic[] = [
  {
    id: "lca",
    match: /lca|ligamento cruzado|cruzado anterior/i,
    contexts: ["esportista", "posop"],
    headlines: [
      { strong: "Joelho operado não é joelho pronto", rest: ". A alta do LCA se conquista por critério." },
      { strong: "Depois da ruptura de LCA", rest: ", a pergunta certa é: já dá para correr?" },
    ],
    subs: [
      "Na reconstrução do LCA, o que libera cada fase é força, controle e simetria entre as pernas — não o calendário.",
      "Voltar ao esporte com o LCA reconstruído exige testes de salto e força; sem eles, a decisão é chute.",
    ],
    quotes: ["“Tempo de cirurgia não é critério de alta: quem libera é o teste.”"],
    ctas: ["Quero critério para voltar", "Avaliar o meu joelho"],
    glossary: [
      { term: "Ruptura de LCA", plain: "é a lesão do ligamento que segura o joelho nas trocas de direção." },
      { term: "Assimetria", plain: "é a diferença de força entre as pernas: é ela que atrasa o retorno seguro." },
    ],
  },
  {
    id: "menisco",
    match: /menisc/i,
    contexts: ["esportista", "posop", "cronica"],
    headlines: [
      { strong: "Menisco não é sinônimo de cirurgia", rest: ". Boa parte responde à reabilitação." },
      { strong: "O joelho que trava e incha", rest: " merece avaliação antes de qualquer conclusão." },
    ],
    subs: [
      "A lesão de menisco pede leitura do sintoma: travar, estalar e inchar dizem coisas diferentes sobre a carga tolerada.",
      "Menisco desgastado no exame convive com joelho sem dor: o que orienta o plano é o exame clínico.",
    ],
    quotes: ["“Imagem alterada e joelho funcional podem viver juntos.”"],
    ctas: ["Entender o meu joelho"],
    glossary: [
      { term: "Lesão de menisco", plain: "é o dano no amortecedor do joelho, entre a coxa e a perna." },
      { term: "Travamento", plain: "é o joelho que 'prende' no meio do movimento e precisa ser avaliado." },
    ],
  },
  {
    id: "manguito",
    match: /manguito|supraespinh|ombro/i,
    contexts: ["esportista", "posop", "cronica"],
    headlines: [
      { strong: "Nem toda dor no ombro", rest: " é manguito rotador rompido." },
      { strong: "Levantar o braço dói", rest: "? O manguito rotador é o primeiro suspeito, não o veredito." },
    ],
    subs: [
      "A lesão do manguito rotador afeta os músculos que estabilizam a cabeça do úmero: força e amplitude contam mais que o laudo.",
      "Ombro doído responde a carga progressiva; a avaliação define quais movimentos entram e quais esperam.",
    ],
    quotes: ["“No ombro, o que muda o plano é o teste de força, não o susto do exame.”"],
    ctas: ["Avaliar o meu ombro"],
    glossary: [
      { term: "Manguito rotador", plain: "são quatro músculos que centram e estabilizam o ombro." },
      { term: "Amplitude", plain: "é o quanto o braço sobe sem compensar com o tronco." },
    ],
  },
  {
    id: "arremessador",
    match: /arremess|handebol|beisebol|v[oô]lei|saque|tenista|overhead/i,
    contexts: ["esportista"],
    headlines: [
      { strong: "Ombro de arremessador", rest: " não se trata como ombro comum." },
      { strong: "Perdeu velocidade no arremesso", rest: "? O ombro pediu avaliação antes de doer." },
    ],
    subs: [
      "No atleta arremessador, o ombro troca amplitude por controle: rotação, escápula e resistência mudam o gesto inteiro.",
      "Volume de arremessos, dor no fim do treino e queda de velocidade são sinais precoces — não teimosia.",
    ],
    quotes: ["“No arremesso, o gesto denuncia antes da dor aparecer.”"],
    ctas: ["Quero avaliar o meu gesto"],
    glossary: [
      { term: "Ombro do arremessador", plain: "é o ombro adaptado ao gesto acima da cabeça, com ganho de rotação externa." },
      { term: "Controle escapular", plain: "é a estabilidade da escápula que sustenta o arremesso." },
    ],
  },
  {
    id: "muscular",
    match: /les[ãa]o muscular|distens|estiramento|posterior de coxa|isquiotibi|panturrilha/i,
    contexts: ["esportista", "cronica"],
    headlines: [
      { strong: "Lesão muscular recidiva", rest: " quando a alta chega antes da força." },
      { strong: "Sentiu a fisgada no sprint", rest: "? O músculo pede plano por fases." },
    ],
    subs: [
      "A lesão muscular volta quando o retorno acontece sem força em alongamento e sem exposição gradual à velocidade.",
      "Cada fase da lesão muscular tem tarefa própria: proteger, carregar, acelerar — nessa ordem.",
    ],
    quotes: ["“Músculo cicatriza rápido; a capacidade de correr demora mais.”"],
    ctas: ["Quero um plano por fases"],
    glossary: [
      { term: "Lesão muscular", plain: "é o dano nas fibras, comum em arrancadas e desacelerações." },
      { term: "Recidiva", plain: "é a lesão que volta no mesmo lugar por retorno apressado." },
    ],
  },
  {
    id: "tendinopatia",
    match: /tendinopat|tendinit|tend[ãa]o|aquiles|patelar|epicondil/i,
    contexts: ["esportista", "cronica"],
    headlines: [
      { strong: "Tendinopatia não é inflamação simples", rest: ". É tendão sem tolerância à carga." },
      { strong: "Repouso alivia e a dor volta", rest: "? O tendão precisa de carga, não de pausa." },
    ],
    subs: [
      "Nas tendinopatias, a carga é o remédio: dose progressiva, dor controlada e paciência com o tempo do tendão.",
      "Tendão dói ao esquentar e melhora no meio do treino: esse padrão orienta a dose da semana.",
    ],
    quotes: ["“Tendão não quer repouso: quer carga na dose certa.”"],
    ctas: ["Ajustar a minha carga"],
    glossary: [
      { term: "Tendinopatia", plain: "é a perda de tolerância do tendão à carga, com dor ao esforço." },
      { term: "Dose de carga", plain: "é o quanto de estímulo o tendão suporta sem piorar no dia seguinte." },
    ],
  },
  {
    id: "patelofemoral",
    match: /dor anterior no joelho|patelofemoral|patelo[-\s]?femoral|condromal[aá]cia|r[oó]tula|patela/i,
    contexts: ["esportista", "cronica"],
    headlines: [
      { strong: "Dor na frente do joelho", rest: " raramente é cartilagem gasta." },
      { strong: "Dói ao descer escada", rest: "? A articulação patelofemoral está sobrecarregada." },
    ],
    subs: [
      "Condromalácia no laudo não explica a dor sozinha: quadril, quadríceps e volume de treino mudam a história.",
      "Na dor patelofemoral, força de quadril e coxa e ajuste de carga costumam devolver escada, agachamento e corrida.",
    ],
    quotes: ["“Condromalácia é achado; a dor patelofemoral é o que se trata.”"],
    ctas: ["Entender a dor no meu joelho"],
    glossary: [
      { term: "Dor patelofemoral", plain: "é a dor na frente do joelho, entre a rótula e o fêmur." },
      { term: "Condromalácia", plain: "é o desgaste da cartilagem da rótula, comum e nem sempre doloroso." },
    ],
  },
  {
    id: "quadril",
    match: /impacta[çc][ãa]o|impingement|quadril|femoroacetabular|virilha/i,
    contexts: ["esportista", "cronica", "posop"],
    headlines: [
      { strong: "Dor na virilha ao agachar", rest: " pode ser impactação do quadril." },
      { strong: "Quadril que trava fundo", rest: " precisa de avaliação, não de mais alongamento." },
    ],
    subs: [
      "Na impactação femoroacetabular, a dor aparece no fim da flexão e rotação: o plano ajusta amplitude e força antes de insistir.",
      "Alongar mais um quadril que impacta costuma piorar; o caminho é controle e carga na amplitude tolerada.",
    ],
    quotes: ["“Quadril que impacta não pede mais amplitude: pede controle.”"],
    ctas: ["Avaliar o meu quadril"],
    glossary: [
      { term: "Impactação do quadril", plain: "é o contato precoce entre fêmur e bacia no fim do movimento." },
      { term: "Amplitude tolerada", plain: "é até onde o quadril vai sem provocar a dor da virilha." },
    ],
  },
  {
    id: "tornozelo",
    match: /entorse|tornozelo|inst[aá]bilidade de tornozelo/i,
    contexts: ["esportista", "cronica"],
    headlines: [
      { strong: "Entorse de tornozelo mal reabilitado", rest: " é o motivo do próximo entorse." },
      { strong: "Torceu e voltou a jogar", rest: "? O tornozelo ainda não recuperou o equilíbrio." },
    ],
    subs: [
      "Depois do entorse, equilíbrio, força de panturrilha e salto unipodal decidem se o tornozelo está pronto.",
      "Tornozelo que falseia sinaliza instabilidade: dá para treinar controle e devolver confiança no apoio.",
    ],
    quotes: ["“A maior causa de entorse é um entorse anterior mal cuidado.”"],
    ctas: ["Avaliar o meu tornozelo"],
    glossary: [
      { term: "Entorse de tornozelo", plain: "é a torção que estira os ligamentos laterais do pé." },
      { term: "Instabilidade", plain: "é a sensação de falseio que sobra quando a reabilitação para cedo." },
    ],
  },
];

const CONTEXT_MATCH: Record<"esportista" | "posop" | "cronica", RegExp> = {
  esportista: /esportista|atleta|performance|corrida|corredor|treino|esporte|academia/i,
  posop: /p[oó]s[-\s]?operat[oó]rio|p[oó]s[-\s]?cir[uú]rgic|operou|cirurgia|reabilita[çc][ãa]o/i,
  cronica: /dor\s+cr[oô]nica|dor\s+persistente|dor\s+h[aá]\s+meses|dor\s+de\s+anos/i,
};

/** Tema citado diretamente na relação da arte. */
export const findMskTopic = (probe?: string): MskTopic | undefined =>
  probe ? MSK_TOPICS.find((topic) => topic.match.test(probe)) : undefined;

/** Contextos (públicos) em que o acervo pode entrar sem o tema citado. */
export const mskContextsFor = (probe?: string) =>
  probe
    ? (Object.keys(CONTEXT_MATCH) as ("esportista" | "posop" | "cronica")[]).filter((key) =>
        CONTEXT_MATCH[key].test(probe),
      )
    : [];

export const matchesMsk = (probe?: string) => Boolean(findMskTopic(probe) || mskContextsFor(probe).length);

const pick = <T,>(pool: T[], seed: string, count: number) => {
  const rng = createRng(`msk:${seed}`);
  const rest = [...pool];
  const out: T[] = [];
  while (rest.length && out.length < count) out.push(...rest.splice(rng.int(rest.length), 1));
  return out;
};

/**
 * Escolhe o tema da arte: o citado tem prioridade; sem citação, roda entre os
 * temas do público pela semente do lote (mantém rotatividade sem repetir).
 */
export const mskTopicFor = (probe: string, seed: string): MskTopic | undefined => {
  const direct = findMskTopic(probe);
  if (direct) return direct;
  const contexts = mskContextsFor(probe);
  if (!contexts.length) return undefined;
  const pool = MSK_TOPICS.filter((topic) => topic.contexts.some((c) => contexts.includes(c)));
  return pick(pool, `topic:${seed}`, 1)[0];
};

/** Linhas prontas do tema, escolhidas pela semente do lote. */
export const mskLines = (probe: string, seed: string) => {
  const topic = mskTopicFor(probe, seed);
  if (!topic) return undefined;
  return {
    topic,
    headlines: pick(topic.headlines, `h:${topic.id}:${seed}`, 2),
    subs: pick(topic.subs, `s:${topic.id}:${seed}`, 2),
    quotes: pick(topic.quotes, `q:${topic.id}:${seed}`, 1).map((text) => ({ text })),
    ctas: pick(topic.ctas, `c:${topic.id}:${seed}`, 2),
    glossary: pick(topic.glossary, `g:${topic.id}:${seed}`, 2).map((row) => `${row.term}: ${row.plain}`),
  };
};
