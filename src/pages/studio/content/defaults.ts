import type { WorldContent } from "./types";

/**
 * Blocos tipográficos e narrativos institucionais compartilhados entre os
 * mundos. O mundo profissional e o paciente têm repertório próprio (mais
 * palco); os demais herdam este conjunto até ganharem versões dedicadas.
 * Conteúdo institucional não declara tópico obrigatório, então não interfere
 * na dívida editorial.
 */
export const defaultTypos: WorldContent["typos"] = [
  { lead: "A organização dos dados é nossa.", big: "A decisão", tail: " é sua." },
  { lead: "Raciocínio clínico com", big: "alma", tail: " de fisioterapeuta." },
  { lead: "Menos teclado.", big: "Mais clínica", tail: "." },
  { lead: "O sistema sugere.", big: "Você", tail: " decide." },
];

export const defaultStats: WorldContent["stats"] = [
  {
    heading: "Números que sustentam o discurso",
    items: [
      { value: "100%", label: "dos casos com triagem de red flags", note: "segurança não é opcional" },
      { value: "4 eixos", label: "conectados pelo D.I.F.I", note: "dor pode inibir; inibição favorece fraqueza; fraqueza limita a função" },
      { value: "1 PDF", label: "resume o caso inteiro", note: "a história clínica não morre na memória" },
    ],
  },
  {
    heading: "O fim do retrabalho",
    items: [
      { value: "6 fases", label: "do método STEPS em cada caso", note: "dor e inflamação → reparo → mobilidade → força → função → retorno" },
      { value: "4 eixos", label: "conectados pelo D.I.F.I", note: "dor pode inibir; inibição favorece fraqueza; fraqueza limita a função" },
      { value: "24h", label: "de histórico sempre acessível", note: "o caso inteiro, não a última sessão" },
    ],
  },
];

export const defaultTriptychs: WorldContent["triptychs"] = [
  {
    heading: "Três palavras que mudam a rotina clínica",
    panels: [
      { word: "Avalie", line: "Com método, da história ao teste funcional.", topic: "anamnesis" },
      { word: "Decida", line: "Com evidência citada e confiança declarada.", topic: "evidence-library" },
      { word: "Documente", line: "Sem digitar a mesma coisa duas vezes.", topic: "report" },
    ],
  },
  {
    heading: "O ciclo que fecha sozinho",
    panels: [
      { word: "Suspeite", line: "Red flags em 100% das avaliações.", topic: "red-flags" },
      { word: "Teste", line: "O cluster certo aparece pela suspeita.", topic: "functional-tests" },
      { word: "Comprove", line: "Evolução medida, não lembrada.", topic: "questionnaires" },
    ],
  },
];

/**
 * Mini-casos institucionais anonimizados — prova real sem expor ninguém.
 * Estrutura: cena (beats) → virada (turn) → fecho (moral).
 */
export const defaultStories: WorldContent["stories"] = [
  {
    kicker: "CASO REAL, NOME PROTEGIDO",
    title: "Na primeira semana de estágio, ela já sabia por onde começar",
    beats: [
      "O preceptor perguntou o que ela faria primeiro.",
      "Os colegas chutaram um teste. Ela abriu a anamnese.",
      "Red flags, história e saúde geral — na ordem certa.",
    ],
    turn: "O fluxo já era dela. Só o jaleco era novo.",
    moral: "Repetição deliberada forma clínico antes do jaleco pesar.",
    topic: "academic-tracks",
  },
  {
    kicker: "EQUIPE REAL, NOME PROTEGIDO",
    title: "Três terapeutas, um padrão só",
    beats: [
      "A paciente chegou na terça com um terapeuta.",
      "Voltou na sexta com outro.",
      "Não precisou recontar nada.",
    ],
    turn: "O prontuário contou por ela.",
    moral: "Rotatividade de equipe não pode virar amnésia do paciente.",
    topic: "shared-record",
  },
  {
    kicker: "TODA SEMANA, EM ALGUM CONSULTÓRIO",
    title: "O caderno que virou história clínica",
    beats: [
      "Eram anos de evolução anotada à mão.",
      "Nada comparável, nada pesquisável.",
      "A primeira avaliação digital chegou por link.",
    ],
    turn: "O caso inteiro passou a caber em uma linha do tempo.",
    moral: "Documentar bem é proteger quem atende e quem é atendido.",
    topic: "report",
  },
];

