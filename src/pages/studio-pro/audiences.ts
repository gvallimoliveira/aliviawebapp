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

/**
 * Segmento global: visão 360° = MODO LIVRE. Não é "falar de todos os públicos
 * ao mesmo tempo": é qualquer assunto relevante à marca — características da
 * própria marca ou de um público qualquer, sorteado a cada lote (quase
 * aleatório, mas determinístico por seed).
 */
export const GLOBAL_SEGMENT = "360";

/** Ângulos estratégicos de conteúdo — a "intenção" do post. */
export type ContentAngle = "informar" | "dor" | "desejo" | "venda";

export const ANGLES: { id: ContentAngle; label: string; hint: string }[] = [
  {
    id: "informar",
    label: "Informar",
    hint: "comunica algo que a marca faz, resolve ou considera relevante — sem dar aula",
  },
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
  /**
   * PALAVRA-CHAVE do público — o termo que a arte precisa dizer na cara
   * ("Dor crônica", "Esportista", "Geração 60+"). Sem isso o texto sai
   * genérico e o público não se reconhece. Fallback: o próprio label.
   */
  keyword?: string;
  /**
   * GANCHO direto, em 2ª pessoa, que abre a frase ("Você que convive com dor
   * há meses"). Fallback derivado do label.
   */
  hook?: string;
  /**
   * VARIAÇÕES de gancho para o mesmo público — o motor criativo alterna entre
   * elas para não repetir a mesma abertura em todas as artes. `hook` continua
   * sendo o gancho principal; `hooks` são alternativas equivalentes.
   */
  hooks?: string[];
  /**
   * REGRA DO SISTEMA — públicos matriz x derivados.
   * Vazio/ausente = público MATRIZ (conta na métrica oficial da marca).
   * Preenchido com o id de outro público = SUB-NICHO derivado dele: tem
   * comunicação própria, mas NUNCA entra na contagem oficial de públicos.
   */
  parentId?: string;
};

/** Termo que a arte deve gritar para o público se reconhecer. */
export const audienceKeyword = (a: BrandAudience): string => {
  const own = a.keyword?.trim();
  if (own) return own;
  return (
    a.label
      .trim()
      .replace(/^pacientes?\s+(com|em|no|na|de)\s+/i, "")
      .replace(/^praticante de\s+/i, "")
      .trim() || a.label.trim()
  );
};

/** Abertura em 2ª pessoa, para chamar o público diretamente na arte. */
export const audienceHook = (a: BrandAudience): string => audienceHooks(a)[0];

/**
 * TODAS as aberturas disponíveis para o público, sem repetição: o gancho
 * principal primeiro, depois as variações. O motor criativo usa a lista para
 * alternar a chamada entre headlines, tipografias, listas e fechos.
 */
export const audienceHooks = (a: BrandAudience): string[] => {
  const list: string[] = [];
  const push = (value?: string) => {
    const clean = value?.trim().replace(/\s*[.!?]+$/, "");
    if (clean && !list.some((h) => h.toLowerCase() === clean.toLowerCase())) list.push(clean);
  };
  push(a.hook);
  for (const extra of a.hooks ?? []) push(extra);
  if (!list.length) push(`Você, ${audienceKeyword(a).toLowerCase()}`);
  return list;
};

/** Escolhe uma variação de gancho de forma estável (mesmo índice = mesmo texto). */
export const pickHook = (a: BrandAudience, index: number): string => {
  const list = audienceHooks(a);
  return list[((index % list.length) + list.length) % list.length];
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
        keyword: String(row.keyword ?? "").trim() || undefined,
        hook: String(row.hook ?? "").trim() || undefined,
        hooks: asStringArray(row.hooks),
        parentId: String(row.parentId ?? row.parent_id ?? "").trim() || undefined,
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
      ...(a.keyword?.trim() ? { keyword: a.keyword.trim() } : {}),
      ...(a.hook?.trim() ? { hook: a.hook.trim() } : {}),
      ...(a.hooks?.length ? { hooks: a.hooks.map((h) => h.trim()).filter(Boolean) } : {}),
      ...(a.parentId?.trim() ? { parentId: a.parentId.trim() } : {}),
    }));

/**
 * Públicos MATRIZ: os que definem o produto e são a única base da métrica
 * oficial ("4 públicos"). Sub-nichos são recortes de comunicação e ficam fora.
 */
export const matrixAudiences = (list: BrandAudience[]): BrandAudience[] =>
  list.filter((a) => {
    const parent = a.parentId?.trim();
    return !parent || parent === a.id || !list.some((p) => p.id === parent);
  });

