import type { WorldContent } from "./types";
import stepAnamnesis from "@/assets/step-anamnesis.jpg";
import stepTests from "@/assets/step-tests.jpg";
import stepDiagnosis from "@/assets/step-diagnosis.jpg";
import stepQuestionnaires from "@/assets/step-questionnaires.jpg";
import stepReport from "@/assets/step-report.jpg";
import stepPainMap from "@/assets/step-painmap.jpg";
import stepTreatment from "@/assets/step-treatment.jpg";
import stepDiary from "@/assets/step-diary.jpg";


const academic: WorldContent = {
  id: "academico",
  label: "Acadêmico",
  kickers: ["ALIV.IA ACADÊMICO", "PARA ESTUDANTES", "TREINO DE RACIOCÍNIO", "DA TEORIA À CONDUTA", "ANTES DO ESTÁGIO", "PREÇO DE ESTUDANTE", "CASO REAL, RISCO ZERO"],
  headlines: [
    { strong: "A faculdade ensina o conteúdo. O raciocínio se treina.", rest: "Casos reais, testes validados e feedback estruturado enquanto você ainda está na graduação." },
    { strong: "Chegue no estágio sabendo por onde começar.", rest: "Avaliação, hipótese, diferenciais e conduta em um fluxo que você repete até virar natural." },
    { strong: "Estudar caso é diferente de estudar matéria.", rest: "Trilhas guiadas que partem da queixa e terminam em uma decisão defensável." },
    { strong: "Treine no simulado, aplique no estágio.", rest: "O mesmo fluxo padrão-ouro para casos fictícios e para pacientes reais, sempre com supervisão." },
    { strong: "Evidência que você consegue citar na banca.", rest: "Protocolos com escore PEDro alto, validados contra PubMed e Crossref." },
    { strong: "Decorar teste especial não é saber quando aplicar.", rest: "Aqui você escolhe o cluster e vê o que a evidência diria sobre a sua escolha." },
    { strong: "Seu TCC agradece.", rest: "Fontes rastreáveis, com PMID, para embasar trabalho, seminário e apresentação." },
    { strong: "O estagiário que raciocina é o que é convidado a ficar.", rest: "Treine o fluxo completo antes de estar diante do paciente real." },
  ],
  subs: [
    "O treino de raciocínio clínico que falta na graduação.",
    "Plano acadêmico com preço de estudante.",
    "Você aprende a decidir, não a decorar.",
    "Do primeiro semestre ao primeiro estágio.",
    "Do caso simulado ao paciente do estágio.",
    "Repetição deliberada, do jeito que forma clínico.",
  ],
  kinetic: [
    { kicker: "O QUE SE TREINA", word: "Raciocínio", caption: "Da queixa à hipótese, com justificativa." },
    { kicker: "NO ESTÁGIO", word: "Confiança", caption: "Você já conduziu esse fluxo antes — dezenas de vezes." },
    { kicker: "SEM ATALHO", word: "Método", caption: "STEPS e D.I.F.I aplicados caso a caso." },
    { kicker: "SEMPRE", word: "Evidência", caption: "Cada conduta com fonte rastreável." },
    { kicker: "NA BANCA", word: "Repertório", caption: "Argumento com autor, ano e escore." },
    { kicker: "NO ESTÁGIO", word: "Prontidão", caption: "Você sabe o próximo passo sem travar." },
  ],

  metrics: [
    [
      { value: 10, label: "nichos de pesquisa clínica" },
      { value: 7, suffix: "+", label: "escore PEDro mínimo das fontes" },
      { value: 100, suffix: "%", label: "das trilhas com caso real" },
    ],
    [
      { value: 15, suffix: "+", label: "questionários validados para estudar" },
      { value: 40, suffix: "+", label: "testes funcionais com técnica descrita" },
      { value: 1, suffix: " fluxo", label: "igual no simulado e no paciente real" },
    ],
    [
      { value: 6, label: "fases do método STEPS para treinar" },
      { value: 4, label: "eixos do D.I.F.I em cada caso" },
      { value: 1, suffix: " prontuário", label: "por paciente do estágio ou da família" },
    ],
  ],
  compare: [
    {
      title: "Duas formas de se preparar",
      before: ["Resumo de PDF na véspera", "Teste especial visto só no vídeo", "Chegar no estágio sem fluxo", "Conduta copiada do colega"],
      after: ["Caso clínico completo do início ao fim", "Cluster validado com critério de positividade", "Fluxo de avaliação decorado pela prática", "Conduta com evidência citável"],
    },
    {
      title: "Dois tipos de estudante no estágio",
      before: ["Trava na primeira pergunta do preceptor", "Escolhe teste por palpite", "Não sabe justificar a conduta"],
      after: ["Conduz a anamnese com roteiro próprio", "Escolhe cluster com critério de positividade", "Cita autor e escore da recomendação"],
    },
  ],

  journeys: [
    {
      kicker: "TRILHAS",
      heading: "Como um caso é estudado aqui",
      steps: [
        { title: "Caso apresentado", description: "Queixa, história e contexto — como chega no consultório.", image: stepAnamnesis },
        { title: "Escolha dos testes", description: "Você seleciona, o sistema mostra o que a evidência recomenda.", image: stepTests },
        { title: "Hipótese e diferenciais", description: "Declare a confiança e justifique. O sistema confronta.", image: stepDiagnosis },
        { title: "Conduta e relatório", description: "Plano por fases e documento estruturado do seu raciocínio.", image: stepReport },
      ],
    },
  ],
  features: [
    { tag: "HIPÓTESE DIAGNÓSTICA", title: "Hipótese com nível de confiança e justificativa", description: "Você declara o raciocínio; o sistema confronta com resumo, mecanismo e diferenciais.", image: stepDiagnosis },
    { tag: "ANAMNESE GUIADA", title: "Roteiro de perguntas que você repete até virar seu", description: "Queixa principal, história, saúde geral e red flags em campos comparáveis.", image: stepAnamnesis },
    { tag: "TESTES FUNCIONAIS", title: "Cluster certo, no momento certo", description: "Técnica descrita e critério de positividade — Laslett, neurodinâmica, ombro.", image: stepTests },
    { tag: "QUESTIONÁRIOS", title: "Aprenda a interpretar escores", description: "ODI, HOOS, FABQ e outros com ponto de corte e significado clínico.", image: stepQuestionnaires },
    { tag: "MAPA DE DOR", title: "Topografia e mecanismo da dor", description: "Marcação corporal ligada à triagem nociceptiva, neuropática e nociplástica.", image: stepPainMap },
    { tag: "CONDUTA POR FASES", title: "Do diagnóstico ao plano de tratamento", description: "Progressão em fases com critérios objetivos para avançar.", image: stepTreatment },
    { tag: "RELATÓRIO", title: "Documente como se fosse perícia", description: "PDF acadêmico do seu raciocínio para levar ao preceptor.", image: stepReport },
    { tag: "EVOLUÇÃO", title: "Acompanhe o caso do estágio semana a semana", description: "Diário de dor e comparação antes/depois no mesmo prontuário.", image: stepDiary },
  ],
  quotes: [
    '"O diagnóstico não é um chute com nome bonito."',
    '"Quem treina raciocínio chega no estágio com repertório."',
    '"Evidência sem aplicação é decoração de slide."',
    '"Repetição deliberada forma clínico. Véspera de prova forma nota."',
    '"Você vai ser lembrado pelas perguntas que soube fazer."',
  ],
  marquee: [
    ["Trilhas clínicas", "Casos comentados", "PEDro ≥ 7", "Ambiente simulado", "Testes validados"],
    ["Raciocínio clínico", "Red flags", "Questionários", "Mecanismo de dor", "Conduta baseada em evidência"],
    ["Laslett", "McKenzie", "Neurodinâmica", "FABQ-Brasil", "Oswestry"],
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
      "Treino do método STEPS e do D.I.F.I caso a caso",
      "Relatórios modelo para aprender a documentar",
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
