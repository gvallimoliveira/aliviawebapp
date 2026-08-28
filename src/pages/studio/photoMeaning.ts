import type { StudioPhoto } from "./photos";
import type { TopicId } from "./topics";

/**
 * ============================================================================
 * LEITURA EXTRAPOLADA DA FOTO (nexo foto × assunto)
 * ============================================================================
 *
 * Uma foto NUNCA vale pelo que ela mostra literalmente. "Agachamento com
 * barra" não é um post sobre agachamento: é sobre carga, progressão, alta,
 * capacidade física, retorno ao movimento. É essa extrapolação que decide a
 * que funcionalidade do Aliv.iA a foto pode servir.
 *
 * Regras:
 * - o label da foto é insumo de LEITURA, jamais título de arte (proibido usar
 *   `photo.label` como headline — nasce a arte literal "AGACHAMENTO COM BARRA");
 * - cada foto é traduzida em temas → cada tema aponta os tópicos editoriais
 *   compatíveis;
 * - o bloco escolhe primeiro a COPY (via `picker`, cobertura editorial) e só
 *   depois a foto com maior afinidade àquele assunto. Sem afinidade nenhuma, a
 *   foto entra apenas como respiro visual (peso baixo), nunca como ilustração
 *   de um assunto que ela não sustenta.
 */

export type PhotoTheme = {
  id: string;
  /** O que a imagem significa, não o que ela mostra. */
  reading: string;
  match: RegExp;
  topics: TopicId[];
};

/** Movimento, carga, esforço → o fim da linha do cuidado: capacidade e alta. */
const LOAD_TOPICS: TopicId[] = [
  "hep",
  "treatment-plan",
  "steps-method",
  "dynamometry",
  "discharge-report",
  "express-reassessment",
  "pain-diary",
  "difi",
];

/** Mãos, tela, medida → o momento do raciocínio clínico e da coleta de dados. */
const ASSESS_TOPICS: TopicId[] = [
  "functional-tests",
  "anamnesis",
  "pain-map",
  "hypothesis",
  "differential",
  "pain-mechanism",
  "dynamometry",
  "red-flags",
  "health-general",
  "questionnaires",
  "fabq",
  "voice-notes",
  "external-upload",
];

/** Produto, bastidor, ambiente → o sistema em si e o que ele devolve. */
const PRODUCT_TOPICS: TopicId[] = [
  "report",
  "clinical-agent",
  "clinical-impression",
  "evidence-library",
  "assessment-link",
  "messaging",
  "agenda",
  "white-label",
  "documents",
];

/** Rosto, palco, marca → posicionamento, método, confiança. */
const BRAND_TOPICS: TopicId[] = [
  "steps-method",
  "difi",
  "governance",
  "privacy",
  "safety",
  "evidence-library",
  "marketplace",
  "final-hypothesis",
  "pricing",
];

export const PHOTO_THEMES: PhotoTheme[] = [
  {
    id: "carga-progressao",
    reading: "carga e progressão: o corpo voltando a suportar demanda",
    match: /agachamen|barra|halter|anilha|carga|peso|leg\s?press|remada|supino|prancha|exerc|treino|academia|salto|corrida/i,
    topics: LOAD_TOPICS,
  },
  {
    id: "controle-motor",
    reading: "controle motor fino: base de apoio, tornozelo, pé, equilíbrio",
    match: /tornozel|pé|pe\b|foot|panturr|equil|apoio|unipodal|joelho/i,
    topics: ["hep", "treatment-plan", "functional-tests", "dynamometry", "difi", "express-reassessment"],
  },
  {
    id: "avaliacao-medida",
    reading: "medir antes de decidir: exame, teste, número",
    match: /avalia|termograf|dinamom|teste|medi|goni|amplitude|adm|exame|escala/i,
    topics: ASSESS_TOPICS,
  },
  {
    id: "mao-no-paciente",
    reading: "conduta e presença clínica: alguém conduzindo o movimento",
    match: /atendiment|orienta|corre|paciente|sess|manual|terapia|laser|maca|consult/i,
    topics: [...ASSESS_TOPICS.slice(0, 6), "treatment-plan", "hep", "messaging", "report", "safety"],
  },
  {
    id: "sistema-tela",
    reading: "o sistema trabalhando: tela, relatório, dado organizado",
    match: /tela|painel|tablet|celular|notebook|relat|prontu|sistema|app/i,
    topics: PRODUCT_TOPICS,
  },
  {
    id: "anatomia-estudo",
    reading: "estudo e explicação: anatomia, modelo, ensino",
    match: /modelo|boneco|anatom|esqueleto|coluna|articul|livro|aula|estudo/i,
    topics: [
      "academic-tracks",
      "steps-method",
      "difi",
      "pain-mechanism",
      "differential",
      "evidence-library",
      "hypothesis",
    ],
  },
  {
    id: "voz-e-marca",
    reading: "quem assina o método: rosto, palco, posicionamento",
    match: /palestra|retrato|fundador|institucion|equipe|marca|logo|evento/i,
    topics: BRAND_TOPICS,
  },
];