/** Sub-nichos derivados de um público matriz. */
export const derivedAudiences = (list: BrandAudience[], parentId: string): BrandAudience[] =>
  list.filter((a) => a.parentId?.trim() === parentId && a.id !== parentId);

/** Número oficial de públicos da marca — sempre só os matriz. */
export const officialAudienceCount = (list: BrandAudience[]): number => matrixAudiences(list).length;

/** Cadeia de ancestrais de um público (do pai direto até o matriz). */
export const audienceAncestors = (list: BrandAudience[], id: string): BrandAudience[] => {
  const chain: BrandAudience[] = [];
  const seen = new Set<string>([id]);
  let current = list.find((a) => a.id === id);
  while (current?.parentId && !seen.has(current.parentId)) {
    const parent = list.find((a) => a.id === current!.parentId);
    if (!parent) break;
    seen.add(parent.id);
    chain.push(parent);
    current = parent;
  }
  return chain;
};

/**
 * Resolve um público para uso no motor criativo: sub-nichos herdam dores,
 * desejos, soluções e CTA do público matriz quando o próprio campo está vazio.
 * Assim ativar "Pós-operatório" nunca produz arte genérica por falta de campo.
 */
export const resolveAudience = (list: BrandAudience[], id: string): BrandAudience | null => {
  const own = list.find((a) => a.id === id);
  if (!own) return null;
  const chain = audienceAncestors(list, id);
  if (!chain.length) return own;
  const inherit = (key: "pains" | "desires" | "proof") => {
    const merged = [...(own[key] ?? [])];
    for (const parent of chain) for (const item of parent[key] ?? []) if (!merged.includes(item)) merged.push(item);
    return merged.length ? merged : undefined;
  };
  // Ganchos do pai só entram quando o sub-nicho não tem nenhum próprio —
  // comunicação dirigida nunca deve virar a chamada genérica do público matriz.
  const ownHooks = [own.hook?.trim(), ...(own.hooks ?? [])].filter(Boolean) as string[];
  const inheritedHooks = ownHooks.length ? undefined : chain.flatMap((p) => [p.hook?.trim(), ...(p.hooks ?? [])].filter(Boolean) as string[]);
  return {
    ...own,
    pains: inherit("pains"),
    desires: inherit("desires"),
    proof: inherit("proof"),
    hook: own.hook?.trim() || inheritedHooks?.[0],
    hooks: ownHooks.length ? own.hooks : inheritedHooks?.slice(1),
    cta: own.cta?.trim() || chain.find((p) => p.cta?.trim())?.cta,
    description: own.description?.trim() || chain.find((p) => p.description?.trim())?.description,
  };
};

export type Segment = { id: string; label: string };

/**
 * Abas de segmento de uma marca: sempre começa pelo global 360° e depois lista
 * os nichos cadastrados. Marcas sem nicho ficam só com o 360°.
 */
export const buildSegments = (audiences: BrandAudience[]): Segment[] => [
  { id: GLOBAL_SEGMENT, label: "Visão 360°" },
  ...audiences.map((a) => ({ id: a.id, label: a.label })),
];

/* ------------------------------------------------------------------------- */
/* SUB-NICHO "SLOGAN EM DESTAQUE" (automático em toda marca)                  */
/* ------------------------------------------------------------------------- */

/**
 * Id do sub-nicho de slogan. Ele NÃO é salvo no kit: é derivado do campo
 * `slogan` da marca a cada carregamento. Sem slogan preenchido, o sub-nicho
 * simplesmente não existe (fica inativo para a marca e para qualquer usuário).
 */
export const SLOGAN_SEGMENT = "slogan-destaque";

/** O slogan está preenchido de forma utilizável? */
export const hasSlogan = (slogan?: string | null): boolean => (slogan ?? "").trim().length >= 3;

/**
 * Constrói o sub-nicho de slogan da marca. É um recorte de comunicação (nunca
 * conta na métrica oficial de públicos): a arte existe para colocar a frase da
 * marca em destaque, com o público matriz como pai quando houver algum.
 */
