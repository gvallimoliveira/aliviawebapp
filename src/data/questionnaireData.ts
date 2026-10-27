export interface QuestionOption {
  value: number;
  label_pt: string;
  label_en: string;
}

export interface QuestionnaireQuestion {
  id: string;
  subscale: string;
  text_pt: string;
  text_en: string;
  options: QuestionOption[];
}

export interface ScoreInterpretation {
  min: number;
  max: number;
  label_pt: string;
  label_en: string;
  severity: "minimal" | "mild" | "moderate" | "severe" | "extreme";
}

export interface QuestionnaireDefinition {
  id: string;
  name: string; // abbreviation e.g. "ODI"
  fullName_pt: string;
  fullName_en: string;
  description_pt: string;
  description_en: string;
  reference: string;
  regionMapping: string[];
  scoringDirection: "higher_worse" | "higher_better";
  subscaleLabels: Record<string, { pt: string; en: string }>;
  questions: QuestionnaireQuestion[];
  interpretation: ScoreInterpretation[];
}

export interface QuestionnaireResult {
  questionnaireId: string;
  questionnaireName: string;
  answers: Record<string, number>;
  subscaleScores: Record<string, number>;
  totalScore: number;
  maxScore: number;
  percentageScore: number;
  interpretation_pt: string;
  interpretation_en: string;
  severity: string;
  /** Preventive mode: only functional subscales collected; pain was NOT measured. */
  functionalOnly?: boolean;
  /** PSFS: activity typed by the patient for each rated item. */
  activityLabels?: Record<string, string>;
}

// === Shared option scales ===

const LIKERT_5_DIFFICULTY: QuestionOption[] = [
  { value: 0, label_pt: "Nenhuma", label_en: "None" },
  { value: 1, label_pt: "Pouca", label_en: "Mild" },
  { value: 2, label_pt: "Moderada", label_en: "Moderate" },
  { value: 3, label_pt: "Muita", label_en: "Severe" },
  { value: 4, label_pt: "Extrema", label_en: "Extreme" },
];

const LIKERT_5_FREQUENCY: QuestionOption[] = [
  { value: 0, label_pt: "Nunca", label_en: "Never" },
  { value: 1, label_pt: "Raramente", label_en: "Rarely" },
  { value: 2, label_pt: "Às vezes", label_en: "Sometimes" },
  { value: 3, label_pt: "Frequentemente", label_en: "Often" },
  { value: 4, label_pt: "Sempre", label_en: "Always" },
];

const LIKERT_5_FREQUENCY_PAIN: QuestionOption[] = [
  { value: 0, label_pt: "Nunca", label_en: "Never" },
  { value: 1, label_pt: "Mensalmente", label_en: "Monthly" },
  { value: 2, label_pt: "Semanalmente", label_en: "Weekly" },
  { value: 3, label_pt: "Diariamente", label_en: "Daily" },
  { value: 4, label_pt: "Sempre", label_en: "Always" },
];

const LIKERT_5_AWARENESS: QuestionOption[] = [
  { value: 0, label_pt: "Nunca", label_en: "Never" },
  { value: 1, label_pt: "Mensalmente", label_en: "Monthly" },
  { value: 2, label_pt: "Semanalmente", label_en: "Weekly" },
  { value: 3, label_pt: "Diariamente", label_en: "Daily" },
  { value: 4, label_pt: "Constantemente", label_en: "Constantly" },
];

const LIKERT_5_LIFESTYLE: QuestionOption[] = [
  { value: 0, label_pt: "De forma alguma", label_en: "Not at all" },
  { value: 1, label_pt: "Levemente", label_en: "Mildly" },
  { value: 2, label_pt: "Moderadamente", label_en: "Moderately" },
  { value: 3, label_pt: "Muito", label_en: "Severely" },
  { value: 4, label_pt: "Totalmente", label_en: "Totally" },
];

const LIKERT_5_CONFIDENCE: QuestionOption[] = [
  { value: 0, label_pt: "De forma alguma", label_en: "Not at all" },
  { value: 1, label_pt: "Levemente", label_en: "Mildly" },
  { value: 2, label_pt: "Moderadamente", label_en: "Moderately" },
  { value: 3, label_pt: "Muito", label_en: "Severely" },
  { value: 4, label_pt: "Extremamente", label_en: "Extremely" },
];

const LIKERT_5_ABILITY_REVERSED: QuestionOption[] = [
  { value: 0, label_pt: "Sempre", label_en: "Always" },
  { value: 1, label_pt: "Frequentemente", label_en: "Often" },
  { value: 2, label_pt: "Às vezes", label_en: "Sometimes" },
  { value: 3, label_pt: "Raramente", label_en: "Rarely" },
  { value: 4, label_pt: "Nunca", label_en: "Never" },
];

const SCALE_0_10: QuestionOption[] = Array.from({ length: 11 }, (_, i) => ({
  value: i,
  label_pt: String(i),
  label_en: String(i),
}));

// =============================================
// 1. ODI - Índice de Incapacidade de Oswestry
// =============================================

