// Mock case used by the Manual Assessment modal when running in demo mode.
// Cenário: lombalgia mecânica crônica em trabalhador de escritório, sem red flags.
// Os campos imitam o estado interno do `ManualAssessmentModal` para que cada
// clique em um campo possa "preencher" como se o fisio tivesse digitado.

export const MOCK_MANUAL_CASE = {
  // Anamnese
  chiefComplaint:
    "Dor lombar mecânica há 6 semanas, piora ao final do expediente e ao levantar de cadeira após longos períodos sentado.",
  history:
    "Paciente analista administrativo, trabalha 9h/dia sentado, sem atividade física regular nos últimos 8 meses. Refere início insidioso após mudança para home office. Já realizou 2 sessões de massagem, com alívio temporário (24-48h).",
  duration: "6 semanas",
  onset: "gradual",
  aggravating:
    "Permanência sentado >40 min, flexão de tronco para calçar sapatos, varrer/aspirar.",
  relieving:
    "Caminhar leve por 5-10 min, calor local, dipirona 1g (alívio parcial).",
  medications: "Dipirona 1g SOS (2-3x/semana). Nega uso contínuo.",
  previousSurgeries: "Nega cirurgias prévias.",
  comorbidities: "Sobrepeso (IMC 27,4). Nega HAS/DM.",
  occupation: "Analista administrativo (home office, ~9h/dia sentado).",

  // Dor & mapa
  painScore: 6,
  painType: "local",
  painRegions: ["lower_back", "gluteal_right"],

  // Red flags
  redFlagsChecked: [] as string[],

  // Mobilidade articular (ADM)
  romTable: [
    { joint: "Flexão lombar", leftValue: "40°", rightValue: "40°" },
    { joint: "Extensão lombar", leftValue: "15°", rightValue: "15°" },
    { joint: "Rotação de tronco", leftValue: "25°", rightValue: "30°" },
    { joint: "Flexão de quadril", leftValue: "100°", rightValue: "110°" },
    { joint: "Abdução de quadril", leftValue: "30°", rightValue: "38°" },
  ],

  // Testes funcionais (texto livre)
  functionalTests:
    "- ADM lombar: flexão limitada (~50% do esperado), reproduz dor no terço final.\n- Extensão lombar: dolorosa em amplitude máxima, sem irradiação.\n- Slump test: negativo bilateral.\n- Lasègue: negativo bilateral (0-70°).\n- Força MMII: grau 5 simétrico.\n- Glúteo médio (Trendelenburg): positivo à direita.\n- Teste de prancha frontal: 28s (abaixo do esperado para idade/sexo).\n- Mobilidade de quadril (FABER): leve restrição à direita, sem dor.",

  // Impressão & diagnóstico
  clinicalImpression:
    "Quadro compatível com lombalgia mecânica inespecífica de padrão postural, com déficit de controle motor lombo-pélvico e fraqueza de glúteo médio direito. Sem sinais neurológicos ou de bandeira vermelha. Bom prognóstico com reeducação postural, fortalecimento progressivo e ajuste ergonômico.",
  diagnosisText:
    "Hipótese: Lombalgia mecânica crônica inespecífica com déficit de controle motor lombo-pélvico.\n\nResumo: Dor lombar de padrão mecânico, agravada por postura sentada prolongada e aliviada pelo movimento, sem sinais radiculares ou bandeiras vermelhas. Achados compatíveis: fraqueza de glúteo médio direito, restrição de flexão lombar e baixa endurance de core.\n\nRaciocínio (D.I.F.I): Pain → dor mecânica local; Inhibition → glúteo médio D; Weakness → core/glúteos; Disability → permanência sentada e tarefas em flexão.",

  // Questionários: respostas mock por questionnaireId -> questionId -> value
  // Os valores foram escolhidos para refletir limitação funcional leve-moderada
  // típica do caso (Roland-Morris / ODI baixo-moderado).
  questionnaireAnswers: {
    // Roland-Morris (rm): cada pergunta é binária 0/1, escolher ~7 itens positivos
    rm: Object.fromEntries(
      Array.from({ length: 24 }, (_, i) => [
        `rm_${i + 1}`,
        [1, 3, 5, 8, 12, 15, 19].includes(i + 1) ? 1 : 0,
      ]),
    ) as Record<string, number>,
    // Oswestry (odi): 10 itens, escala 0-5, valor médio 2
    odi: Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`odi_${i + 1}`, 2]),
    ) as Record<string, number>,
    // Neck Disability Index (ndi)
    ndi: Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`ndi_${i + 1}`, 1]),
    ) as Record<string, number>,
    // SPADI
    spadi: Object.fromEntries(
      Array.from({ length: 13 }, (_, i) => [`spadi_${i + 1}`, 3]),
    ) as Record<string, number>,
  } as Record<string, Record<string, number>>,

  // Voice recorder (simulação)
  voiceTranscript:
    "Paciente do sexo masculino, 38 anos, refere dor lombar há cerca de seis semanas, com piora progressiva. Trabalha sentado em home office, em média nove horas por dia. A dor é descrita como peso e fisgada na região lombar baixa, irradiando levemente para o glúteo direito. Piora ao final do dia, ao se levantar de cadeira após longos períodos. Alivia parcialmente caminhando e com compressa quente. Já fez massagem com alívio temporário. Nega febre, perda de peso, alteração esfincteriana, dor noturna intensa ou trauma. Sem cirurgias prévias. Faz uso eventual de dipirona um grama.",
  voiceSummary: {
    chiefComplaint: "Dor lombar há ~6 semanas, padrão mecânico",
    painHistory:
      "Início insidioso pós home office; piora ao final do dia e levantar de cadeira",
    aggravatingFactors: ["Sentado >40min", "Levantar de cadeira", "Tarefas em flexão"],
    relievingFactors: ["Caminhada leve", "Calor local", "Dipirona"],
    previousTreatments: "Massagem (alívio temporário)",
    functionalImpact:
      "Limitação para permanecer sentado durante a jornada de trabalho",
    redFlagsHints: [] as string[],
    observations:
      "Sobrepeso, sedentário há 8 meses, sem sinais neurológicos relatados",
  },
};

export type MockManualCase = typeof MOCK_MANUAL_CASE;
