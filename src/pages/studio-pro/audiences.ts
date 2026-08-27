/**
 * SEGMENTAÇÃO DE PÚBLICOS DE UMA MARCA (reprodutível para qualquer cliente)
 *
 * Toda marca do Studio pode ter N nichos (públicos) — como o Aliv.iA tem
 * paciente, profissional, clínica e estudante. Além dos nichos existe sempre o
 * segmento global "360°", que interpola todos eles e mostra o produto inteiro.
 *
 * O motor criativo nunca precisa saber qual é o cliente: ele recebe um
 * `WorldContent` já resolvido a partir do segmento + ângulo escolhidos.
 */

/** Segmento global: visão 360° do produto/empresa, interpolando os nichos. */
export const GLOBAL_SEGMENT = "360";

/** Ângulos estratégicos de conteúdo — a "intenção" do post. */
export type ContentAngle = "informar" | "dor" | "desejo" | "venda";

export const ANGLES: { id: ContentAngle; label: string; hint: string }[] = [
  { id: "informar", label: "Informar", hint: "explica, ensina, mostra o método" },
  { id: "dor", label: "Dor", hint: "nomeia o problema que o público vive hoje" },
  { id: "desejo", label: "Desejo", hint: "mostra o cenário que a pessoa quer" },
  { id: "venda", label: "Venda", hint: "prova, quebra objeção e chama para a ação" },
];

export type BrandAudience = {
  /** Slug estável (usado na URL e nas abas). */
  id: string;
  /** Nome do público, ex.: "Paciente", "Clínica", "Franqueado". */
  label: string;
  /** Quem é essa pessoa e em que momento ela chega. */
  description?: string;
  /** Dores concretas desse nicho. */
  pains?: string[];
  /** Desejos / resultado esperado. */
  desires?: string[];
  /** Provas e diferenciais que convencem esse nicho. */
  proof?: string[];
  /** Chamada para ação preferida desse nicho. */
  cta?: string;
};

export const slugifySegment = (label: string) =>
  label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 32) || "publico";

const asStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const list = value.map((v) => String(v ?? "").trim()).filter(Boolean);
  return list.length ? list : undefined;
};

/** Lê a coluna `audiences` (jsonb) com tolerância a formatos incompletos. */
export const readAudiences = (raw: unknown): BrandAudience[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): BrandAudience | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const label = String(row.label ?? "").trim();
      if (!label) return null;
      return {
        id: String(row.id ?? "").trim() || slugifySegment(label),
        label,
        description: String(row.description ?? "").trim() || undefined,
        pains: asStringArray(row.pains),
        desires: asStringArray(row.desires),
        proof: asStringArray(row.proof),
        cta: String(row.cta ?? "").trim() || undefined,
      };
    })
    .filter((a): a is BrandAudience => a !== null);
};

/** Serializa para o jsonb, removendo campos vazios. */
export const writeAudiences = (list: BrandAudience[]): BrandAudience[] =>
  list
    .filter((a) => a.label.trim())
    .map((a) => ({
      id: a.id || slugifySegment(a.label),
      label: a.label.trim(),
      ...(a.description?.trim() ? { description: a.description.trim() } : {}),
      ...(a.pains?.length ? { pains: a.pains } : {}),
      ...(a.desires?.length ? { desires: a.desires } : {}),
      ...(a.proof?.length ? { proof: a.proof } : {}),
      ...(a.cta?.trim() ? { cta: a.cta.trim() } : {}),
    }));

export type Segment = { id: string; label: string };

/**
 * Abas de segmento de uma marca: sempre começa pelo global 360° e depois lista
 * os nichos cadastrados. Marcas sem nicho ficam só com o 360°.
 */
export const buildSegments = (audiences: BrandAudience[]): Segment[] => [
  { id: GLOBAL_SEGMENT, label: "Visão 360°" },
  ...audiences.map((a) => ({ id: a.id, label: a.label })),
];

/**
 * Públicos oficiais da própria Aliv.iA. Estruturalmente são 4 nichos
 * (paciente, profissional, clínica, acadêmico) + 1 sub-nicho do acadêmico:
 * o recém-formado, que tem dor, desejo e argumento de venda próprios.
 */
export const ALIVIA_AUDIENCES: BrandAudience[] = [
  {
    id: "paciente",
    label: "Paciente",
    description: "Sente dor, já pesquisou no Google e não sabe se o caso é grave nem por onde começar.",
    pains: ["Dor que volta sempre", "Diagnóstico vago", "Medo de piorar se se mexer"],
    desires: ["Entender o que está acontecendo", "Um plano claro para seguir em casa"],
    proof: ["Avaliação guiada por perguntas objetivas", "Triagem de sinais de alerta", "Plano de exercícios com acompanhamento"],
    cta: "Fazer minha avaliação",
  },
  {
    id: "pro",
    label: "Profissional",
    description: "Fisioterapeuta autônomo que perde tempo em anamnese e documentação.",
    pains: ["30 minutos de anamnese por consulta", "Prontuário incompleto", "Relatório que ninguém lê"],
    desires: ["Paciente chegando com avaliação pronta", "Relatório profissional em um clique"],
    proof: ["Link de avaliação próprio", "Prontuário com evolução e gráficos", "HEP gerada com raciocínio clínico"],
    cta: "Testar o painel profissional",
  },
  {
    id: "clinica",
    label: "Clínica",
    description: "Gestor que precisa padronizar a qualidade clínica de uma equipe inteira.",
    pains: ["Cada terapeuta avalia de um jeito", "Sem visão de indicadores", "Alta sem critério"],
    desires: ["Padrão clínico único", "Indicadores da equipe em um painel"],
    proof: ["Link institucional da clínica", "Prontuário compartilhado pela equipe", "Indicadores de adesão e alta"],
    cta: "Falar sobre a minha clínica",
  },
  {
    id: "academico",
    label: "Estudante",
    description: "Estudante de fisioterapia que sabe a teoria mas travou no raciocínio clínico.",
    pains: ["Decorou testes sem saber interpretar", "Insegurança no primeiro atendimento"],
    desires: ["Raciocinar como fisioterapeuta", "Treinar com casos reais"],
    proof: ["Trilhas com quizzes", "Casos clínicos comentados", "Progresso com XP e selos"],
    cta: "Começar minha trilha",
  },
  {
    id: "recem-formado",
    label: "Recém-formado",
    description: "Sub-nicho do acadêmico: já tem registro, atende os primeiros pacientes e teme errar a conduta.",
    pains: [
      "Insegurança para fechar a hipótese sozinho",
      "Medo de perder o paciente na primeira consulta",
      "Sem prontuário nem relatório que passe credibilidade",
    ],
    desires: ["Chegar seguro na conduta", "Parecer profissional desde o primeiro atendimento"],
    proof: [
      "Raciocínio clínico passo a passo com STEPS e D.I.F.I",
      "Relatório e HEP prontos para entregar ao paciente",
      "Prontuário organizado desde o primeiro caso",
    ],
    cta: "Começar com segurança",
  },
];

/** IDs oficiais — usados para impedir que a IA crie nichos duplicados. */
export const ALIVIA_AUDIENCE_IDS = ALIVIA_AUDIENCES.map((a) => a.id);