const odiQuestions: QuestionnaireQuestion[] = [
  {
    id: "odi_1",
    subscale: "pain_intensity",
    text_pt: "Intensidade da dor",
    text_en: "Pain Intensity",
    options: [
      { value: 0, label_pt: "Não sinto dor no momento", label_en: "I have no pain at the moment" },
      { value: 1, label_pt: "A dor é muito leve no momento", label_en: "The pain is very mild at the moment" },
      { value: 2, label_pt: "A dor é moderada no momento", label_en: "The pain is moderate at the moment" },
      { value: 3, label_pt: "A dor é razoavelmente forte no momento", label_en: "The pain is fairly severe at the moment" },
      { value: 4, label_pt: "A dor é muito forte no momento", label_en: "The pain is very severe at the moment" },
      { value: 5, label_pt: "A dor é a pior imaginável no momento", label_en: "The pain is the worst imaginable at the moment" },
    ],
  },
  {
    id: "odi_2",
    subscale: "personal_care",
    text_pt: "Cuidados pessoais (banho, vestir-se, etc.)",
    text_en: "Personal care (washing, dressing, etc.)",
    options: [
      { value: 0, label_pt: "Consigo me cuidar normalmente sem dor extra", label_en: "I can look after myself normally without causing extra pain" },
      { value: 1, label_pt: "Consigo me cuidar normalmente, mas sinto dor", label_en: "I can look after myself normally but it is very painful" },
      { value: 2, label_pt: "É doloroso me cuidar e sou lento e cuidadoso", label_en: "It is painful to look after myself and I am slow and careful" },
      { value: 3, label_pt: "Preciso de alguma ajuda, mas consigo fazer a maioria", label_en: "I need some help but manage most of my personal care" },
      { value: 4, label_pt: "Preciso de ajuda todos os dias na maioria dos cuidados", label_en: "I need help every day in most aspects of self-care" },
      { value: 5, label_pt: "Não consigo me vestir, tomo banho com dificuldade", label_en: "I do not get dressed, wash with difficulty and stay in bed" },
    ],
  },
  {
    id: "odi_3",
    subscale: "lifting",
    text_pt: "Levantar objetos",
    text_en: "Lifting",
    options: [
      { value: 0, label_pt: "Consigo levantar objetos pesados sem dor extra", label_en: "I can lift heavy weights without extra pain" },
      { value: 1, label_pt: "Consigo levantar objetos pesados, mas com dor extra", label_en: "I can lift heavy weights but it gives extra pain" },
      { value: 2, label_pt: "A dor me impede de levantar pesos do chão, mas consigo se estiverem bem posicionados", label_en: "Pain prevents me from lifting heavy weights off the floor but I can manage if conveniently positioned" },
      { value: 3, label_pt: "Consigo levantar apenas pesos leves a médios bem posicionados", label_en: "I can manage light to medium weights if conveniently positioned" },
      { value: 4, label_pt: "Consigo levantar apenas pesos muito leves", label_en: "I can lift only very light weights" },
      { value: 5, label_pt: "Não consigo levantar ou carregar nada", label_en: "I cannot lift or carry anything at all" },
    ],
  },
  {
    id: "odi_4",
    subscale: "walking",
    text_pt: "Caminhar",
    text_en: "Walking",
    options: [
      { value: 0, label_pt: "A dor não me impede de caminhar qualquer distância", label_en: "Pain does not prevent me walking any distance" },
      { value: 1, label_pt: "A dor me impede de caminhar mais de 1,5 km", label_en: "Pain prevents me walking more than one mile" },
      { value: 2, label_pt: "A dor me impede de caminhar mais de 400 m", label_en: "Pain prevents me walking more than a quarter of a mile" },
      { value: 3, label_pt: "A dor me impede de caminhar mais de 100 m", label_en: "Pain prevents me walking more than 100 yards" },
      { value: 4, label_pt: "Só consigo caminhar com bengala ou muletas", label_en: "I can only walk using a stick or crutches" },
      { value: 5, label_pt: "Fico na cama a maior parte do tempo", label_en: "I am in bed most of the time" },
    ],
  },
  {
    id: "odi_5",
    subscale: "sitting",
    text_pt: "Sentar",
    text_en: "Sitting",
    options: [
      { value: 0, label_pt: "Consigo sentar em qualquer cadeira pelo tempo que quiser", label_en: "I can sit in any chair as long as I like" },
      { value: 1, label_pt: "Consigo sentar na minha cadeira favorita pelo tempo que quiser", label_en: "I can sit in my favourite chair as long as I like" },
      { value: 2, label_pt: "A dor me impede de ficar sentado por mais de 1 hora", label_en: "Pain prevents me from sitting more than 1 hour" },
      { value: 3, label_pt: "A dor me impede de ficar sentado por mais de 30 minutos", label_en: "Pain prevents me from sitting more than half an hour" },
      { value: 4, label_pt: "A dor me impede de ficar sentado por mais de 10 minutos", label_en: "Pain prevents me from sitting more than 10 minutes" },
      { value: 5, label_pt: "A dor me impede de sentar", label_en: "Pain prevents me from sitting at all" },
    ],
  },
  {
    id: "odi_6",
    subscale: "standing",
    text_pt: "Ficar em pé",
    text_en: "Standing",
    options: [
      { value: 0, label_pt: "Consigo ficar em pé o tempo que quiser sem dor extra", label_en: "I can stand as long as I want without extra pain" },
      { value: 1, label_pt: "Consigo ficar em pé o tempo que quiser, mas com dor extra", label_en: "I can stand as long as I want but it gives me extra pain" },
      { value: 2, label_pt: "A dor me impede de ficar em pé por mais de 1 hora", label_en: "Pain prevents me from standing for more than 1 hour" },
      { value: 3, label_pt: "A dor me impede de ficar em pé por mais de 30 minutos", label_en: "Pain prevents me from standing for more than half an hour" },
      { value: 4, label_pt: "A dor me impede de ficar em pé por mais de 10 minutos", label_en: "Pain prevents me from standing for more than 10 minutes" },
      { value: 5, label_pt: "A dor me impede de ficar em pé", label_en: "Pain prevents me from standing at all" },
    ],
  },
  {
    id: "odi_7",
    subscale: "sleeping",
    text_pt: "Dormir",
    text_en: "Sleeping",
    options: [
      { value: 0, label_pt: "Meu sono nunca é perturbado pela dor", label_en: "My sleep is never disturbed by pain" },
      { value: 1, label_pt: "Meu sono é ocasionalmente perturbado pela dor", label_en: "My sleep is occasionally disturbed by pain" },
      { value: 2, label_pt: "Por causa da dor durmo menos de 6 horas", label_en: "Because of pain I have less than 6 hours of sleep" },
      { value: 3, label_pt: "Por causa da dor durmo menos de 4 horas", label_en: "Because of pain I have less than 4 hours of sleep" },
      { value: 4, label_pt: "Por causa da dor durmo menos de 2 horas", label_en: "Because of pain I have less than 2 hours of sleep" },
      { value: 5, label_pt: "A dor me impede de dormir", label_en: "Pain prevents me from sleeping at all" },
    ],
  },
  {
    id: "odi_8",
    subscale: "social_life",
    text_pt: "Vida social",
    text_en: "Social life",
    options: [
      { value: 0, label_pt: "Minha vida social é normal e não causa dor extra", label_en: "My social life is normal and causes me no extra pain" },
      { value: 1, label_pt: "Minha vida social é normal, mas aumenta a dor", label_en: "My social life is normal but increases the degree of pain" },
      { value: 2, label_pt: "A dor limita apenas atividades mais intensas como esporte", label_en: "Pain limits my more energetic interests like sport" },
      { value: 3, label_pt: "A dor restringiu minha vida social e não saio tanto", label_en: "Pain has restricted my social life and I do not go out as often" },
      { value: 4, label_pt: "A dor restringiu minha vida social à minha casa", label_en: "Pain has restricted my social life to my home" },
      { value: 5, label_pt: "Não tenho vida social por causa da dor", label_en: "I have no social life because of pain" },
    ],
  },
  {
    id: "odi_9",
    subscale: "traveling",
    text_pt: "Viajar / Deslocar-se",
    text_en: "Travelling",
    options: [
      { value: 0, label_pt: "Posso me deslocar para qualquer lugar sem dor", label_en: "I can travel anywhere without pain" },
      { value: 1, label_pt: "Posso me deslocar para qualquer lugar, mas com dor extra", label_en: "I can travel anywhere but it gives extra pain" },
      { value: 2, label_pt: "A dor é forte, mas consigo viagens de mais de 2 horas", label_en: "Pain is bad but I manage journeys over two hours" },
      { value: 3, label_pt: "A dor me limita a viagens de menos de 1 hora", label_en: "Pain restricts me to journeys of less than one hour" },
      { value: 4, label_pt: "A dor me limita a deslocamentos curtos de até 30 minutos", label_en: "Pain restricts me to short necessary journeys under 30 minutes" },
      { value: 5, label_pt: "A dor me impede de viajar, exceto para tratamento", label_en: "Pain prevents me from travelling except to receive treatment" },
    ],
  },
  {
    id: "odi_10",
    subscale: "employment",
    text_pt: "Trabalho / Atividades do dia a dia",
    text_en: "Employment / Daily activities",
    options: [
      { value: 0, label_pt: "Minhas atividades normais não causam dor extra", label_en: "My normal activities do not cause extra pain" },
      { value: 1, label_pt: "Minhas atividades normais causam dor extra", label_en: "My normal activities cause extra pain" },
      { value: 2, label_pt: "Consigo fazer a maioria das atividades, mas a dor limita as mais pesadas", label_en: "I can perform most activities but pain limits heavier ones" },
      { value: 3, label_pt: "A dor me impede de fazer atividades além das leves", label_en: "Pain prevents me from doing anything beyond light duties" },
      { value: 4, label_pt: "A dor me impede de fazer quase todas as atividades", label_en: "Pain prevents me from doing almost all activities" },
      { value: 5, label_pt: "A dor me impede de fazer qualquer atividade", label_en: "Pain prevents me from doing any activity" },
    ],
  },
];

// =============================================
// 2. SPADI - Índice de Dor e Incapacidade do Ombro
// =============================================

const spadiQuestions: QuestionnaireQuestion[] = [
  // Pain scale (0-10)
  { id: "spadi_p1", subscale: "pain", text_pt: "No seu pior momento, qual a intensidade da sua dor no ombro?", text_en: "At its worst?", options: SCALE_0_10 },
  { id: "spadi_p2", subscale: "pain", text_pt: "Quando deita sobre o lado afetado?", text_en: "When lying on the involved side?", options: SCALE_0_10 },
  { id: "spadi_p3", subscale: "pain", text_pt: "Ao alcançar algo em uma prateleira alta?", text_en: "Reaching for something on a high shelf?", options: SCALE_0_10 },
  { id: "spadi_p4", subscale: "pain", text_pt: "Ao tocar a parte de trás do pescoço?", text_en: "Touching the back of your neck?", options: SCALE_0_10 },
  { id: "spadi_p5", subscale: "pain", text_pt: "Ao empurrar com o braço afetado?", text_en: "Pushing with the involved arm?", options: SCALE_0_10 },
  // Disability scale (0-10)
  { id: "spadi_d1", subscale: "disability", text_pt: "Lavar o cabelo?", text_en: "Washing your hair?", options: SCALE_0_10 },
  { id: "spadi_d2", subscale: "disability", text_pt: "Lavar as costas?", text_en: "Washing your back?", options: SCALE_0_10 },
  { id: "spadi_d3", subscale: "disability", text_pt: "Vestir uma camiseta ou blusa?", text_en: "Putting on an undershirt or jumper?", options: SCALE_0_10 },
  { id: "spadi_d4", subscale: "disability", text_pt: "Vestir uma camisa com botões na frente?", text_en: "Putting on a shirt that buttons down the front?", options: SCALE_0_10 },
  { id: "spadi_d5", subscale: "disability", text_pt: "Vestir suas calças?", text_en: "Putting on your pants?", options: SCALE_0_10 },
  { id: "spadi_d6", subscale: "disability", text_pt: "Colocar um objeto em uma prateleira alta?", text_en: "Placing an object on a high shelf?", options: SCALE_0_10 },
  { id: "spadi_d7", subscale: "disability", text_pt: "Carregar um objeto pesado (4,5 kg)?", text_en: "Carrying a heavy object of 10 pounds (4.5 kg)?", options: SCALE_0_10 },
  { id: "spadi_d8", subscale: "disability", text_pt: "Tirar algo do bolso de trás?", text_en: "Removing something from your back pocket?", options: SCALE_0_10 },
];

// =============================================
// 3. KOOS - Joelho (Curado: 15 itens)
// =============================================

const koosQuestions: QuestionnaireQuestion[] = [
  // Pain (2 items - frequency + most discriminative functional pain)
  { id: "koos_p1", subscale: "pain", text_pt: "Com que frequência você sente dor no joelho?", text_en: "How often is your knee painful?", options: LIKERT_5_FREQUENCY_PAIN },
  { id: "koos_p6", subscale: "pain", text_pt: "Dor ao subir ou descer escadas?", text_en: "Pain going up or down stairs?", options: LIKERT_5_DIFFICULTY },
  // Symptoms (2 items - stiffness + swelling are most clinically relevant)
  { id: "koos_s1", subscale: "symptoms", text_pt: "Qual a rigidez do seu joelho ao acordar de manhã?", text_en: "How severe is your knee stiffness after first wakening?", options: LIKERT_5_DIFFICULTY },
  { id: "koos_s3", subscale: "symptoms", text_pt: "Você tem inchaço no joelho?", text_en: "Do you have swelling in your knee?", options: LIKERT_5_FREQUENCY },
  // ADL (2 items - most functionally discriminative)
  { id: "koos_a1", subscale: "adl", text_pt: "Dificuldade ao descer escadas?", text_en: "Descending stairs?", options: LIKERT_5_DIFFICULTY },
  { id: "koos_a3", subscale: "adl", text_pt: "Dificuldade ao levantar da posição sentada?", text_en: "Rising from sitting?", options: LIKERT_5_DIFFICULTY },
  // Sport (1 item - squatting is most universal)
  { id: "koos_sp1", subscale: "sport", text_pt: "Dificuldade ao agachar?", text_en: "Squatting?", options: LIKERT_5_DIFFICULTY },
  // QoL (1 item - overall difficulty is most comprehensive)
  { id: "koos_q4", subscale: "qol", text_pt: "No geral, quanta dificuldade você tem com seu joelho?", text_en: "In general, how much difficulty do you have with your knee?", options: LIKERT_5_DIFFICULTY },
];

// =============================================
// 4. HOOS - Quadril (Curado: 15 itens)
// =============================================

