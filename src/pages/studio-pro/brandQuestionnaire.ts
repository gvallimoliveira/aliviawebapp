/**
 * QUESTIONÁRIO DE MARCA (versão reduzida)
 *
 * Caminho para quem NÃO tem manual de marca: 18 perguntas em 5 blocos que
 * cobrem o mínimo para o motor criativo escrever com voz própria. As respostas
 * ficam em `studio_brands.brief_answers` e entram na interpretação por IA como
 * briefing declarado pelo cliente (abaixo do manual em PDF, acima do site).
 */

export type QuestionKind = "short" | "long" | "choice";

export type BrandQuestion = {
  id: string;
  label: string;
  hint?: string;
  kind: QuestionKind;
  /** Sugestões clicáveis (kind === "choice"): o texto continua editável. */
  options?: string[];
};

export type BrandQuestionBlock = {
  id: string;
  title: string;
  intro: string;
  questions: BrandQuestion[];
};

export type BriefAnswers = Record<string, string>;

export const BRAND_QUESTIONNAIRE: BrandQuestionBlock[] = [
  {
    id: "identidade",
    title: "1. Identidade",
    intro: "Quem fala e por que alguém deveria ouvir.",
    questions: [
      {
        id: "apresentacao",
        label: "Como você se apresenta em uma frase para quem nunca te viu?",
        hint: "Ex.: Fisioterapeuta que trata a causa da dor, não só o sintoma.",
        kind: "short",
      },
      {
        id: "oferta",
        label: "O que você vende ou entrega, na prática?",
        hint: "Serviços, planos, produtos — com os nomes que você já usa.",
        kind: "long",
      },
      {
        id: "diferencial",
        label: "Qual é o seu diferencial real?",
        hint: "O que você faz que o vizinho de mercado não faz.",
        kind: "long",
      },
      {
        id: "assinatura",
        label: "Como quer ser chamado nas artes?",
        hint: "Nome ou selo + registro profissional, se houver. Ex.: Guilherme Vallim · CREFITO 359566-F",
        kind: "short",
      },
    ],
  },
  {
    id: "publico",
    title: "2. Público",
    intro: "Para quem a arte fala. Sem isso, todo texto sai genérico.",
    questions: [
      {
        id: "publico_primario",
        label: "Quem é o público primário?",
        hint: "Cliente final, empresa, colega de profissão…",
        kind: "short",
      },
      {
        id: "perfil",
        label: "Perfil do cliente ideal",
        hint: "Idade, região, rotina, o que ele já tentou antes.",
        kind: "long",
      },
      {
        id: "dor",
        label: "Qual é a maior dor dele?",
        hint: "Nas palavras dele, não nas suas.",
        kind: "long",
      },
      {
        id: "desejo",
        label: "Qual é o maior desejo — e a objeção mais comum?",
        hint: "Ex.: quer voltar a correr; acha que vai custar caro e demorar.",
        kind: "long",
      },
    ],
  },
  {
    id: "voz",
    title: "3. Voz",
    intro: "Como a marca escreve. Isso orienta a IA — nunca aparece dentro da arte.",
    questions: [
      {
        id: "tom",
        label: "Tom da comunicação",
        kind: "choice",
        options: [
          "Direto e objetivo",
          "Acolhedor e educativo",
          "Direto com provocação leve",
          "Técnico e criterioso",
        ],
      },
      {
        id: "nivel_tecnico",
        label: "Nível técnico do texto",
        kind: "choice",
        options: [
          "Quase tudo em linguagem do cliente",
          "Meio a meio",
          "Bem técnico, público especializado",
        ],
      },
      {
        id: "proibidas",
        label: "Palavras e promessas proibidas",
        hint: "Ex.: cura, milagre, garantia de resultado.",
        kind: "long",
      },
      {
        id: "cta",
        label: "Qual ação você quer que a pessoa tome?",
        hint: "Ex.: chamar no WhatsApp, agendar avaliação, link na bio.",
        kind: "short",
      },
    ],
  },
  {
    id: "visual",
    title: "4. Visual",
    intro: "A moldura das artes: luz, cor e sensação.",
    questions: [
      {
        id: "fundo",
        label: "Fundo das artes",
        kind: "choice",
        options: ["Escuro com destaque quente", "Claro e limpo", "Alternar os dois"],
      },
      {
        id: "destaque",
        label: "Cor de destaque da marca",
        hint: "Nome ou código. Ex.: âmbar #E8B54A. Se não tiver, deixe em branco.",
        kind: "short",
      },
      {
        id: "sensacao",
        label: "Sensação que a arte deve passar",
        kind: "choice",
        options: [
          "Premium, com muito respiro",
          "Enérgica e densa de informação",
          "Séria e institucional",
          "Próxima e humana",
        ],
      },
      {
        id: "referencias",
        label: "Referências ou material que já existe",
        hint: "Perfis, marcas ou peças que você admira — e o que já usa hoje.",
        kind: "long",
      },
    ],
  },
  {
    id: "limites",
    title: "5. Limites",
    intro: "O que a marca nunca faz. Vale tanto quanto o que ela faz.",
    questions: [
      {
        id: "nunca_prometer",
        label: "O que nunca pode ser prometido?",
        hint: "Regras do seu conselho, garantias, prazos.",
        kind: "long",
      },
      {
        id: "nao_atrair",
        label: "Que casos ou públicos você não quer atrair?",
        kind: "long",
      },
    ],
  },
];

export const BRAND_QUESTIONS = BRAND_QUESTIONNAIRE.flatMap((b) => b.questions);

/** Lê o jsonb do banco sem confiar no formato. */
export const readBriefAnswers = (raw: unknown): BriefAnswers => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: BriefAnswers = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }
  return out;
};

export const answeredCount = (answers: BriefAnswers) =>
  BRAND_QUESTIONS.filter((q) => (answers[q.id] ?? "").trim()).length;

export const blockAnsweredCount = (block: BrandQuestionBlock, answers: BriefAnswers) =>
  block.questions.filter((q) => (answers[q.id] ?? "").trim()).length;

/**
 * Vira briefing textual para a IA. Só entra o que foi respondido — campo vazio
 * não deve sugerir ao modelo que a marca "não tem" aquilo.
 */
export const formatBriefAnswers = (answers: BriefAnswers): string => {
  const parts: string[] = [];
  for (const block of BRAND_QUESTIONNAIRE) {
    const lines = block.questions
      .map((q) => {
        const value = (answers[q.id] ?? "").trim();
        return value ? `- ${q.label} ${value}` : null;
      })
      .filter(Boolean) as string[];
    if (lines.length) parts.push(`${block.title}\n${lines.join("\n")}`);
  }
  if (!parts.length) return "";
  return `QUESTIONÁRIO DE MARCA respondido pelo próprio cliente:\n${parts.join("\n\n")}`;
};
