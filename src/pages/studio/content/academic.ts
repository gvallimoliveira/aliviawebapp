import type { WorldContent } from "./types";
import { defaultCarousels, defaultLists, defaultStats, defaultStories, defaultTriptychs, defaultTypos } from "./defaults";

/**
 * Copy do mundo Acadêmico.
 * REGRA: cada item declara `topic`; imagem só vem do tópico (nunca genérica).
 * REGRA DE VERDADE: nunca afirmar "sem paciente real" — o estudante usa o fluxo
 * com pacientes reais (estágio, familiares), sempre com conduta final do supervisor.
 */
const academic: WorldContent = {
  id: "academico",
  label: "Acadêmico",
  kickers: ["ALIV.IA ACADÊMICO", "PARA ESTUDANTES", "TREINO DE RACIOCÍNIO", "DA TEORIA À CONDUTA", "ANTES DO ESTÁGIO", "PREÇO DE ESTUDANTE", "CASO REAL, COM SUPERVISÃO"],
  headlines: [
    { strong: "A faculdade ensina o conteúdo. O raciocínio se treina.", rest: "Casos reais, testes validados e feedback estruturado enquanto você ainda está na graduação." },
    { strong: "Chegue no estágio sabendo por onde começar.", rest: "Avaliação, hipótese, diferenciais e conduta em um fluxo que você repete até virar natural." },
    { strong: "Estudar caso é diferente de estudar matéria.", rest: "Trilhas guiadas que partem da queixa e terminam em uma decisão defensável." },
    { strong: "Treine no simulado, aplique no estágio.", rest: "O mesmo fluxo padrão-ouro para casos fictícios e para pacientes reais, sempre com supervisão." },
    { strong: "Argumento clínico se constrói, não se improvisa.", rest: "Cada conduta com justificativa: por que este teste, por que esta dose, por que agora." },
    { strong: "Decorar teste especial não é saber quando aplicar.", rest: "Aqui você escolhe o cluster e discute com o mentor o que a sua escolha revela." },
    { strong: "Seu seminário agradece.", rest: "Raciocínio organizado do início ao fim, pronto para apresentar e defender." },
    { strong: "O estagiário que raciocina é o que é convidado a ficar.", rest: "Treine o fluxo completo antes de estar diante do paciente real." },
    { strong: "Interpretar escore é habilidade clínica, não conta de matemática.", rest: "ODI, HOOS, FABQ e outros com ponto de corte e significado explicados caso a caso." },
    { strong: "Turma que decora responde prova. Turma que raciocina atende.", rest: "Um método comum para discutir caso em aula e padronizar a avaliação no estágio." },
    { strong: "Dá para ver quem está evoluindo antes da nota final.", rest: "Progresso individual por trilha, com os pontos em que a turma trava." },
  ],
  subs: [
    "O treino de raciocínio clínico que falta na graduação.",
    "Você treina com IA especializada em fisioterapia, não com IA genérica.",
    "Plano acadêmico com preço de estudante.",
    "Você aprende a decidir, não a decorar.",
    "Do primeiro semestre ao primeiro estágio.",
    "Do caso simulado ao paciente do estágio.",
    "Repetição deliberada, do jeito que forma clínico.",
  ],
  kinetic: [
    { kicker: "O QUE SE TREINA", word: "Raciocínio", caption: "Da queixa à hipótese, com justificativa.", topic: "hypothesis" },
    { kicker: "NO ESTÁGIO", word: "Confiança", caption: "Você já conduziu esse fluxo antes — dezenas de vezes.", topic: "academic-tracks" },
    { kicker: "SEM ATALHO", word: "Método", caption: "STEPS ordena seis fases; D.I.F.I conecta dor, inibição, fraqueza e incapacidade.", topic: "steps-method" },
    { kicker: "SEMPRE", word: "Evidência", caption: "Cada conduta com fonte rastreável.", topic: "evidence-library" },
    { kicker: "NA BANCA", word: "Repertório", caption: "Argumento com autor, ano e escore.", topic: "evidence-library" },
    { kicker: "NO ESTÁGIO", word: "Prontidão", caption: "Você sabe o próximo passo sem travar.", topic: "anamnesis" },
    { kicker: "NO TREINO", word: "Repetição", caption: "Ambiente simulado para errar antes de acertar.", topic: "simulated-env" },
    { kicker: "NA DÚVIDA", word: "Diferenciais", caption: "O que mais explicaria esse quadro?", topic: "differential" },
  ],

  stats: defaultStats,
  triptychs: defaultTriptychs,
  typos: defaultTypos,
  stories: defaultStories,
  lists: defaultLists,
  carousels: defaultCarousels,
  metrics: [
    [
      { value: 6, label: "fases STEPS: dor, reparo, mobilidade, força, função e retorno" },
      { value: 4, label: "eixos D.I.F.I: dor, inibição, fraqueza e incapacidade" },
      { value: 100, suffix: "%", label: "das trilhas com caso real" },
    ],
    [
      { value: 15, suffix: "+", label: "questionários validados para estudar" },
      { value: 40, suffix: "+", label: "testes funcionais com técnica descrita" },
      { value: 1, suffix: " fluxo", label: "igual no simulado e no paciente real" },
    ],
    [
      { value: 6, label: "fases STEPS para progredir sem pular critérios" },
      { value: 4, label: "eixos D.I.F.I conectando dor, recrutamento, força e função" },
      { value: 1, suffix: " prontuário", label: "por paciente do estágio ou da família" },
    ],
    [
      { value: 3, label: "mecanismos de dor para diferenciar" },
      { value: 2, label: "escores de corte do FABQ-Brasil" },
      { value: 1, suffix: " agente", label: "para discutir caso na véspera da prova" },
    ],
  ],
  compare: [
    {
      title: "Duas formas de se preparar",
      topics: ["academic-tracks", "functional-tests", "anamnesis", "evidence-library"],
      before: ["Resumo de PDF na véspera", "Teste especial visto só no vídeo", "Chegar no estágio sem fluxo", "Conduta copiada do colega"],
      after: ["Caso clínico completo do início ao fim", "Cluster validado com critério de positividade", "Fluxo de avaliação decorado pela prática", "Conduta com evidência citável"],
    },
    {
      title: "Dois tipos de estudante no estágio",
      topics: ["anamnesis", "functional-tests", "evidence-library"],
      before: ["Trava na primeira pergunta do preceptor", "Escolhe teste por palpite", "Não sabe justificar a conduta"],
      after: ["Conduz a anamnese com roteiro próprio", "Escolhe cluster com critério de positividade", "Cita autor e escore da recomendação"],
    },
    {
      title: "Duas formas de documentar um caso",
      topics: ["report", "questionnaires", "pain-diary"],
      before: ["Relato solto no caderno", "Escore anotado sem interpretação", "Evolução sem registro comparável"],
      after: ["Relatório estruturado para o preceptor", "Escore com ponto de corte e significado", "Evolução com diário de dor e comparação"],
    },
  ],

  journeys: [
    {
      kicker: "TRILHAS",
      heading: "Como um caso é estudado aqui",
      steps: [
        { title: "Caso apresentado", description: "Queixa, história e contexto — como chega no consultório.", topic: "anamnesis" },
        { title: "Escolha dos testes", description: "Você seleciona, o sistema mostra o que a evidência recomenda.", topic: "functional-tests" },
        { title: "Hipótese e diferenciais", description: "Declare a confiança e justifique. O sistema confronta.", topic: "hypothesis" },
        { title: "Conduta e relatório", description: "Plano por fases e documento estruturado do seu raciocínio.", topic: "report" },
      ],
    },
    {
      kicker: "DO TREINO AO ESTÁGIO",
      heading: "Duas frentes, um método",
      steps: [
        { title: "Ambiente simulado", description: "Casos fictícios para repetir o fluxo sem pressa.", topic: "simulated-env" },
        { title: "Paciente do estágio", description: "Mesmo fluxo, prontuário real, conduta final do supervisor.", topic: "academic-tracks" },
        { title: "Evidência citável", description: "Fontes com PEDro ≥ 7 e PMID para levar à discussão.", topic: "evidence-library" },
        { title: "Acompanhamento", description: "Diário de dor e comparação semana a semana no mesmo caso.", topic: "pain-diary" },
      ],
    },
  ],
  features: [
    { tag: "HIPÓTESE DIAGNÓSTICA", title: "Hipótese com nível de confiança e justificativa", description: "Você declara o raciocínio; o sistema confronta com resumo, mecanismo e diferenciais.", topic: "hypothesis" },
    { tag: "ANAMNESE GUIADA", title: "Roteiro de perguntas que você repete até virar seu", description: "Queixa principal, história, saúde geral e red flags em campos comparáveis.", topic: "anamnesis" },
    { tag: "TESTES FUNCIONAIS", title: "Cluster certo, no momento certo", description: "Técnica descrita e critério de positividade — Laslett, neurodinâmica, ombro.", topic: "functional-tests" },
    { tag: "QUESTIONÁRIOS", title: "Aprenda a interpretar escores", description: "ODI, HOOS, FABQ e outros com ponto de corte e significado clínico.", topic: "questionnaires" },
    { tag: "MAPA DE DOR", title: "Topografia da dor marcada no corpo", description: "Marcação corporal que alimenta a leitura clínica do caso.", topic: "pain-map" },
    { tag: "CONDUTA POR FASES", title: "Do diagnóstico ao plano de tratamento", description: "Progressão em fases com critérios objetivos para avançar.", topic: "treatment-plan" },
    { tag: "RELATÓRIO", title: "Documente como se fosse perícia", description: "PDF acadêmico do seu raciocínio para levar ao preceptor.", topic: "report" },
    { tag: "EVOLUÇÃO", title: "Acompanhe o caso do estágio semana a semana", description: "Diário de dor e comparação antes/depois no mesmo prontuário.", topic: "pain-diary" },
    { tag: "MECANISMO DE DOR", title: "Nociceptiva, neuropática ou nociplástica", description: "Critérios de Kosek e Finnerup aplicados ao caso que você está estudando.", topic: "pain-mechanism" },
    { tag: "DIFERENCIAIS", title: "Treine a pergunta que o preceptor vai fazer", description: "O que mais explicaria esse quadro, e por que você descartou.", topic: "differential" },
    { tag: "AGENTE CLÍNICO", title: "Discuta o caso na véspera da prova", description: "Um agente que questiona sua conduta e mostra a fonte.", topic: "clinical-agent" },
    { tag: "SIMULADO", title: "Erre no treino, não no paciente", description: "Ambiente simulado para repetir o fluxo quantas vezes precisar.", topic: "simulated-env" },
    { tag: "EVIDÊNCIA", title: "PEDro ≥ 7 com PMID para citar", description: "Biblioteca validada contra PubMed e Crossref, pronta para o TCC.", topic: "evidence-library" },
    { tag: "STEPS", title: "Seis degraus que organizam a progressão", description: "Dor e inflamação, reparo, mobilidade, força, função e retorno — sem avançar sem critério.", topic: "steps-method" },
    { tag: "D.I.F.I", title: "Dor, inibição, fraqueza e incapacidade", description: "Quatro eixos conectados: um pode alimentar o seguinte e indicar onde a conduta precisa agir.", topic: "difi" },
    { tag: "RED FLAGS", title: "Aprenda a reconhecer o que não é fisioterapia", description: "Triagem de sinais de alerta em toda avaliação, sem exceção.", topic: "red-flags" },
    { tag: "SAÚDE GERAL", title: "Comorbidade muda a conduta", description: "Hipertensão, diabetes, cardiopatia e medicação contínua no raciocínio.", topic: "health-general" },
    { tag: "FABQ-BRASIL", title: "Medo-evitação com escore e corte", description: "Aprenda a interpretar crenças de medo-evitação sem rotular o paciente.", topic: "fabq" },
    { tag: "DINAMOMETRIA", title: "Força medida e comparada entre lados", description: "Leitura de assimetria com critério objetivo de risco.", topic: "dynamometry" },
    { tag: "ALTA", title: "Relatório de evolução comparativa", description: "Como demonstrar resultado do início ao fim do acompanhamento.", topic: "discharge-report" },
    { tag: "IMPRESSÃO CLÍNICA", title: "A síntese que o preceptor cobra de você", description: "Leitura longitudinal do caso considerando testes extras e observações de cada sessão.", topic: "clinical-impression" },

  ],
  quotes: [
    { text: '"O diagnóstico não é um chute com nome bonito."', topic: "hypothesis" },
    { text: '"Quem treina raciocínio chega no estágio com repertório."', topic: "academic-tracks" },
    { text: '"Evidência sem aplicação é decoração de slide."', topic: "evidence-library" },
    { text: '"Repetição deliberada forma clínico. Véspera de prova forma nota."', topic: "simulated-env" },
    { text: '"Você vai ser lembrado pelas perguntas que soube fazer."', topic: "anamnesis" },
    { text: '"Saber descartar vale tanto quanto saber nomear."', topic: "differential" },
    { text: '"Protocolo não engessa. Engessa é não saber por que você fez."', topic: "steps-method" },
    { text: '"O paciente não é um caso de prova — mas a prova cobra o caso do paciente."', topic: "academic-tracks" },
    { text: '"Estudar dor sem classificar o mecanismo é estudar geografia sem mapa."', topic: "pain-mechanism" },
  ],
  marquee: [
    ["Trilhas clínicas", "Casos comentados", "PEDro ≥ 7", "Ambiente simulado", "Testes validados"],
    ["Raciocínio clínico", "Red flags", "Questionários", "Mecanismo de dor", "Conduta baseada em evidência"],
    ["Laslett", "McKenzie", "Neurodinâmica", "FABQ-Brasil", "Oswestry"],
    ["Diferenciais", "STEPS: dor ao retorno", "D.I.F.I: dor à função", "Dinamometria", "Relatório para o preceptor"],
  ],
  closings: [
    { title: "Treine e aplique no estágio", sub: "Plano acadêmico com o fluxo completo de avaliação.", cta: "Ver o Aliv.iA Acadêmico" },
    { title: "Seu diferencial começa agora", sub: "Enquanto os outros decoram, você raciocina.", cta: "Quero estudar assim" },
    { title: "Chegue no estágio com repertório", sub: "Casos comentados e evidência citável.", cta: "Ativar acesso de estudante" },
  ],
  sales: {
    audience: "estudantes de fisioterapia e recém-formados",
    proofs: [
      "Fluxo completo para casos simulados e para pacientes reais do estágio ou da família",
      "Trilhas que vão da queixa até a conduta justificada",
      "Testes funcionais com técnica e critério de positividade",
      "Questionários validados com pontos de corte explicados",
      "Agente clínico para discutir caso na madrugada da prova",
      "Fontes com PEDro ≥ 7 e PMID para citar no TCC",
      "STEPS organiza dor, reparo, mobilidade, força, função e retorno; D.I.F.I conecta dor, inibição, fraqueza e incapacidade",
      "Relatórios modelo para aprender a documentar",
      "Triagem de mecanismo de dor com critérios de Kosek e Finnerup",
      "Diferenciais com critério de inclusão e exclusão por escrito",
    ],
    objections: [
      "Não é videoaula: você decide, o sistema confronta a sua escolha.",
      "Dá para usar com paciente real do estágio ou da família — a conduta final é sempre do supervisor com CREFITO.",
      "Funciona no celular, entre uma aula e outra.",
      "Acesso acadêmico com condição de estudante, mediante comprovação de matrícula.",
    ],
    offers: [
      "Plano acadêmico com condição de estudante, comprovando matrícula.",
      "Ambiente simulado para treinar e prontuário real para o estágio, com supervisão do preceptor.",
      "Comece pelo painel demonstrativo antes de ativar o acesso.",
    ],
    ctas: [
      "Link na bio para ativar seu acesso de estudante",
      "Comenta ESTÁGIO que eu te mando o link",
      "Marca aquele colega que entra em estágio agora",
      "Salva para treinar antes da próxima prova prática",
    ],
    hashtags: [
      "estudantedefisioterapia",
      "fisioterapia",
      "graduacaofisioterapia",
      "raciocinioclinico",
      "estagiofisioterapia",
      "fisioestudante",
      "provapratica",
      "tccfisioterapia",
      "evidenciacientifica",
      "aliviaapp",
      "anatomia",
      "reabilitacao",
    ],
  },
};


export default academic;