const hoosQuestions: QuestionnaireQuestion[] = [
  // Symptoms (2 items)
  { id: "hoos_s1", subscale: "symptoms", text_pt: "Você ouve estalos ou outros sons no quadril?", text_en: "Do you feel grinding, hear clicking or noise from your hip?", options: LIKERT_5_FREQUENCY },
  { id: "hoos_s3", subscale: "symptoms", text_pt: "Dificuldade para dar passos largos ao caminhar?", text_en: "Difficulties to stride out when walking?", options: LIKERT_5_FREQUENCY },
  // Stiffness (1 item)
  { id: "hoos_s4", subscale: "stiffness", text_pt: "Qual a rigidez do seu quadril ao acordar de manhã?", text_en: "How severe is your hip stiffness after first wakening?", options: LIKERT_5_DIFFICULTY },
  // Pain (4 items)
  { id: "hoos_p1", subscale: "pain", text_pt: "Com que frequência você sente dor no quadril?", text_en: "How often is your hip painful?", options: LIKERT_5_FREQUENCY_PAIN },
  { id: "hoos_p4", subscale: "pain", text_pt: "Dor ao caminhar em superfície plana?", text_en: "Pain walking on a flat surface?", options: LIKERT_5_DIFFICULTY },
  { id: "hoos_p5", subscale: "pain", text_pt: "Dor ao subir ou descer escadas?", text_en: "Pain going up or down stairs?", options: LIKERT_5_DIFFICULTY },
  { id: "hoos_p6", subscale: "pain", text_pt: "Dor à noite na cama?", text_en: "Pain at night while in bed?", options: LIKERT_5_DIFFICULTY },
  // ADL (4 items)
  { id: "hoos_a1", subscale: "adl", text_pt: "Dificuldade ao descer escadas?", text_en: "Descending stairs?", options: LIKERT_5_DIFFICULTY },
  { id: "hoos_a3", subscale: "adl", text_pt: "Dificuldade ao levantar da posição sentada?", text_en: "Rising from sitting?", options: LIKERT_5_DIFFICULTY },
  { id: "hoos_a5", subscale: "adl", text_pt: "Dificuldade ao se abaixar para pegar um objeto?", text_en: "Bending to floor/pick up an object?", options: LIKERT_5_DIFFICULTY },
  { id: "hoos_a7", subscale: "adl", text_pt: "Dificuldade ao entrar/sair do carro?", text_en: "Getting in/out of car?", options: LIKERT_5_DIFFICULTY },
  // Sport (2 items)
  { id: "hoos_sp1", subscale: "sport", text_pt: "Dificuldade ao agachar?", text_en: "Squatting?", options: LIKERT_5_DIFFICULTY },
  { id: "hoos_sp2", subscale: "sport", text_pt: "Dificuldade ao correr?", text_en: "Running?", options: LIKERT_5_DIFFICULTY },
  // QoL (2 items)
  { id: "hoos_q1", subscale: "qol", text_pt: "Com que frequência você percebe o problema no quadril?", text_en: "How often are you aware of your hip problem?", options: LIKERT_5_AWARENESS },
  { id: "hoos_q4", subscale: "qol", text_pt: "No geral, quanta dificuldade você tem com seu quadril?", text_en: "In general, how much difficulty do you have with your hip?", options: LIKERT_5_DIFFICULTY },
];

// =============================================
// 5. FAOS - Pé/Tornozelo (Curado: 15 itens)
// =============================================

const faosQuestions: QuestionnaireQuestion[] = [
  // Symptoms (2 items)
  { id: "faos_s1", subscale: "symptoms", text_pt: "Você tem inchaço no pé/tornozelo?", text_en: "Do you have swelling in your foot/ankle?", options: LIKERT_5_FREQUENCY },
  { id: "faos_s2", subscale: "symptoms", text_pt: "Você ouve estalos ou outros sons no pé/tornozelo?", text_en: "Do you hear clicking or noise when your foot/ankle moves?", options: LIKERT_5_FREQUENCY },
  // Stiffness (1 item)
  { id: "faos_s6", subscale: "stiffness", text_pt: "Qual a rigidez do pé/tornozelo ao acordar de manhã?", text_en: "How severe is your foot/ankle stiffness after first wakening?", options: LIKERT_5_DIFFICULTY },
  // Pain (4 items)
  { id: "faos_p1", subscale: "pain", text_pt: "Com que frequência você sente dor no pé/tornozelo?", text_en: "How often do you experience foot/ankle pain?", options: LIKERT_5_FREQUENCY_PAIN },
  { id: "faos_p5", subscale: "pain", text_pt: "Dor ao caminhar em superfície plana?", text_en: "Pain walking on flat surface?", options: LIKERT_5_DIFFICULTY },
  { id: "faos_p6", subscale: "pain", text_pt: "Dor ao subir ou descer escadas?", text_en: "Pain going up or down stairs?", options: LIKERT_5_DIFFICULTY },
  { id: "faos_p9", subscale: "pain", text_pt: "Dor ao ficar em pé?", text_en: "Pain standing upright?", options: LIKERT_5_DIFFICULTY },
  // ADL (4 items)
  { id: "faos_a1", subscale: "adl", text_pt: "Dificuldade ao descer escadas?", text_en: "Descending stairs?", options: LIKERT_5_DIFFICULTY },
  { id: "faos_a3", subscale: "adl", text_pt: "Dificuldade ao levantar da posição sentada?", text_en: "Rising from sitting?", options: LIKERT_5_DIFFICULTY },
  { id: "faos_a5", subscale: "adl", text_pt: "Dificuldade ao se abaixar para pegar um objeto?", text_en: "Bending to floor/pick up an object?", options: LIKERT_5_DIFFICULTY },
  { id: "faos_a6", subscale: "adl", text_pt: "Dificuldade ao caminhar em superfície plana?", text_en: "Walking on flat surface?", options: LIKERT_5_DIFFICULTY },
  // Sport (2 items)
  { id: "faos_sp1", subscale: "sport", text_pt: "Dificuldade ao agachar?", text_en: "Squatting?", options: LIKERT_5_DIFFICULTY },
  { id: "faos_sp2", subscale: "sport", text_pt: "Dificuldade ao correr?", text_en: "Running?", options: LIKERT_5_DIFFICULTY },
  // QoL (2 items)
  { id: "faos_q1", subscale: "qol", text_pt: "Com que frequência você percebe o problema no pé/tornozelo?", text_en: "How often are you aware of your foot/ankle problem?", options: LIKERT_5_AWARENESS },
  { id: "faos_q4", subscale: "qol", text_pt: "No geral, quanta dificuldade você tem com seu pé/tornozelo?", text_en: "In general, how much difficulty do you have with your foot/ankle?", options: LIKERT_5_DIFFICULTY },
];

// =============================================
// 6. VISA-A - Victorian Institute of Sport Assessment - Achilles
// =============================================

const visaAQuestions: QuestionnaireQuestion[] = [
  {
    id: "visa_a1",
    subscale: "pain",
    text_pt: "Por quantos minutos você sente rigidez no tendão de Aquiles ao acordar de manhã?",
    text_en: "For how many minutes do you have stiffness in the Achilles region on first getting up?",
    options: [
      { value: 10, label_pt: "0 minutos", label_en: "0 minutes" },
      { value: 7, label_pt: "1–5 minutos", label_en: "1–5 minutes" },
      { value: 5, label_pt: "6–10 minutos", label_en: "6–10 minutes" },
      { value: 2, label_pt: "11–30 minutos", label_en: "11–30 minutes" },
      { value: 0, label_pt: "> 30 minutos", label_en: "> 30 minutes" },
    ],
  },
  {
    id: "visa_a2",
    subscale: "pain",
    text_pt: "Quando se alonga sobre uma borda (como um degrau), você tem dor no tendão de Aquiles?",
    text_en: "Once you are warmed up for the day, do you have pain when stretching the Achilles tendon over the edge of a step?",
    options: [
      { value: 10, label_pt: "Nenhuma dor", label_en: "No pain" },
      { value: 7, label_pt: "Dor leve", label_en: "Mild pain" },
      { value: 4, label_pt: "Dor moderada", label_en: "Moderate pain" },
      { value: 1, label_pt: "Dor forte", label_en: "Strong pain" },
      { value: 0, label_pt: "Dor muito forte", label_en: "Very strong pain" },
    ],
  },
  {
    id: "visa_a3",
    subscale: "pain",
    text_pt: "Após caminhar em superfície plana por 30 minutos, você sente dor no tendão de Aquiles nas próximas 2 horas?",
    text_en: "After walking on flat ground for 30 minutes, do you have pain within the next 2 hours?",
    options: [
      { value: 10, label_pt: "Nenhuma dor", label_en: "No pain" },
      { value: 7, label_pt: "Dor leve", label_en: "Mild pain" },
      { value: 4, label_pt: "Dor moderada", label_en: "Moderate pain" },
      { value: 1, label_pt: "Dor forte", label_en: "Strong pain" },
      { value: 0, label_pt: "Dor muito forte", label_en: "Very strong pain" },
    ],
  },
  {
    id: "visa_a4",
    subscale: "pain",
    text_pt: "Ao descer escadas com ritmo normal, você sente dor no tendão de Aquiles?",
    text_en: "Do you have pain walking downstairs with a normal gait cycle?",
    options: [
      { value: 10, label_pt: "Nenhuma dor", label_en: "No pain" },
      { value: 7, label_pt: "Dor leve", label_en: "Mild pain" },
      { value: 4, label_pt: "Dor moderada", label_en: "Moderate pain" },
      { value: 1, label_pt: "Dor forte", label_en: "Strong pain" },
      { value: 0, label_pt: "Dor muito forte", label_en: "Very strong pain" },
    ],
  },
  {
    id: "visa_a5",
    subscale: "function",
    text_pt: "Você sente dor durante ou imediatamente após fazer 10 elevações de calcanhar (na ponta dos pés) em uma perna só?",
    text_en: "Do you have pain during or immediately after doing 10 single leg heel raises from a flat surface?",
    options: [
      { value: 10, label_pt: "Nenhuma dor", label_en: "No pain" },
      { value: 7, label_pt: "Dor leve", label_en: "Mild pain" },
      { value: 4, label_pt: "Dor moderada", label_en: "Moderate pain" },
      { value: 1, label_pt: "Dor forte", label_en: "Strong pain" },
      { value: 0, label_pt: "Dor muito forte", label_en: "Very strong pain" },
    ],
  },
  {
    id: "visa_a6",
    subscale: "function",
    text_pt: "Quantos saltos em uma perna só você consegue fazer sem dor?",
    text_en: "How many single leg hops can you do without pain?",
    options: [
      { value: 0, label_pt: "0", label_en: "0" },
      { value: 2, label_pt: "1–5", label_en: "1–5" },
      { value: 4, label_pt: "6–10", label_en: "6–10" },
      { value: 7, label_pt: "11–20", label_en: "11–20" },
      { value: 10, label_pt: "> 20", label_en: "> 20" },
    ],
  },
  {
    id: "visa_a7",
    subscale: "activity",
    text_pt: "Você pratica alguma atividade física atualmente?",
    text_en: "Are you currently undertaking sport or other physical activity?",
    options: [
      { value: 0, label_pt: "Não, por causa da dor no tendão", label_en: "Not at all, due to Achilles tendon pain" },
      { value: 4, label_pt: "Treino modificado ± competição modificada", label_en: "Modified training ± modified competition" },
      { value: 7, label_pt: "Treino completo ± competição, mas não no mesmo nível", label_en: "Full training ± competition but not at same level" },
      { value: 10, label_pt: "Competindo no mesmo nível ou acima", label_en: "Competing at the same or higher level" },
    ],
  },
  {
    id: "visa_a8",
    subscale: "activity",
    text_pt: "Por quanto tempo você consegue treinar/praticar sem dor?",
    text_en: "How long can you train/practice without pain?",
    options: [
      { value: 0, label_pt: "Não consigo treinar", label_en: "Cannot train" },
      { value: 7, label_pt: "1–10 minutos", label_en: "1–10 minutes" },
      { value: 14, label_pt: "11–20 minutos", label_en: "11–20 minutes" },
      { value: 21, label_pt: "21–30 minutos", label_en: "21–30 minutes" },
      { value: 30, label_pt: "> 30 minutos", label_en: "> 30 minutes" },
    ],
  },
];