/** Listas editoriais de valor puro — informativo sem tela de produto. */
export const defaultLists: WorldContent["lists"] = [
  {
    heading: "4 sinais de que um caso pede mais que protocolo",
    items: [
      "A dor não segue o padrão mecânico esperado",
      "Sinais de alerta aparecem na primeira triagem",
      "O medo do movimento pesa mais que a lesão",
      "Comorbidades mudam o risco do exercício",
    ],
    closing: "O Aliv.iA sinaliza os quatro antes da conduta.",
  },
  {
    heading: "3 respostas que um bom relatório dá sem ninguém perguntar",
    items: ["O que está acontecendo", "Por que está acontecendo", "O que vem depois"],
    closing: "É o que todo PDF do Aliv.iA entrega.",
  },
  {
    heading: "5 coisas que ganham outro peso quando são medidas",
    items: [
      "Força comparada entre os dois lados",
      "Amplitude de movimento",
      "Limitação em escore validado",
      "Curva de dor semana a semana",
      "O antes e o depois do tratamento",
    ],
    closing: "Quem mede não discute com impressão.",
  },
];

/**
 * Carrosséis institucionais — um por tamanho de miolo (2, 3 e 4 slides),
 * para o motor sempre encontrar um modelo do tamanho sorteado.
 */
export const defaultCarousels: WorldContent["carousels"] = [
  {
    id: "alivia-method-steps-difi",
    kicker: "O MÉTODO",
    title: "Duas siglas que organizam qualquer caso",
    coverSub: "STEPS e D.I.F.I — o esqueleto do raciocínio Aliv.iA. Arraste.",
    slides: [
      { heading: "STEPS: seis degraus", body: "Dor e inflamação → reparo → mobilidade → força → função → retorno. Cada avanço depende de critérios medidos, não só do tempo.", topic: "steps-method" },
      { heading: "D.I.F.I: quatro eixos", body: "Dor pode gerar inibição; menos recrutamento favorece fraqueza; menos força limita a função. Avaliar os quatro revela onde romper o ciclo.", topic: "difi" },
    ],
    cta: { title: "Conheça o método por dentro", sub: "Link na bio." },
  },
  {
    id: "alivia-flow-three-movements",
    kicker: "COMO FUNCIONA",
    title: "O fluxo Aliv.iA em três movimentos",
    coverSub: "Arraste para ver como um caso atravessa a plataforma.",
    slides: [
      { heading: "Avaliação estruturada", body: "O paciente responde por link: mapa de dor, história, saúde geral e sinais de alerta.", topic: "assessment-link" },
      { heading: "Raciocínio organizado", body: "Hipótese mais provável, mecanismo de dor e diferenciais prontos para validação.", topic: "hypothesis" },
      { heading: "Plano e relatório", body: "Tratamento por fases, exercícios em vídeo e PDF com a sua marca.", topic: "treatment-plan" },
    ],
    cta: { title: "Veja o fluxo com os seus casos", sub: "Link na bio." },
  },
  {
    id: "alivia-journey-arrival-discharge",
    kicker: "DA CHEGADA À ALTA",
    title: "O que acontece com um caso dentro do Aliv.iA",
    coverSub: "Quatro momentos, uma linha do tempo só. Arraste.",
    slides: [
      { heading: "1. O link chega antes", body: "A avaliação vem respondida antes da primeira sessão.", topic: "assessment-link" },
      { heading: "2. Os testes têm motivo", body: "Clusters sugeridos pela suspeita, com critério de positividade.", topic: "functional-tests" },
      { heading: "3. A evolução vira curva", body: "Diário de dor, questionários e medidas comparadas no tempo.", topic: "pain-diary" },
      { heading: "4. A alta vira documento", body: "Relatório comparativo do primeiro dia ao último atendimento.", topic: "discharge-report" },
    ],
    cta: { title: "Comece pelo próximo caso", sub: "Link na bio." },
  },
];