/** Temas padrão por categoria, quando o label não diz nada. */
const USAGE_THEMES: Record<StudioPhoto["usage"], TopicId[]> = {
  institucional: BRAND_TOPICS,
  atendimento: ASSESS_TOPICS,
  produto: PRODUCT_TOPICS,
  livre: LOAD_TOPICS,
};

/**

 * FOTOS DE PROCEDIMENTO ESPECÍFICO — LISTA FECHADA.
 *
 * Algumas fotos mostram um recurso com significado clínico próprio e não podem
 * ilustrar outra etapa da avaliação nem outra abordagem terapêutica. Aqui a
 * leitura por tema é SUBSTITUÍDA por uma lista fechada de assuntos permitidos:
 *
 * - termografia: exame COMPLEMENTAR de calor superficial (sobrecarga /
 *   redução metabólica local). Só entra em contexto de avaliação como um todo,
 *   cuidado com o paciente, tecnologia na fisioterapia e pós-operatório —
 *   jamais em questionários, testes funcionais, dinamometria, mapa de dor etc.
 * - laserterapia: recurso de TRATAMENTO (dor, inflamação, reabilitação,
 *   pós-operatório) — nunca em contexto de avaliação/coleta de dados.
 */
export type PhotoRestriction = { id: string; match: RegExp; allow: TopicId[] };

export const PHOTO_RESTRICTIONS: PhotoRestriction[] = [
  {
    id: "termografia",
    match: /termograf|termic|térmic|infraverm/i,
    allow: ["external-upload", "clinical-impression", "safety", "privacy"],
  },
  {
    id: "laserterapia",
    match: /laser|fotobiomodul|led\b|ultrassom|tecar|eletroterap/i,
    allow: ["treatment-plan", "steps-method", "hep", "pain-diary", "difi", "messaging"],
  },
];

const restrictionOf = (photo: StudioPhoto): PhotoRestriction | undefined =>
  PHOTO_RESTRICTIONS.find((r) => r.match.test(`${photo.label} ${photo.credit ?? ""}`));

const themesOf = (photo: StudioPhoto): PhotoTheme[] =>
  PHOTO_THEMES.filter((theme) => theme.match.test(`${photo.label} ${photo.credit ?? ""}`));

/** Tópicos que a foto consegue sustentar (extrapolação, não literalidade). */
export const photoTopics = (photo: StudioPhoto): TopicId[] => {
  const restriction = restrictionOf(photo);
  if (restriction) return restriction.allow;
  const matched = themesOf(photo).flatMap((t) => t.topics);
  return matched.length > 0 ? Array.from(new Set(matched)) : USAGE_THEMES[photo.usage];
};

/** Leitura em texto — usada como legenda/curadoria interna, nunca como título. */
export const photoReading = (photo: StudioPhoto): string =>
  themesOf(photo)[0]?.reading ?? "registro real do cuidado";


/**
 * 0 = sem nexo; quanto maior, mais a foto conversa com o assunto da copy.
 * Copy sem tópico algum (ex.: conteúdo neutro de marca de cliente) vale 0: é
 * melhor não ter bloco fotográfico do que casar uma foto de avaliação real com
 * um texto que não fala de avaliação.
 */
export const photoAffinity = (photo: StudioPhoto, topics: (TopicId | undefined)[]): number => {
  const wanted = topics.filter(Boolean) as TopicId[];
  if (wanted.length === 0) return 0;
  const mine = photoTopics(photo);
  const hits = wanted.filter((t) => mine.includes(t)).length;
  return hits / wanted.length;
};


/**
 * Escolhe a foto que sustenta o assunto já decidido pela copy. Determinístico
 * (mesma seed → mesma foto) e com desempate por afinidade, não por sorteio
 * cego. Sem nenhuma foto com nexo, devolve `undefined`: o bloco fotográfico
 * sai da composição em vez de ilustrar um assunto que a foto não sustenta.
 */
export const pickPhotoForTopics = (
  photos: StudioPhoto[] | undefined,
  index: number,
  topics: (TopicId | undefined)[],
  prefer?: StudioPhoto["usage"][],
): StudioPhoto | undefined => {
  if (!photos || photos.length === 0) return undefined;

  const scored = photos
    .map((photo) => ({
      photo,
      score: photoAffinity(photo, topics) + (prefer?.includes(photo.usage) ? 0.35 : 0),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    /**
     * Sem nexo, só fotos LIVRES de restrição podem entrar como respiro visual.
     * Foto de procedimento específico (termografia, laserterapia) nunca cai em
     * assunto alheio — antes o fallback cego colocava termografia em arte de
     * questionários.
     */
    const neutral = photos.filter((p) => !restrictionOf(p));
    if (neutral.length === 0) return undefined;
    return neutral[Math.abs(index) % neutral.length];
  }


  /** Roda entre as fotos empatadas no topo para não repetir sempre a mesma. */
  const best = scored[0].score;
  const top = scored.filter((s) => s.score >= best - 0.001).map((s) => s.photo);
  return top[Math.abs(index) % top.length];
};