// =============================================
// 7. QuickDASH - Disabilities of the Arm, Shoulder and Hand
// =============================================

const LIKERT_5_QUICKDASH: QuestionOption[] = [
  { value: 1, label_pt: "Nenhuma dificuldade", label_en: "No difficulty" },
  { value: 2, label_pt: "Pouca dificuldade", label_en: "Mild difficulty" },
  { value: 3, label_pt: "Dificuldade moderada", label_en: "Moderate difficulty" },
  { value: 4, label_pt: "Muita dificuldade", label_en: "Severe difficulty" },
  { value: 5, label_pt: "Incapaz", label_en: "Unable" },
];

const LIKERT_5_QUICKDASH_SYMPTOMS: QuestionOption[] = [
  { value: 1, label_pt: "Nenhuma", label_en: "None" },
  { value: 2, label_pt: "Leve", label_en: "Mild" },
  { value: 3, label_pt: "Moderada", label_en: "Moderate" },
  { value: 4, label_pt: "Intensa", label_en: "Severe" },
  { value: 5, label_pt: "Extrema", label_en: "Extreme" },
];

const LIKERT_5_QUICKDASH_INTERFERENCE: QuestionOption[] = [
  { value: 1, label_pt: "De forma alguma", label_en: "Not at all" },
  { value: 2, label_pt: "Levemente", label_en: "Slightly" },
  { value: 3, label_pt: "Moderadamente", label_en: "Moderately" },
  { value: 4, label_pt: "Muito", label_en: "Quite a bit" },
  { value: 5, label_pt: "Extremamente", label_en: "Extremely" },
];

const quickdashQuestions: QuestionnaireQuestion[] = [
  { id: "qd_1", subscale: "daily_activities", text_pt: "Abrir um pote novo ou com a tampa bem apertada", text_en: "Open a tight or new jar", options: LIKERT_5_QUICKDASH },
  { id: "qd_2", subscale: "daily_activities", text_pt: "Realizar tarefas domésticas pesadas (lavar paredes, chão)", text_en: "Do heavy household chores (wash walls, floors)", options: LIKERT_5_QUICKDASH },
  { id: "qd_3", subscale: "daily_activities", text_pt: "Carregar uma sacola de compras ou pasta", text_en: "Carry a shopping bag or briefcase", options: LIKERT_5_QUICKDASH },
  { id: "qd_4", subscale: "daily_activities", text_pt: "Lavar suas costas", text_en: "Wash your back", options: LIKERT_5_QUICKDASH },
  { id: "qd_5", subscale: "daily_activities", text_pt: "Usar uma faca para cortar alimentos", text_en: "Use a knife to cut food", options: LIKERT_5_QUICKDASH },
  { id: "qd_6", subscale: "daily_activities", text_pt: "Atividades de lazer que exigem força no braço (jardinagem, martelar)", text_en: "Recreational activities requiring force or impact (gardening, hammering)", options: LIKERT_5_QUICKDASH },
  { id: "qd_7", subscale: "symptoms", text_pt: "Na última semana, qual a intensidade da dor no braço, ombro ou mão?", text_en: "Arm, shoulder or hand pain in the past week?", options: LIKERT_5_QUICKDASH_SYMPTOMS },
  { id: "qd_8", subscale: "symptoms", text_pt: "Formigamento (alfinetadas) no braço, ombro ou mão?", text_en: "Tingling (pins and needles) in your arm, shoulder or hand?", options: LIKERT_5_QUICKDASH_SYMPTOMS },
  { id: "qd_9", subscale: "symptoms", text_pt: "Quanta dificuldade para dormir por causa da dor no braço, ombro ou mão?", text_en: "How much difficulty sleeping because of pain in arm, shoulder or hand?", options: LIKERT_5_QUICKDASH_SYMPTOMS },
  { id: "qd_10", subscale: "social_impact", text_pt: "Quanto o problema no braço, ombro ou mão interferiu nas atividades sociais na última semana?", text_en: "How much has your arm, shoulder or hand problem interfered with social activities?", options: LIKERT_5_QUICKDASH_INTERFERENCE },
  { id: "qd_11", subscale: "social_impact", text_pt: "Quanto você se sentiu limitado no trabalho ou atividades diárias pelo problema no braço, ombro ou mão?", text_en: "How much has your arm, shoulder or hand problem limited your work or daily activities?", options: LIKERT_5_QUICKDASH_INTERFERENCE },
];

// =============================================
// 8. NDI - Neck Disability Index
// =============================================

