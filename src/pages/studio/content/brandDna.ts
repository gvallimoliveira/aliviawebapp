/**
 * ============================================================================
 * DNA DE MARCA DO ALIV.IA — fonte única de posicionamento para a redação.
 * ============================================================================
 *
 * Antes de escrever qualquer copy nova do Studio, consulte este arquivo. Ele
 * codifica o que a marca vende, para quem, contra qual dor — e os limites de
 * tom. Copy que contraria o DNA está errada, mesmo que soe bonita.
 *
 * Estratégia editorial aprovada (ago/2026):
 * - Objetivo: converter fisios Pro (inclui recém-formados) + atrair pacientes
 *   B2C + construir autoridade de marca.
 * - Tom: equilibrado com provocação leve — cutuca a rotina e a burocracia,
 *   nunca o colega nem o paciente.
 * - Provas: reais, sempre anonimizadas ("uma fisio do interior", nunca nomes).
 * - CTA: "link na bio" apontando para a landing do mundo do post.
 */
export const BRAND_DNA = {
  name: "Aliv.iA",
  slogan: "Sistema de raciocínio clínico com alma de fisioterapeuta.",
  /** O que a marca é, em uma frase — norte de todo manifesto. */
  essence:
    "Tecnologia que organiza o caso inteiro para o fisioterapeuta fazer o que só ele faz: raciocinar, decidir e tratar.",

  /**
   * DIFERENCIAL CENTRAL (aprovado ago/2026) — precisa aparecer em toda peça
   * institucional e em qualquer copy que fale de "IA". O Aliv.iA não usa IA
   * genérica de chat: o motor foi treinado e calibrado com competências,
   * raciocínio e critérios do fisioterapeuta.
   */
  differentiator: {
    claim: "IA especializada em fisioterapia — não é IA genérica.",
    why: [
      "Treinada com o raciocínio clínico do fisioterapeuta, não com respostas de internet",
      "Integra método próprio: STEPS organiza da dor ao retorno; D.I.F.I conecta dor, inibição, fraqueza e incapacidade; red flags protegem a triagem",
      "Cada hipótese vem com justificativa clínica, não com texto genérico",
      "Conhece testes, medidas e progressão de carga — vocabulário da profissão",
      "Construída por fisioterapeuta, revisada contra evidência aplicada ao caso",
    ],
    /** Como dizer isso na arte, sem soar propaganda de tecnologia. */
    lines: [
      "IA especializada em fisioterapia. Não é IA genérica.",
      "Uma IA que aprendeu a raciocinar como fisioterapeuta.",
      "Não é chatbot com jaleco: é raciocínio clínico estruturado.",
      "IA treinada com as competências de quem trata, não com achismo da internet.",
      "Método de fisioterapeuta dentro da tecnologia — não o contrário.",
    ],
    /** Limite: especialização nunca vira substituição do profissional. */
    rule: "Afirmar a especialização sem prometer autonomia: a IA é especialista em organizar e sugerir; a decisão continua do fisioterapeuta.",
  },


  /** O que se vende, para quem, contra qual dor — por mundo. */
  positioning: {
    pro: {
      sells: "Assinatura da plataforma de raciocínio clínico para o consultório.",
      audience: "Fisioterapeutas que atendem por conta própria e recém-formados entrando no mercado.",
      pains: [
        "Noites e fins de semana consumidos por prontuário e relatório",
        "Sensação de desvalorização: paciente compara preço, não método",
        "Medo silencioso de errar a conduta sem segunda opinião",
        "Paciente que abandona o plano por não entender o próprio caso",
      ],
      desires: [
        "Atender mais sem abrir mão do raciocínio",
        "Ser percebido (e pago) como profissional de método",
        "Documentação que protege juridicamente e impressiona o paciente",
      ],
      promise: "A papelada sai durante a sessão; a decisão clínica continua sua.",
    },
    academico: {
      sells: "Acesso acadêmico ao mesmo fluxo padrão-ouro dos profissionais.",
      audience: "Estudantes de fisioterapia e recém-formados.",
      pains: [
        "Insegurança no primeiro estágio: teoria decorada, raciocínio zerado",
        "Medo de travar na frente do preceptor ou do paciente",
        "Mercado competitivo sem diferencial concreto no currículo",
      ],
      desires: [
        "Chegar ao estágio com repertório de quem já conduziu dezenas de casos",
        "Aprender a decidir, não a decorar",
        "Ser o estagiário que é convidado a ficar",
      ],
      promise: "Repetição deliberada do fluxo completo até o raciocínio virar natural.",
    },
    paciente: {
      sells: "Avaliação guiada e acompanhamento da própria dor, direto do celular.",
      audience: "Pessoas convivendo com dor há semanas ou meses.",
      pains: [
        "Medo de aceitar o diagnóstico de 'é só desgaste'",
        "Confusão depois de pesquisar sintomas na internet",
        "Exercício errado mantendo (ou piorando) a dor",
      ],
      desires: [
        "Entender o que está acontecendo, em linguagem clara",
        "Saber qual é o próximo passo — e quando procurar um profissional",
        "Ver a própria evolução comprovada, não imaginada",
      ],
      promise: "Sua dor tem nome, causa e caminho — explicados sem termo técnico.",
    },
    clinica: {
      sells: "Padrão clínico e gestão para equipes multiprofissionais.",
      audience: "Donos e gestores de clínica de fisioterapia.",
      pains: [
        "Qualidade que depende de qual terapeuta atendeu",
        "Paciente recontando a história a cada troca de profissional",
        "Crescimento travado pela impossibilidade de padronizar a avaliação",
      ],
      desires: [
        "Escalar sem perder o padrão que construiu a reputação da casa",
        "Marca própria em cada documento entregue",
        "Gestão com números: adesão, evolução, satisfação",
      ],
      promise: "Toda a equipe avaliando pelo mesmo método, com a sua marca.",
    },
  },

  /**
   * Léxico da marca. `preferred` orienta a escrita; `forbidden` é testado
   * automaticamente contra toda headline/título (studio-coverage.test.ts).
   * Nunca prometer resultado, nunca dispensar o fisioterapeuta.
   */
  lexicon: {
    preferred: ["raciocínio", "sistema", "clareza", "plataforma", "método", "evidência", "conduta"],
    forbidden: [
      "milagre",
      "cura garantida",
      "resultado garantido",
      "nunca mais sinta dor",
      "sem dor para sempre",
      "dispensa fisioterapeuta",
      "dispensa o fisioterapeuta",
      "substitui o fisioterapeuta",
      "substitui fisioterapeuta",
    ],
  },

  /**
   * Limites da provocação leve (tom aprovado). O alvo é sempre a rotina, a
   * burocracia ou o achismo — jamais pessoas. E a automação é do esforço,
   * nunca do julgamento clínico ("a organização dos dados é nossa, a decisão é sua").
   */
  provocation: {
    targets: ["burocracia", "prontuário de madrugada", "protocolo de prateleira", "achismo", "palpite de internet"],
    neverTargets: ["colegas de profissão", "pacientes", "outros softwares pelo nome", "faculdades pelo nome"],
    rule: "Automatizar o esforço, nunca o julgamento. O Aliv.iA tira trabalho braçal — não decide pelo clínico.",
  },

  /** Frases institucionais para os lockups de marca (BrandBlock). */
  statements: [
    "Sistema de raciocínio clínico com alma de fisioterapeuta.",
    "Feito por fisioterapeuta, para a rotina real de quem trata.",
    "A organização dos dados é nossa. A decisão é sua.",
    "Menos teclado. Mais clínica.",
    "Evidência aplicada ao caso — não ao slide de congresso.",
    "Entender é o primeiro passo do tratamento.",
  ],
} as const;

/** Frases proibidas normalizadas para teste automatizado. */
export const FORBIDDEN_PHRASES: readonly string[] = BRAND_DNA.lexicon.forbidden;
