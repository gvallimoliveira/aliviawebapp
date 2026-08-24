import type { WorldContent } from "./types";
import stepPainMap from "@/assets/step-painmap.jpg";
import stepAnamnesis from "@/assets/step-anamnesis.jpg";
import stepTests from "@/assets/step-tests.jpg";
import stepTreatment from "@/assets/step-treatment.jpg";
import stepReport from "@/assets/step-report.jpg";
import stepDiagnosis from "@/assets/step-diagnosis.jpg";

const professional: WorldContent = {
  id: "pro",
  label: "Profissional",
  kickers: [
    "RACIOCÍNIO CLÍNICO",
    "PARA FISIOTERAPEUTAS",
    "CLÍNICA COM MÉTODO",
    "EVIDÊNCIA NA MÃO",
    "PRONTUÁRIO QUE PENSA",
    "DOCUMENTAÇÃO SEM DOR",
    "MENOS TECLADO, MAIS CLÍNICA",
    "PADRÃO PERICIAL",
  ],

  headlines: [
    {
      strong: "Você não estudou fisioterapia para preencher formulários.",
      rest: "O Aliv.iA coleta, organiza e estrutura o caso para você fazer o que só você faz: raciocinar, decidir e tratar.",
    },
    {
      strong: "Do primeiro contato à alta, tudo em um raciocínio.",
      rest: "Anamnese, mapa de dor, testes funcionais, questionários validados e plano de tratamento em uma linha só.",
    },
    {
      strong: "A avaliação chega pronta antes do paciente entrar.",
      rest: "Link enviado, respostas estruturadas, hipóteses e testes sugeridos esperando sua validação.",
    },
    {
      strong: "Prontuário que pensa junto com você.",
      rest: "Evolução, dinamometria, amplitude e questionários lidos em conjunto — não como planilhas soltas.",
    },
    {
      strong: "Sua hipótese continua sendo sua.",
      rest: "A IA propõe, organiza e justifica. Você sobrescreve com uma linha e isso vale no prontuário, no PDF e no relatório.",
    },
  ],
  subs: [
    "Sistema de raciocínio clínico com alma de fisioterapeuta.",
    "Menos digitação, mais decisão clínica.",
    "O tempo que você gasta transcrevendo volta para o atendimento.",
    "Documentação de nível pericial, sem esforço de secretaria.",
  ],
  kinetic: [
    { kicker: "EM MENOS TEMPO", word: "Com mais resultados", caption: "A avaliação estruturada antes da primeira sessão." },
    { kicker: "O QUE MUDA", word: "Clareza", caption: "Do relato confuso à hipótese defensável." },
    { kicker: "SEU DIFERENCIAL", word: "Método", caption: "STEPS e D.I.F.I guiando cada decisão." },
    { kicker: "NA PRÁTICA", word: "Autoridade", caption: "Relatórios que o paciente mostra para o médico." },
  ],
  metrics: [
    [
      { value: 12, suffix: " min", label: "economizados por avaliação" },
      { value: 40, suffix: "+", label: "testes funcionais mapeados" },
      { value: 4, label: "camadas de raciocínio clínico" },
    ],
    [
      { value: 100, suffix: "%", label: "dos casos com triagem de red flags" },
      { value: 6, label: "fases do método STEPS" },
      { value: 3, label: "níveis de dificuldade no HEP" },
    ],
    [
      { value: 1, suffix: " link", label: "e o paciente já respondeu" },
      { value: 15, suffix: "+", label: "questionários validados" },
      { value: 24, suffix: "h", label: "de prontuário sempre acessível" },
    ],
  ],
  compare: [
    {
      title: "O antes e o depois do seu atendimento",
      before: [
        "Anamnese digitada durante a sessão",
        "Testes escolhidos de memória",
        "Evolução em caderno ou bloco de notas",
        "Relatório improvisado quando pedem",
      ],
      after: [
        "Paciente responde antes de chegar",
        "Testes sugeridos por região e suspeita",
        "Evolução com pré-preenchimento inteligente",
        "PDF clínico pronto em um clique",
      ],
    },
    {
      title: "Duas formas de fechar uma hipótese",
      before: [
        "Impressão baseada só na queixa",
        "Diferenciais ficando na cabeça",
        "Dinamometria olhada teste a teste",
      ],
      after: [
        "Hipótese com confiança declarada",
        "Diagnósticos diferenciais listados e justificados",
        "Assimetria calculada e sinalizada",
      ],
    },
  ],
  journeys: [
    {
      kicker: "COMO FUNCIONA",
      heading: "Quatro passos até a conduta",
      steps: [
        { title: "Mapa de dor", description: "O paciente marca a região e o padrão. Você recebe topografia e extensão.", image: stepPainMap },
        { title: "Anamnese estruturada", description: "História, saúde geral, medicação contínua e red flags em campos comparáveis.", image: stepAnamnesis },
        { title: "Testes sugeridos", description: "Clusters validados aparecem conforme a suspeita — Laslett, neurodinâmica, ombro.", image: stepTests },
        { title: "Plano de tratamento", description: "Progressão por fases, HEP com vídeos e reavaliação programada.", image: stepTreatment },
      ],
    },
    {
      kicker: "DOCUMENTAÇÃO",
      heading: "Do dado bruto ao relatório assinado",
      steps: [
        { title: "Coleta", description: "Link enviado por WhatsApp, resposta salva mesmo se o paciente parar no meio.", image: stepAnamnesis },
        { title: "Raciocínio", description: "Hipótese, mecanismo de dor e diferenciais organizados para sua validação.", image: stepDiagnosis },
        { title: "Relatório", description: "PDF com sua marca, seu nome e a hipótese final que você definiu.", image: stepReport },
      ],
    },
  ],
  features: [
    { tag: "AGENTE CLÍNICO", title: "Discussão de caso a qualquer hora", description: "Um agente treinado em evidência que discute conduta, gera HEP e cita a fonte.", image: stepDiagnosis },
    { tag: "MECANISMO DE DOR", title: "Nociceptiva, neuropática ou nociplástica", description: "Triagem baseada em Kosek e Finnerup, com implicação direta na conduta.", image: stepPainMap },
    { tag: "HEP", title: "Programa domiciliar com vídeo", description: "Exercícios em pirâmide de dificuldade, respeitando restrições posicionais.", image: stepTreatment },
    { tag: "REAVALIAÇÃO EXPRESSA", title: "Comparar sem recomeçar", description: "Pré-preenche o que já sabemos e destaca o que mudou desde a última visita.", image: stepReport },
    { tag: "DINAMOMETRIA", title: "Assimetria calculada por você não precisar", description: "Upload do laudo externo, extração dos valores e semáforo de risco.", image: stepTests },
  ],
  quotes: [
    '"O Aliv.iA não compete com o fisioterapeuta — nós o complementamos."',
    '"A tecnologia devolve o tempo. O raciocínio continua sendo humano."',
    '"Documentar bem é proteger o paciente e proteger você."',
    '"Sistema de raciocínio clínico com alma de fisioterapeuta."',
  ],
  marquee: [
    ["Raciocínio clínico", "Red flags", "STEPS", "D.I.F.I", "Evidência PEDro ≥ 7"],
    ["Mapa de dor", "Dinamometria", "Questionários validados", "HEP em vídeo", "Prontuário vivo"],
    ["Laslett", "McKenzie", "HSR", "Neurodinâmica", "Controle motor"],
  ],
  closings: [
    { title: "Sua clínica com raciocínio de ponta", sub: "Teste o painel profissional sem cadastro.", cta: "Ver o Aliv.iA Profissional" },
    { title: "Comece pelo próximo paciente", sub: "Envie um link e veja a avaliação chegar estruturada.", cta: "Quero experimentar" },
  ],
};

export default professional;