const ndiQuestions: QuestionnaireQuestion[] = [
  {
    id: "ndi_1", subscale: "pain_intensity", text_pt: "Intensidade da dor no pescoço", text_en: "Neck Pain Intensity",
    options: [
      { value: 0, label_pt: "Não sinto dor no momento", label_en: "I have no pain at the moment" },
      { value: 1, label_pt: "A dor é muito leve no momento", label_en: "The pain is very mild at the moment" },
      { value: 2, label_pt: "A dor é moderada no momento", label_en: "The pain is moderate at the moment" },
      { value: 3, label_pt: "A dor é razoavelmente forte", label_en: "The pain is fairly severe" },
      { value: 4, label_pt: "A dor é muito forte", label_en: "The pain is very severe" },
      { value: 5, label_pt: "A dor é a pior imaginável", label_en: "The pain is the worst imaginable" },
    ],
  },
  {
    id: "ndi_2", subscale: "personal_care", text_pt: "Cuidados pessoais (banho, vestir-se)", text_en: "Personal Care (washing, dressing)",
    options: [
      { value: 0, label_pt: "Consigo me cuidar normalmente sem dor extra", label_en: "I can look after myself normally without causing extra pain" },
      { value: 1, label_pt: "Consigo me cuidar normalmente, mas causa dor extra", label_en: "I can look after myself normally but it causes extra pain" },
      { value: 2, label_pt: "É doloroso me cuidar e sou lento e cuidadoso", label_en: "It is painful to look after myself and I am slow and careful" },
      { value: 3, label_pt: "Preciso de alguma ajuda, mas faço a maioria", label_en: "I need some help but manage most of my personal care" },
      { value: 4, label_pt: "Preciso de ajuda diariamente na maioria dos cuidados", label_en: "I need help every day in most aspects of self-care" },
      { value: 5, label_pt: "Não consigo me vestir sozinho, tomo banho com dificuldade", label_en: "I do not get dressed, I wash with difficulty and stay in bed" },
    ],
  },
  {
    id: "ndi_3", subscale: "lifting", text_pt: "Levantar objetos", text_en: "Lifting",
    options: [
      { value: 0, label_pt: "Consigo levantar pesos pesados sem dor no pescoço", label_en: "I can lift heavy weights without extra neck pain" },
      { value: 1, label_pt: "Consigo levantar pesos pesados, mas com dor extra no pescoço", label_en: "I can lift heavy weights but it gives extra neck pain" },
      { value: 2, label_pt: "A dor me impede de levantar pesos pesados do chão", label_en: "Pain prevents me from lifting heavy weights off the floor" },
      { value: 3, label_pt: "Consigo levantar objetos leves a médios se bem posicionados", label_en: "I can only lift light to medium weights if conveniently positioned" },
      { value: 4, label_pt: "Consigo levantar apenas objetos muito leves", label_en: "I can only lift very light weights" },
      { value: 5, label_pt: "Não consigo levantar ou carregar nada", label_en: "I cannot lift or carry anything at all" },
    ],
  },
  {
    id: "ndi_4", subscale: "reading", text_pt: "Leitura", text_en: "Reading",
    options: [
      { value: 0, label_pt: "Posso ler o quanto quiser sem dor no pescoço", label_en: "I can read as much as I want with no neck pain" },
      { value: 1, label_pt: "Posso ler o quanto quiser com dor leve no pescoço", label_en: "I can read as much as I want with slight neck pain" },
      { value: 2, label_pt: "Posso ler o quanto quiser com dor moderada no pescoço", label_en: "I can read as much as I want with moderate neck pain" },
      { value: 3, label_pt: "Não consigo ler o quanto quiser por causa da dor moderada", label_en: "I can't read as much as I want because of moderate neck pain" },
      { value: 4, label_pt: "Mal consigo ler por causa da dor forte no pescoço", label_en: "I can hardly read at all because of severe neck pain" },
      { value: 5, label_pt: "Não consigo ler de forma alguma", label_en: "I cannot read at all" },
    ],
  },
  {
    id: "ndi_5", subscale: "headache", text_pt: "Dores de cabeça", text_en: "Headaches",
    options: [
      { value: 0, label_pt: "Não tenho dores de cabeça", label_en: "I have no headaches at all" },
      { value: 1, label_pt: "Tenho dores de cabeça leves e pouco frequentes", label_en: "I have slight headaches which come infrequently" },
      { value: 2, label_pt: "Tenho dores de cabeça moderadas e pouco frequentes", label_en: "I have moderate headaches which come infrequently" },
      { value: 3, label_pt: "Tenho dores de cabeça moderadas frequentes", label_en: "I have moderate headaches which come frequently" },
      { value: 4, label_pt: "Tenho dores de cabeça fortes frequentes", label_en: "I have severe headaches which come frequently" },
      { value: 5, label_pt: "Tenho dores de cabeça quase o tempo todo", label_en: "I have headaches almost all the time" },
    ],
  },
  {
    id: "ndi_6", subscale: "concentration", text_pt: "Concentração", text_en: "Concentration",
    options: [
      { value: 0, label_pt: "Consigo me concentrar totalmente sem dificuldade", label_en: "I can concentrate fully when I want with no difficulty" },
      { value: 1, label_pt: "Consigo me concentrar totalmente com dificuldade leve", label_en: "I can concentrate fully when I want with slight difficulty" },
      { value: 2, label_pt: "Tenho dificuldade razoável para me concentrar", label_en: "I have a fair degree of difficulty in concentrating" },
      { value: 3, label_pt: "Tenho muita dificuldade para me concentrar", label_en: "I have a lot of difficulty in concentrating" },
      { value: 4, label_pt: "Tenho enorme dificuldade para me concentrar", label_en: "I have a great deal of difficulty in concentrating" },
      { value: 5, label_pt: "Não consigo me concentrar de forma alguma", label_en: "I cannot concentrate at all" },
    ],
  },
  {
    id: "ndi_7", subscale: "work", text_pt: "Trabalho", text_en: "Work",
    options: [
      { value: 0, label_pt: "Posso trabalhar o quanto quiser", label_en: "I can do as much work as I want" },
      { value: 1, label_pt: "Só consigo fazer meu trabalho habitual, nada mais", label_en: "I can only do my usual work, but no more" },
      { value: 2, label_pt: "Consigo fazer a maior parte do trabalho, mas não mais", label_en: "I can do most of my usual work, but no more" },
      { value: 3, label_pt: "Não consigo fazer meu trabalho habitual", label_en: "I cannot do my usual work" },
      { value: 4, label_pt: "Mal consigo fazer qualquer trabalho", label_en: "I can hardly do any work at all" },
      { value: 5, label_pt: "Não consigo fazer nenhum trabalho", label_en: "I can't do any work at all" },
    ],
  },
  {
    id: "ndi_8", subscale: "driving", text_pt: "Dirigir", text_en: "Driving",
    options: [
      { value: 0, label_pt: "Posso dirigir sem dor no pescoço", label_en: "I can drive my car without any neck pain" },
      { value: 1, label_pt: "Posso dirigir o quanto quiser com dor leve", label_en: "I can drive as long as I want with slight neck pain" },
      { value: 2, label_pt: "Posso dirigir o quanto quiser com dor moderada", label_en: "I can drive as long as I want with moderate neck pain" },
      { value: 3, label_pt: "Não posso dirigir tanto por causa da dor moderada", label_en: "I can't drive as long as I want because of moderate pain" },
      { value: 4, label_pt: "Mal consigo dirigir por causa da dor forte", label_en: "I can hardly drive at all because of severe neck pain" },
      { value: 5, label_pt: "Não consigo dirigir por causa da dor", label_en: "I can't drive at all" },
    ],
  },
  {
    id: "ndi_9", subscale: "sleeping", text_pt: "Dormir", text_en: "Sleeping",
    options: [
      { value: 0, label_pt: "Não tenho problemas para dormir", label_en: "I have no trouble sleeping" },
      { value: 1, label_pt: "Meu sono é levemente perturbado (menos de 1h sem dormir)", label_en: "My sleep is slightly disturbed (less than 1 hour sleepless)" },
      { value: 2, label_pt: "Meu sono é levemente perturbado (1-2h sem dormir)", label_en: "My sleep is mildly disturbed (1-2 hours sleepless)" },
      { value: 3, label_pt: "Meu sono é moderadamente perturbado (2-3h sem dormir)", label_en: "My sleep is moderately disturbed (2-3 hours sleepless)" },
      { value: 4, label_pt: "Meu sono é muito perturbado (3-5h sem dormir)", label_en: "My sleep is greatly disturbed (3-5 hours sleepless)" },
      { value: 5, label_pt: "Meu sono é completamente perturbado (5-7h sem dormir)", label_en: "My sleep is completely disturbed (5-7 hours sleepless)" },
    ],
  },
  {
    id: "ndi_10", subscale: "recreation", text_pt: "Recreação / Lazer", text_en: "Recreation",
    options: [
      { value: 0, label_pt: "Consigo fazer todas as atividades de lazer sem dor", label_en: "I am able to engage in all recreation activities with no neck pain" },
      { value: 1, label_pt: "Consigo fazer todas as atividades com alguma dor no pescoço", label_en: "I am able to engage in all activities with some neck pain" },
      { value: 2, label_pt: "Consigo fazer a maioria, mas não todas as atividades de lazer", label_en: "I am able to engage in most, but not all activities" },
      { value: 3, label_pt: "Consigo fazer apenas poucas atividades de lazer", label_en: "I am able to engage in a few of my usual activities" },
      { value: 4, label_pt: "Mal consigo fazer qualquer atividade de lazer", label_en: "I can hardly do any recreational activities" },
      { value: 5, label_pt: "Não consigo fazer nenhuma atividade de lazer", label_en: "I can't do any recreational activities at all" },
    ],
  },
];

// =============================================
// 9. HIT-6 - Headache Impact Test
// =============================================

const HIT6_OPTIONS: QuestionOption[] = [
  { value: 6, label_pt: "Nunca", label_en: "Never" },
  { value: 8, label_pt: "Raramente", label_en: "Rarely" },
  { value: 10, label_pt: "Às vezes", label_en: "Sometimes" },
  { value: 11, label_pt: "Frequentemente", label_en: "Very Often" },
  { value: 13, label_pt: "Sempre", label_en: "Always" },
];

const hit6Questions: QuestionnaireQuestion[] = [
  { id: "hit6_1", subscale: "impact", text_pt: "Quando você tem dores de cabeça, com que frequência a dor é intensa?", text_en: "When you have headaches, how often is the pain severe?", options: HIT6_OPTIONS },
  { id: "hit6_2", subscale: "impact", text_pt: "Com que frequência as dores de cabeça limitam sua capacidade de fazer atividades diárias habituais?", text_en: "How often do headaches limit your ability to do usual daily activities?", options: HIT6_OPTIONS },
  { id: "hit6_3", subscale: "impact", text_pt: "Quando você tem dor de cabeça, com que frequência gostaria de poder deitar-se?", text_en: "When you have a headache, how often do you wish you could lie down?", options: HIT6_OPTIONS },
  { id: "hit6_4", subscale: "impact", text_pt: "Nas últimas 4 semanas, com que frequência você se sentiu cansado(a) ou fatigado(a) demais para trabalhar ou realizar atividades por causa das dores de cabeça?", text_en: "In the past 4 weeks, how often have you felt too tired to do work or daily activities because of your headaches?", options: HIT6_OPTIONS },
  { id: "hit6_5", subscale: "impact", text_pt: "Nas últimas 4 semanas, com que frequência você se sentiu irritado(a) por causa das dores de cabeça?", text_en: "In the past 4 weeks, how often have you felt fed up or irritated because of your headaches?", options: HIT6_OPTIONS },
  { id: "hit6_6", subscale: "impact", text_pt: "Nas últimas 4 semanas, com que frequência as dores de cabeça limitaram sua capacidade de se concentrar no trabalho ou atividades diárias?", text_en: "In the past 4 weeks, how often did headaches limit your ability to concentrate on work or daily activities?", options: HIT6_OPTIONS },
];

// =============================================
// 10. LEFS-8 - Lower Extremity Functional Scale (Short Form)
// =============================================

const LIKERT_5_LEFS: QuestionOption[] = [
  { value: 0, label_pt: "Extrema dificuldade ou incapaz", label_en: "Extreme difficulty or unable" },
  { value: 1, label_pt: "Muita dificuldade", label_en: "Quite a bit of difficulty" },
  { value: 2, label_pt: "Dificuldade moderada", label_en: "Moderate difficulty" },
  { value: 3, label_pt: "Pouca dificuldade", label_en: "A little bit of difficulty" },
  { value: 4, label_pt: "Nenhuma dificuldade", label_en: "No difficulty" },
];