export const sloganAudience = (slogan?: string | null, audiences: BrandAudience[] = []): BrandAudience | null => {
  const phrase = (slogan ?? "").trim().replace(/\s*[.;]+$/, "");
  if (!hasSlogan(phrase)) return null;
  const parent = matrixAudiences(audiences)[0];
  return {
    id: SLOGAN_SEGMENT,
    label: "Slogan em destaque",
    keyword: phrase,
    hook: phrase,
    hooks: [phrase],
    description: `Arte de assinatura da marca: o slogan "${phrase}" ocupa o centro da peça, com o mínimo de texto em volta.`,
    cta: parent?.cta,
    ...(parent ? { parentId: parent.id } : {}),
  };
};

/**
 * Lista de públicos pronta para o motor: os salvos no kit + o sub-nicho de
 * slogan quando a marca tem slogan. Usar sempre esta função no editor de artes.
 */
export const audiencesWithSlogan = (audiences: BrandAudience[], slogan?: string | null): BrandAudience[] => {
  const extra = sloganAudience(slogan, audiences);
  return extra ? [...audiences, extra] : audiences;
};


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
    keyword: "Recém-formado",
    hook: "Você, recém-formado, atendendo os primeiros pacientes",
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
    parentId: "academico",
  },
  {
    id: "paciente-dor-cronica",
    keyword: "Dor crônica",
    hook: "Você que convive com dor crônica há meses",
    label: "Paciente com dor crônica",
    description:
      "Sub-nicho de Paciente: convive com dor há meses ou anos, já passou por vários profissionais e desconfia de promessa fácil.",
    pains: [
      "A dor sempre volta no mesmo lugar",
      "Exame de imagem que não explica o sintoma",
      "Ouviu que é só desgaste e que vai conviver com isso",
      "Medo de piorar se se mexer",
    ],
    desires: ["Entender a causa em linguagem simples", "Voltar à rotina sem depender de remédio", "Ver a melhora em números"],
    proof: [
      "Avaliação guiada com mapa e mecanismo de dor",
      "Hipótese explicada passo a passo, sem nome difícil",
      "Plano de exercícios com progressão e vídeo",
      "Diário de dor para ver a evolução dia a dia",
    ],
    cta: "Fazer minha avaliação",
    parentId: "paciente",
  },
  {
    id: "paciente-pos-operatorio",
    keyword: "Pós-operatório",
    hook: "Você que acabou de operar",
    label: "Paciente pós-operatório",
    description: "Sub-nicho de Paciente: acabou de operar e precisa de condução segura fase a fase.",
    pains: ["Insegurança sobre o que pode ou não fazer", "Orientação genérica na alta hospitalar", "Medo de forçar e perder a cirurgia"],
    desires: ["Recuperar movimento no tempo certo", "Saber exatamente o que fazer em casa hoje"],
    proof: [
      "Plano por fases, com critério para avançar",
      "Triagem de sinais de alerta em cada etapa",
      "Relatório em PDF para levar ao cirurgião",
    ],
    cta: "Quero um plano seguro",
    parentId: "paciente",
  },
  {
    id: "paciente-atleta-amador",
    keyword: "Esportista",
    hook: "Você que treina e não quer parar",
    label: "Praticante de esporte",
    description: "Sub-nicho de Paciente: corre, pedala ou treina força e quer voltar ao esporte sem recair na lesão.",
    pains: ["Parar de treinar por causa da lesão", "Voltar cedo demais e recair", "Alta sem critério objetivo"],
    desires: ["Voltar ao esporte com segurança", "Treinar sem dor e sem medo"],
    proof: ["Leitura de dor, inibição, fraqueza e incapacidade (D.I.F.I)", "Plano com progressão de carga documentada", "Reavaliação com critério de retorno"],
    cta: "Quero voltar a treinar",
    parentId: "paciente",
  },
  {
    id: "paciente-60-mais",
    keyword: "Geração 60+",
    hook: "Você da geração 60+",
    label: "Paciente 60+",
    description: "Sub-nicho de Paciente: sente perda de força e equilíbrio e teme depender de alguém.",
    pains: ["Medo de cair", "Aceitar que dor é coisa da idade", "Exercício que parece arriscado demais"],
    desires: ["Manter autonomia em casa", "Andar e subir escada com confiança"],
    proof: [
      "Triagem de segurança e saúde geral antes de qualquer plano",
      "Exercícios de estabilidade com pé no solo firme, sem superfície instável",
      "Acompanhamento simples entre as sessões",
    ],
    cta: "Cuidar do meu movimento",
    parentId: "paciente",
  },
];


/** IDs oficiais — usados para impedir que a IA crie nichos duplicados. */
export const ALIVIA_AUDIENCE_IDS = ALIVIA_AUDIENCES.map((a) => a.id);
