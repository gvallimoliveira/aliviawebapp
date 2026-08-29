/**
 * ACERVO CHARMOSO EXCLUSIVO — Aliv.iA (app clínico) e seus nichos
 *
 * Fonte: tabela "Abordagem Comum (Fria/Genérica) x Abordagem Charmosa (Estilo
 * Aliv.iA)" entregue pelo dono do produto em ago/2026, com 6 públicos:
 * paciente com dor, fisioterapeuta autônomo, clínica/gestor, estudante,
 * recém-formado e visão 360° institucional.
 *
 * ISOLAMENTO DE MARCA: este acervo fala do produto Aliv.iA (avaliação guiada,
 * prontuário, STEPS, D.I.F.I., raciocínio clínico). Em uma marca de cliente
 * soaria como se o cliente vendesse o Aliv.iA. Por isso só é lido quando
 * `isAliviaCoreBrand(brand)` é verdadeiro — e nunca para o Aliv.iA Studio,
 * que tem o próprio acervo em `studioSelfCharm.ts`.
 *
 * A coluna fria fica registrada apenas como contraexemplo: nunca é renderizada.
 */

/** Detecta a marca Aliv.iA "normal" (app clínico), excluindo o Aliv.iA Studio. */
export const isAliviaCoreBrand = (brandName: string): boolean => {
  const name = (brandName ?? "").replace(/\s+/g, " ").trim();
  if (!name) return false;
  if (/aliv\s*\.?\s*ia\s*studio/i.test(name)) return false;
  return /aliv\s*\.?\s*i\s*a\b/i.test(name);
};

export type AliviaCoreCharmRow = {
  id: string;
  /** Público-alvo / ângulo do guia (rótulo original). */
  label: string;
  /** Termos que identificam o público na relação eleita. */
  match: RegExp;
  /** Como NÃO escrever. Documental. */
  cold: string;
  /** Ponto zero charmoso. */
  headline: { strong: string; rest: string };
  /** Apoio que fecha a ponte lógica. */
  sub: string;
  /** Convite seguro. */
  cta: string;
};

export const ALIVIA_CORE_CHARM: AliviaCoreCharmRow[] = [
  {
    id: "paciente-com-dor",
    label: "Paciente com Dor",
    match: /paciente|dor\b|dor cr[oô]nica|lombar|coluna|joelho|ombro|les[ãa]o|quem sente dor/i,
    cold: "Faça uma avaliação online do seu problema de coluna com nossa IA e receba um plano de exercícios em casa.",
    headline: {
      strong: "Entender a sua dor",
      rest: " é o primeiro passo para parar de sentir medo.",
    },
    sub: "Faça uma avaliação guiada, identifique se há sinais de alerta e receba um plano claro para recuperar sua rotina.",
    cta: "Entender a minha dor",
  },
  {
    id: "fisioterapeuta-autonomo",
    label: "Fisioterapeuta Autônomo",
    match: /fisioterapeuta aut[oô]nom|aut[oô]nom|profissional solo|consult[oó]rio pr[oó]prio|fisioterapeuta\b/i,
    cold: "Software para fisioterapeutas gerarem prontuários e fichas de avaliação mais rápido. Crie sua conta.",
    headline: {
      strong: "Você não estudou anos",
      rest: " para perder 30 minutos por consulta preenchendo papelada.",
    },
    sub: "Transforme a queixa do paciente em uma hipótese estruturada e relatório profissional em um clique.",
    cta: "Recuperar o meu tempo de consulta",
  },
  {
    id: "clinica-gestor",
    label: "Clínica / Gestor",
    match: /cl[ií]nic|gestor|gest[ãa]o|equipe|time cl[ií]nico|propriet[aá]ri|multiprofissional/i,
    cold: "Sistema de gestão para clínicas de fisioterapia com gráficos e controle de atendimentos.",
    headline: {
      strong: "Padronize o raciocínio clínico da sua equipe",
      rest: " sem engessar os atendimentos.",
    },
    sub: "Acompanhe a evolução de cada caso, elimine altas sem critério e retenha o conhecimento na sua operação.",
    cta: "Padronizar sem engessar",
  },
  {
    id: "estudante",
    label: "Estudante de Fisioterapia",
    match: /estudante|acad[êe]mic|gradua[çc][ãa]o|universit[aá]ri|faculdade|est[aá]gi/i,
    cold: "Plataforma de estudos para fisioterapia com quizzes e casos de prova para você passar nas matérias.",
    headline: {
      strong: "Decorar testes para a prova",
      rest: " não ensina a raciocinar na prática.",
    },
    sub: "Treine com casos clínicos comentados, valide suas hipóteses e conquiste a segurança que a sala de aula não entrega.",
    cta: "Treinar raciocínio de verdade",
  },
  {
    id: "recem-formado",
    label: "Recém-Formado",
    match: /rec[eé]m[-\s]?formad|primeiro paciente|come[çc]ando a atender|iniciante|novo profissional/i,
    cold: "Sistema de prontuário e prescrição para recém-formados em fisioterapia começarem a atender.",
    headline: {
      strong: "Sair da faculdade e encarar o primeiro paciente sozinho",
      rest: " não precisa gerar insegurança.",
    },
    sub: "Estruture seu atendimento com os métodos STEPS e D.I.F.I. e entregue condutas com o lastro de um veterano.",
    cta: "Atender com lastro desde o início",
  },
  {
    id: "institucional-360",
    label: "Visão 360° (Institucional)",
    match: /institucional|vis[ãa]o 360|marca|manifesto|sobre n[oó]s|posicionamento/i,
    cold: "Aliv.iA é um app de IA que ajuda no tratamento da dor e substitui a papelada do fisioterapeuta.",
    headline: {
      strong: "Um sistema de raciocínio clínico",
      rest: " com alma de fisioterapeuta.",
    },
    sub: "Da primeira queixa até a alta documentada, devolvemos o seu tempo para o que só você pode fazer: tocar, decidir e cuidar.",
    cta: "Conhecer o Aliv.iA",
  },
];

/**
 * Linha charmosa do público ativo — só para a marca Aliv.iA (app clínico).
 * Sem correspondência clara, cai na linha institucional (o discurso mais amplo
 * da marca) em vez de devolver nada.
 */
export const findAliviaCoreCharm = (probe: string): AliviaCoreCharmRow | undefined => {
  const text = (probe ?? "").trim();
  if (!text) return undefined;
  return (
    ALIVIA_CORE_CHARM.find((row) => row.match.test(text)) ??
    ALIVIA_CORE_CHARM.find((row) => row.id === "institucional-360")
  );
};