const lefs8Questions: QuestionnaireQuestion[] = [
  { id: "lefs8_1", subscale: "function", text_pt: "Agachar-se", text_en: "Squatting", options: LIKERT_5_LEFS },
  { id: "lefs8_2", subscale: "function", text_pt: "Correr", text_en: "Running", options: LIKERT_5_LEFS },
  { id: "lefs8_3", subscale: "function", text_pt: "Caminhar 2 quarteirões", text_en: "Walking 2 blocks", options: LIKERT_5_LEFS },
  { id: "lefs8_4", subscale: "function", text_pt: "Subir 10 degraus de escada", text_en: "Going up 10 stairs", options: LIKERT_5_LEFS },
  { id: "lefs8_5", subscale: "function", text_pt: "Ficar em pé por 1 hora", text_en: "Standing for 1 hour", options: LIKERT_5_LEFS },
  { id: "lefs8_6", subscale: "function", text_pt: "Entrar e sair do carro", text_en: "Getting in or out of a car", options: LIKERT_5_LEFS },
  { id: "lefs8_7", subscale: "function", text_pt: "Subir e descer calçada/meio-fio", text_en: "Going up or down curbs", options: LIKERT_5_LEFS },
  { id: "lefs8_8", subscale: "activity", text_pt: "Realizar suas atividades habituais de vida diária", text_en: "Performing your usual hobbies or daily activities", options: LIKERT_5_LEFS },
];

// =============================================
// Questionnaire definitions
// =============================================

export const questionnaires: QuestionnaireDefinition[] = [
  {
    id: "odi",
    name: "ODI",
    fullName_pt: "Índice de Incapacidade de Oswestry",
    fullName_en: "Oswestry Disability Index",
    description_pt: "Avalia como a dor nas costas afeta sua capacidade de realizar atividades do dia a dia.",
    description_en: "Evaluates how back pain affects your ability to manage everyday activities.",
    reference: "Fairbank JCT, Pynsent PB. The Oswestry Disability Index. Spine. 2000;25(22):2940-2953.",
    regionMapping: [
      // Ids reais do mapa de dor (frente/costas/laterais) + aliases legados.
      "lower_back", "upper_back", "sacral",
      "lumbar_left", "lumbar_right",
      "thoracic", "thoracic_left", "thoracic_right",
      "sacrum", "left_sij", "right_sij",
      "right_gluteal", "left_gluteal",
    ],

    scoringDirection: "higher_worse",
    subscaleLabels: {
      pain_intensity: { pt: "Intensidade da Dor", en: "Pain Intensity" },
      personal_care: { pt: "Cuidados Pessoais", en: "Personal Care" },
      lifting: { pt: "Levantar Objetos", en: "Lifting" },
      walking: { pt: "Caminhar", en: "Walking" },
      sitting: { pt: "Sentar", en: "Sitting" },
      standing: { pt: "Ficar em Pé", en: "Standing" },
      sleeping: { pt: "Dormir", en: "Sleeping" },
      social_life: { pt: "Vida Social", en: "Social Life" },
      traveling: { pt: "Deslocamento", en: "Travelling" },
      employment: { pt: "Atividades Diárias", en: "Daily Activities" },
    },
    questions: odiQuestions,
    interpretation: [
      { min: 0, max: 20, label_pt: "Incapacidade mínima", label_en: "Minimal disability", severity: "minimal" },
      { min: 21, max: 40, label_pt: "Incapacidade moderada", label_en: "Moderate disability", severity: "moderate" },
      { min: 41, max: 60, label_pt: "Incapacidade severa", label_en: "Severe disability", severity: "severe" },
      { min: 61, max: 80, label_pt: "Incapacidade muito severa", label_en: "Crippling disability", severity: "extreme" },
      { min: 81, max: 100, label_pt: "Acamado ou exagerando sintomas", label_en: "Bed-bound or exaggerating", severity: "extreme" },
    ],
  },
  {
    id: "spadi",
    name: "SPADI",
    fullName_pt: "Índice de Dor e Incapacidade do Ombro",
    fullName_en: "Shoulder Pain and Disability Index",
    description_pt: "Avalia a dor e a dificuldade funcional relacionadas ao seu ombro.",
    description_en: "Evaluates pain and functional difficulty related to your shoulder.",
    reference: "Roach KE, et al. Development of a shoulder pain and disability index. Arthritis Care Res. 1991;4(4):143-9.",
    regionMapping: [
      "right_shoulder", "left_shoulder",
      "right_shoulder_back", "left_shoulder_back",
      "shoulder_side", "shoulder_left", "shoulder_right",
    ],
    scoringDirection: "higher_worse",
    subscaleLabels: {
      pain: { pt: "Dor", en: "Pain" },
      disability: { pt: "Incapacidade Funcional", en: "Disability" },
    },
    questions: spadiQuestions,
    interpretation: [
      { min: 0, max: 20, label_pt: "Disfunção mínima", label_en: "Minimal dysfunction", severity: "minimal" },
      { min: 21, max: 40, label_pt: "Disfunção leve", label_en: "Mild dysfunction", severity: "mild" },
      { min: 41, max: 60, label_pt: "Disfunção moderada", label_en: "Moderate dysfunction", severity: "moderate" },
      { min: 61, max: 80, label_pt: "Disfunção severa", label_en: "Severe dysfunction", severity: "severe" },
      { min: 81, max: 100, label_pt: "Disfunção extrema", label_en: "Extreme dysfunction", severity: "extreme" },
    ],
  },
  {
    id: "koos",
    name: "KOOS",
    fullName_pt: "Escore de Lesão e Osteoartrite do Joelho",
    fullName_en: "Knee Injury and Osteoarthritis Outcome Score",
    description_pt: "Avalia dor, sintomas, função e qualidade de vida relacionados ao seu joelho.",
    description_en: "Evaluates pain, symptoms, function and quality of life related to your knee.",
    reference: "Roos EM, et al. Knee Injury and Osteoarthritis Outcome Score (KOOS). J Orthop Sports Phys Ther. 1998;28(2):88-96.",
    regionMapping: [
      "right_knee", "left_knee",
      "right_knee_back", "left_knee_back",
      "knee_side", "knee_left", "knee_right",
      "right_shin", "left_shin",
      "right_thigh", "left_thigh",
    ],
    scoringDirection: "higher_better",
    subscaleLabels: {
      pain: { pt: "Dor", en: "Pain" },
      symptoms: { pt: "Sintomas", en: "Symptoms" },
      adl: { pt: "Atividades Diárias", en: "Daily Living" },
      sport: { pt: "Esporte e Recreação", en: "Sport & Recreation" },
      qol: { pt: "Qualidade de Vida", en: "Quality of Life" },
    },
    questions: koosQuestions,
    interpretation: [
      { min: 75, max: 100, label_pt: "Função normal ou quase normal", label_en: "Normal or near-normal function", severity: "minimal" },
      { min: 50, max: 74, label_pt: "Disfunção leve a moderada", label_en: "Mild to moderate dysfunction", severity: "moderate" },
      { min: 25, max: 49, label_pt: "Disfunção moderada a severa", label_en: "Moderate to severe dysfunction", severity: "severe" },
      { min: 0, max: 24, label_pt: "Disfunção severa", label_en: "Severe dysfunction", severity: "extreme" },
    ],
  },
  {
    id: "hoos",
    name: "HOOS",
    fullName_pt: "Escore de Resultado do Quadril",
    fullName_en: "Hip Disability and Osteoarthritis Outcome Score",
    description_pt: "Avalia dor, sintomas, função e qualidade de vida relacionados ao seu quadril.",
    description_en: "Evaluates pain, symptoms, function and quality of life related to your hip.",
    reference: "Klassbo M, et al. Hip disability and osteoarthritis outcome score. An extension of the Western Ontario and McMaster Universities Osteoarthritis Index. Scand J Rheumatol. 2003;32(1):46-51.",
    regionMapping: [
      "right_hip", "left_hip",
      "right_gluteal", "left_gluteal",
      "hip_side", "hip_left", "hip_right",
    ],
    scoringDirection: "higher_better",
    subscaleLabels: {
      symptoms: { pt: "Sintomas", en: "Symptoms" },
      stiffness: { pt: "Rigidez", en: "Stiffness" },
      pain: { pt: "Dor", en: "Pain" },
      adl: { pt: "Atividades Diárias", en: "Daily Living" },
      sport: { pt: "Esporte e Recreação", en: "Sport & Recreation" },
      qol: { pt: "Qualidade de Vida", en: "Quality of Life" },
    },
    questions: hoosQuestions,
    interpretation: [
      { min: 75, max: 100, label_pt: "Função normal ou quase normal", label_en: "Normal or near-normal function", severity: "minimal" },
      { min: 50, max: 74, label_pt: "Disfunção leve a moderada", label_en: "Mild to moderate dysfunction", severity: "moderate" },
      { min: 25, max: 49, label_pt: "Disfunção moderada a severa", label_en: "Moderate to severe dysfunction", severity: "severe" },
      { min: 0, max: 24, label_pt: "Disfunção severa", label_en: "Severe dysfunction", severity: "extreme" },
    ],
  },
  {
    id: "faos",
    name: "FAOS",
    fullName_pt: "Escore de Resultado do Pé e Tornozelo",
    fullName_en: "Foot and Ankle Outcome Score",
    description_pt: "Avalia dor, sintomas, função e qualidade de vida relacionados ao seu pé/tornozelo.",
    description_en: "Evaluates pain, symptoms, function and quality of life related to your foot/ankle.",
    reference: "Roos EM, et al. Foot and Ankle Outcome Score (FAOS). Foot Ankle Int. 2001;22(10):788-94.",
    regionMapping: [
      "right_ankle", "left_ankle",
      "right_foot", "left_foot",
      "right_ankle_back", "left_ankle_back",
      "right_foot_back", "left_foot_back",
      "foot_side", "ankle_left", "ankle_right", "foot_left", "foot_right",
    ],
    scoringDirection: "higher_better",
    subscaleLabels: {
      symptoms: { pt: "Sintomas", en: "Symptoms" },
      stiffness: { pt: "Rigidez", en: "Stiffness" },
      pain: { pt: "Dor", en: "Pain" },
      adl: { pt: "Atividades Diárias", en: "Daily Living" },
      sport: { pt: "Esporte e Recreação", en: "Sport & Recreation" },
      qol: { pt: "Qualidade de Vida", en: "Quality of Life" },
    },
    questions: faosQuestions,
    interpretation: [
      { min: 75, max: 100, label_pt: "Função normal ou quase normal", label_en: "Normal or near-normal function", severity: "minimal" },
      { min: 50, max: 74, label_pt: "Disfunção leve a moderada", label_en: "Mild to moderate dysfunction", severity: "moderate" },
      { min: 25, max: 49, label_pt: "Disfunção moderada a severa", label_en: "Moderate to severe dysfunction", severity: "severe" },
      { min: 0, max: 24, label_pt: "Disfunção severa", label_en: "Severe dysfunction", severity: "extreme" },
    ],
  },
  {
    id: "visa_a",
    name: "VISA-A",
    fullName_pt: "Avaliação do Instituto Vitoriano de Esportes - Aquiles",
    fullName_en: "Victorian Institute of Sport Assessment - Achilles",
    description_pt: "Avalia a gravidade e o impacto funcional da tendinopatia do tendão de Aquiles.",
    description_en: "Evaluates the severity and functional impact of Achilles tendinopathy.",
    reference: "Robinson JM, et al. The VISA-A questionnaire: a valid and reliable index of the clinical severity of Achilles tendinopathy. Br J Sports Med. 2001;35(5):335-41.",
    regionMapping: [
      "right_achilles", "left_achilles",
      "right_heel", "left_heel",
    ],
    scoringDirection: "higher_better",
    subscaleLabels: {
      pain: { pt: "Dor e Rigidez", en: "Pain & Stiffness" },
      function: { pt: "Função", en: "Function" },
      activity: { pt: "Atividade", en: "Activity" },
    },
    questions: visaAQuestions,
    interpretation: [
      { min: 80, max: 100, label_pt: "Função excelente", label_en: "Excellent function", severity: "minimal" },
      { min: 60, max: 79, label_pt: "Disfunção leve", label_en: "Mild dysfunction", severity: "mild" },
      { min: 40, max: 59, label_pt: "Disfunção moderada", label_en: "Moderate dysfunction", severity: "moderate" },
      { min: 20, max: 39, label_pt: "Disfunção severa", label_en: "Severe dysfunction", severity: "severe" },
      { min: 0, max: 19, label_pt: "Disfunção muito severa", label_en: "Very severe dysfunction", severity: "extreme" },
    ],
  },
  // 7. QuickDASH
  {
    id: "quickdash",
    name: "QuickDASH",
    fullName_pt: "Incapacidades do Braço, Ombro e Mão (versão rápida)",
    fullName_en: "Quick Disabilities of the Arm, Shoulder and Hand",
    description_pt: "Avalia a dificuldade funcional e sintomas no membro superior (cotovelo, antebraço, punho, mão).",
    description_en: "Evaluates functional difficulty and symptoms in the upper extremity (elbow, forearm, wrist, hand).",
    reference: "Beaton DE, et al. J Bone Joint Surg Am. 2005;87(5):1038-46.",
    regionMapping: [
      "right_elbow", "left_elbow", "right_elbow_back", "left_elbow_back", "elbow_left", "elbow_right",
      "right_forearm", "left_forearm", "right_forearm_back", "left_forearm_back", "forearm_left", "forearm_right",
      "right_hand", "left_hand", "right_hand_back", "left_hand_back", "hand_left", "hand_right",
      "right_arm", "left_arm", "right_arm_back", "left_arm_back", "arm_left", "arm_right",
    ],
    scoringDirection: "higher_worse",
    subscaleLabels: {
      daily_activities: { pt: "Atividades Diárias", en: "Daily Activities" },
      symptoms: { pt: "Sintomas", en: "Symptoms" },
      social_impact: { pt: "Impacto Social", en: "Social Impact" },
    },
    questions: quickdashQuestions,
    interpretation: [
      { min: 0, max: 20, label_pt: "Incapacidade mínima", label_en: "Minimal disability", severity: "minimal" },
      { min: 21, max: 40, label_pt: "Incapacidade leve", label_en: "Mild disability", severity: "mild" },
      { min: 41, max: 60, label_pt: "Incapacidade moderada", label_en: "Moderate disability", severity: "moderate" },
      { min: 61, max: 80, label_pt: "Incapacidade severa", label_en: "Severe disability", severity: "severe" },
      { min: 81, max: 100, label_pt: "Incapacidade extrema", label_en: "Extreme disability", severity: "extreme" },
    ],
  },
  // 8. NDI
  {
    id: "ndi",
    name: "NDI",
    fullName_pt: "Índice de Incapacidade do Pescoço",
    fullName_en: "Neck Disability Index",
    description_pt: "Avalia como a dor cervical afeta sua capacidade de realizar atividades do dia a dia.",
    description_en: "Evaluates how neck pain affects your ability to manage everyday activities.",
    reference: "Vernon H, Mior S. J Manipulative Physiol Ther. 1991;14(7):409-15.",
    regionMapping: [
      "cervical", "cervical_front", "cervical_left", "cervical_right",
      "cervical_back",
      "head", "head_back", "head_left", "head_right",
    ],
    scoringDirection: "higher_worse",
    subscaleLabels: {
      pain_intensity: { pt: "Intensidade da Dor", en: "Pain Intensity" },
      personal_care: { pt: "Cuidados Pessoais", en: "Personal Care" },
      lifting: { pt: "Levantar Objetos", en: "Lifting" },
      reading: { pt: "Leitura", en: "Reading" },
      headache: { pt: "Dor de Cabeça", en: "Headaches" },
      concentration: { pt: "Concentração", en: "Concentration" },
      work: { pt: "Trabalho", en: "Work" },
      driving: { pt: "Dirigir", en: "Driving" },
      sleeping: { pt: "Dormir", en: "Sleeping" },
      recreation: { pt: "Recreação", en: "Recreation" },
    },
    questions: ndiQuestions,
    interpretation: [
      { min: 0, max: 8, label_pt: "Sem incapacidade", label_en: "No disability", severity: "minimal" },
      { min: 9, max: 28, label_pt: "Incapacidade leve", label_en: "Mild disability", severity: "mild" },
      { min: 29, max: 48, label_pt: "Incapacidade moderada", label_en: "Moderate disability", severity: "moderate" },
      { min: 49, max: 68, label_pt: "Incapacidade severa", label_en: "Severe disability", severity: "severe" },
      { min: 69, max: 100, label_pt: "Incapacidade completa", label_en: "Complete disability", severity: "extreme" },
    ],
  },
  // 9. HIT-6
  {
    id: "hit6",
    name: "HIT-6",
    fullName_pt: "Teste de Impacto da Cefaleia",
    fullName_en: "Headache Impact Test",
    description_pt: "Avalia o impacto das dores de cabeça no seu dia a dia, trabalho e atividades sociais.",
    description_en: "Measures the impact headaches have on your daily life, work and social activities.",
    reference: "Kosinski M, et al. Qual Life Res. 2003;12(8):963-74.",
    regionMapping: [
      "head", "head_back", "head_left", "head_right",
    ],
    scoringDirection: "higher_worse",
    subscaleLabels: {
      impact: { pt: "Impacto", en: "Impact" },
    },
    questions: hit6Questions,
    interpretation: [
      { min: 0, max: 25, label_pt: "Pouco ou nenhum impacto", label_en: "Little or no impact", severity: "minimal" },
      { min: 26, max: 50, label_pt: "Algum impacto", label_en: "Some impact", severity: "mild" },
      { min: 51, max: 75, label_pt: "Impacto substancial", label_en: "Substantial impact", severity: "moderate" },
      { min: 76, max: 100, label_pt: "Impacto severo", label_en: "Severe impact", severity: "severe" },
    ],
  },
  // 10. LEFS-8
  {
    id: "lefs8",
    name: "LEFS-8",
    fullName_pt: "Escala Funcional de Membro Inferior (versão curta)",
    fullName_en: "Lower Extremity Functional Scale (Short Form)",
    description_pt: "Avalia sua capacidade funcional de membro inferior em atividades do dia a dia.",
    description_en: "Evaluates your lower extremity functional ability in daily activities.",
    reference: "Mehta SP, et al. Phys Ther. 2016;96(7):1014-24.",
    regionMapping: [
      "right_thigh_ant", "left_thigh_ant", "right_thigh_post", "left_thigh_post",
      "thigh_left", "thigh_right",
      "right_calf", "left_calf", "right_shin", "left_shin",
      "shin_left", "shin_right",
    ],
    scoringDirection: "higher_better",
    subscaleLabels: {
      function: { pt: "Função", en: "Function" },
      activity: { pt: "Atividade", en: "Activity" },
    },
    questions: lefs8Questions,
    interpretation: [
      { min: 75, max: 100, label_pt: "Função normal ou quase normal", label_en: "Normal or near-normal function", severity: "minimal" },
      { min: 50, max: 74, label_pt: "Disfunção leve a moderada", label_en: "Mild to moderate dysfunction", severity: "moderate" },
      { min: 25, max: 49, label_pt: "Disfunção moderada a severa", label_en: "Moderate to severe dysfunction", severity: "severe" },
      { min: 0, max: 24, label_pt: "Disfunção severa", label_en: "Severe dysfunction", severity: "extreme" },
    ],
  },
];

// =============================================
// Utility functions
// =============================================

export function getApplicableQuestionnaires(painRegions: string[]): QuestionnaireDefinition[] {
  const seen = new Set<string>();
  const result: QuestionnaireDefinition[] = [];

  for (const q of questionnaires) {
    if (seen.has(q.id)) continue;
    if (q.regionMapping.some((r) => painRegions.includes(r))) {
      seen.add(q.id);
      result.push(q);
    }
  }

  return result;
}

export function calculateQuestionnaireScore(
  questionnaire: QuestionnaireDefinition,
  answers: Record<string, number>
): QuestionnaireResult {
  const answeredQuestions = questionnaire.questions.filter((q) => answers[q.id] !== undefined);

  if (answeredQuestions.length === 0) {
    return {
      questionnaireId: questionnaire.id,
      questionnaireName: questionnaire.name,
      answers,
      subscaleScores: {},
      totalScore: 0,
      maxScore: 0,
      percentageScore: 0,
      interpretation_pt: "",
      interpretation_en: "",
      severity: "minimal",
    };
  }

  // Calculate subscale scores
  const subscaleScores: Record<string, number> = {};
  const subscales = [...new Set(answeredQuestions.map((q) => q.subscale))];

  for (const subscale of subscales) {
    const subscaleQuestions = answeredQuestions.filter((q) => q.subscale === subscale);
    const sum = subscaleQuestions.reduce((acc, q) => acc + (answers[q.id] ?? 0), 0);

    if (questionnaire.id === "odi" || questionnaire.id === "ndi") {
      // ODI/NDI: each item 0-5, percentage = sum / (items * 5) * 100
      subscaleScores[subscale] = Math.round((answers[subscaleQuestions[0].id] ?? 0) / 5 * 100);
    } else if (questionnaire.id === "psfs") {
      // PSFS: 0-10 ability per activity, mean × 10 → 0-100 (higher better)
      subscaleScores[subscale] = Math.round((sum / subscaleQuestions.length) * 10);
    } else if (questionnaire.id === "spadi") {
      // SPADI: each item 0-10
      const maxPossible = subscaleQuestions.length * 10;
      subscaleScores[subscale] = Math.round((sum / maxPossible) * 100);
    } else if (questionnaire.id === "visa_a") {
      // VISA-A: raw sum already represents score (max varies per question)
      const maxMap: Record<string, number> = { pain: 40, function: 20, activity: 40 };
      const maxPossible = maxMap[subscale] || subscaleQuestions.length * 10;
      subscaleScores[subscale] = Math.round((sum / maxPossible) * 100);
    } else if (questionnaire.id === "quickdash") {
      // QuickDASH: ((sum/n) - 1) * 25
      subscaleScores[subscale] = Math.round(((sum / subscaleQuestions.length) - 1) * 25);
    } else if (questionnaire.id === "hit6") {
      // HIT-6: single subscale, raw 36-78 → normalized later; per-subscale just show raw %
      subscaleScores[subscale] = Math.round(((sum - (subscaleQuestions.length * 6)) / (subscaleQuestions.length * 7)) * 100);
    } else if (questionnaire.id === "lefs8") {
      // LEFS-8: higher_better, 0-4 Likert → (sum / (n*4)) * 100
      const maxPossible = subscaleQuestions.length * 4;
      subscaleScores[subscale] = Math.round((sum / maxPossible) * 100);
    } else {
      // KOOS/HOOS/FAOS: 0-4 Likert, score = 100 - (sum / (items * 4) * 100)
      const maxPossible = subscaleQuestions.length * 4;
      subscaleScores[subscale] = Math.round(100 - (sum / maxPossible) * 100);
    }
  }

  // Calculate total score
  let percentageScore: number;

  if (questionnaire.id === "odi" || questionnaire.id === "ndi") {
    const totalSum = answeredQuestions.reduce((acc, q) => acc + (answers[q.id] ?? 0), 0);
    const maxPossible = answeredQuestions.length * 5;
    percentageScore = Math.round((totalSum / maxPossible) * 100);
  } else if (questionnaire.id === "visa_a") {
    const totalSum = answeredQuestions.reduce((acc, q) => acc + (answers[q.id] ?? 0), 0);
    percentageScore = Math.min(Math.round(totalSum), 100);
  } else if (questionnaire.id === "spadi") {
    const subscalePercentages = Object.values(subscaleScores);
    percentageScore = Math.round(subscalePercentages.reduce((a, b) => a + b, 0) / subscalePercentages.length);
  } else if (questionnaire.id === "quickdash") {
    // QuickDASH: ((sum/n) - 1) * 25
    const totalSum = answeredQuestions.reduce((acc, q) => acc + (answers[q.id] ?? 0), 0);
    percentageScore = Math.round(((totalSum / answeredQuestions.length) - 1) * 25);
  } else if (questionnaire.id === "hit6") {
    // HIT-6: raw 36-78 → ((raw-36)/42)*100
    const totalSum = answeredQuestions.reduce((acc, q) => acc + (answers[q.id] ?? 0), 0);
    percentageScore = Math.round(((totalSum - 36) / 42) * 100);
  } else if (questionnaire.id === "psfs") {
    const totalSum = answeredQuestions.reduce((acc, q) => acc + (answers[q.id] ?? 0), 0);
    percentageScore = Math.round((totalSum / answeredQuestions.length) * 10);
  } else if (questionnaire.id === "lefs8") {
    // LEFS-8: (sum / 32) * 100
    const totalSum = answeredQuestions.reduce((acc, q) => acc + (answers[q.id] ?? 0), 0);
    percentageScore = Math.round((totalSum / (answeredQuestions.length * 4)) * 100);
  } else {
    // KOOS/HOOS/FAOS: average of all subscale scores
    const subscaleValues = Object.values(subscaleScores);
    percentageScore = Math.round(subscaleValues.reduce((a, b) => a + b, 0) / subscaleValues.length);
  }

  // Find interpretation
  const interp = questionnaire.interpretation.find(
    (i) => percentageScore >= i.min && percentageScore <= i.max
  ) || questionnaire.interpretation[questionnaire.interpretation.length - 1];

  return {
    questionnaireId: questionnaire.id,
    questionnaireName: questionnaire.name,
    answers,
    subscaleScores,
    totalScore: answeredQuestions.reduce((acc, q) => acc + (answers[q.id] ?? 0), 0),
    maxScore: answeredQuestions.length * (
      questionnaire.id === "odi" || questionnaire.id === "ndi" ? 5 :
      questionnaire.id === "spadi" || questionnaire.id === "psfs" ? 10 :
      questionnaire.id === "quickdash" ? 5 :
      questionnaire.id === "hit6" ? 13 :
      4
    ),
    percentageScore,
    interpretation_pt: interp.label_pt,
    interpretation_en: interp.label_en,
    severity: interp.severity,
  };
}

// =============================================
// Preventive (no current pain) — functional subscales only
// =============================================

/** Questionnaires whose ADL/function items stand alone without the pain items.
 *  ODI, NDI, VISA-A and HIT-6 frame every item around pain/headache, so they
 *  are never applied in preventive mode (no invented adapted score). */
const FUNCTIONAL_ONLY_ALLOWED = new Set(["spadi", "koos", "hoos", "faos", "quickdash", "lefs8"]);

export function toFunctionalOnly(q: QuestionnaireDefinition): QuestionnaireDefinition | null {
  if (!FUNCTIONAL_ONLY_ALLOWED.has(q.id)) return null;
  const questions = q.questions.filter((it) => it.subscale !== "pain");
  if (!questions.length) return null;
  return { ...q, name: `${q.name} · funcional`, questions };
}

const PSFS_SCALE: QuestionOption[] = Array.from({ length: 11 }, (_, v) => ({
  value: v,
  label_pt: v === 0 ? "0 – Incapaz" : v === 10 ? "10 – Como antes" : String(v),
  label_en: v === 0 ? "0 – Unable" : v === 10 ? "10 – Pre-injury level" : String(v),
}));

/** PSFS — Patient-Specific Functional Scale. Function/limitation only, no pain
 *  items. Validated for low back (Stratford 1995) and neck (Westaway 1998).
 *  Used ONLY in preventive/follow-up mode for spine attention regions. */
export const psfsQuestionnaire: QuestionnaireDefinition = {
  id: "psfs",
  name: "PSFS",
  fullName_pt: "Escala Funcional Específica do Paciente (PSFS)",
  fullName_en: "Patient-Specific Functional Scale (PSFS)",
  description_pt: "Escreva até 3 atividades do dia a dia que você tem dificuldade ou quer proteger (ex.: carregar peso, ficar sentado muito tempo, correr) e dê uma nota para sua capacidade de fazer cada uma.",
  description_en: "Write up to 3 daily activities you find difficult or want to protect and rate your ability to perform each one.",
  reference: "Stratford P, et al. Physiother Can. 1995;47:258-63; Westaway MD, et al. JOSPT. 1998;27(5):331-8.",
  regionMapping: [
    "lower_back", "upper_back", "sacral", "lumbar_left", "lumbar_right",
    "thoracic", "thoracic_left", "thoracic_right", "sacrum",
    "cervical", "cervical_front", "cervical_left", "cervical_right", "cervical_back",
  ],
  scoringDirection: "higher_better",
  subscaleLabels: { activities: { pt: "Atividades do dia a dia", en: "Daily activities" } },
  questions: [1, 2, 3].map((n) => ({
    id: `psfs_${n}`, subscale: "activities",
    text_pt: `Atividade ${n}${n > 1 ? " (opcional)" : ""}: quão capaz você é de realizá-la hoje?`,
    text_en: `Activity ${n}${n > 1 ? " (optional)" : ""}: how able are you to perform it today?`,
    options: PSFS_SCALE,
  })),
  interpretation: [
    { min: 80, max: 100, label_pt: "Boa capacidade nas atividades escolhidas", label_en: "Good ability in the chosen activities", severity: "minimal" },
    { min: 60, max: 79, label_pt: "Limitação leve nas atividades escolhidas", label_en: "Mild limitation in the chosen activities", severity: "mild" },
    { min: 40, max: 59, label_pt: "Limitação moderada nas atividades escolhidas", label_en: "Moderate limitation", severity: "moderate" },
    { min: 0, max: 39, label_pt: "Limitação importante nas atividades escolhidas", label_en: "Marked limitation", severity: "severe" },
  ],
};

export function getFunctionalQuestionnaires(regions: string[]): QuestionnaireDefinition[] {
  const list = getApplicableQuestionnaires(regions)
    .map(toFunctionalOnly)
    .filter((q): q is QuestionnaireDefinition => !!q);
  if (psfsQuestionnaire.regionMapping.some((r) => regions.includes(r))) list.push(psfsQuestionnaire);
  return list;
}
