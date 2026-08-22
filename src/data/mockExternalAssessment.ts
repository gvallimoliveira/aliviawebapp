/**
 * Mock determinístico para simular a interpretação por IA de uma avaliação
 * externa no modo demo. Reflete o shape retornado pela edge function
 * `interpret-external-assessment`.
 */
export const MOCK_EXTERNAL_INTERPRETATION = {
  interpretable: true,
  unreadableReason: null,
  patientName: "Maria Souza (externa)",
  chiefComplaint: "Dor no ombro direito há 3 meses, com limitação para atividades acima da cabeça.",
  additionalComplaint: "Refere desconforto noturno ao deitar sobre o lado direito.",
  history: "Início insidioso, sem trauma. Trabalha como cabeleireira (atividade repetitiva com MMSS elevados).",
  onset: "insidioso",
  duration: "3 meses",
  aggravatingFactors: "Elevação acima de 90°, dormir sobre o ombro afetado.",
  relievingFactors: "Repouso, AINE.",
  medications: "Ibuprofeno 600mg conforme necessário.",
  previousSurgeries: "",
  comorbidities: "Hipertensão controlada.",
  occupation: "Cabeleireira",
  complementaryExams: "USG (avaliação externa, datada 10/2025): tendinopatia do supraespinhal sem rotura. Bursite subacromial discreta.",
  painScore: 6,
  painType: "mecânica",
  painRegions: ["right_shoulder"],
  painScoresPerRegion: { right_shoulder: 6 },
  painRegionRefinements: { right_shoulder: ["lateral", "anterior"] },
  redFlags: [],
  additionalClinicalNotes: "Teste de Neer e Hawkins positivos descritos na avaliação externa.",
  romTable: [
    { joint: "Ombro – Flexão", leftValue: "180°", rightValue: "140° (dor)" },
    { joint: "Ombro – Abdução", leftValue: "180°", rightValue: "120° (arco doloroso)" },
    { joint: "Ombro – RE", leftValue: "90°", rightValue: "70°" },
  ],
  strengthTable: [
    { movement: "Abdução do ombro", leftValue: "12 kgf", rightValue: "8 kgf" },
    { movement: "Rotação externa", leftValue: "9 kgf", rightValue: "6 kgf" },
  ],
  functionalTests: "- Neer: positivo à direita\n- Hawkins-Kennedy: positivo à direita\n- Jobe: dor com leve fraqueza",
  questionnaireResults: [
    { name: "DASH", score: "42/100", interpretation: "Incapacidade moderada do MS" },
  ],
  diagnosis: {
    hypothesis: "Tendinopatia do supraespinhal com bursite subacromial associada",
    summary: "Paciente cabeleireira com quadro álgico crônico em ombro direito, padrão mecânico, com sinais clínicos e ultrassonográficos compatíveis com síndrome do impacto subacromial / tendinopatia do supraespinhal.",
    reasoning: "Combinação de exposição ocupacional sustentada com MMSS elevados, arco doloroso, testes provocativos positivos e achado de imagem corrobora hipótese de tendinopatia degenerativa do manguito com componente inflamatório bursal.",
    confidence: "moderate",
  },
  clinicalImpression: {
    overview: "Paciente de meia-idade com quadro crônico de dor mecânica em ombro direito, déficit de mobilidade ativa, fraqueza do manguito e impacto funcional moderado (DASH 42).",
    therapeuticObjectives: ["controle do quadro álgico", "fortalecimento"],
  },
  painMechanismScreening: {
    criteria: ["noc_movement_relation", "noc_rest_relief", "noc_localized"],
    suggestedSubtype: "mechanical",
    durationMonths: 3,
    csiScore: null as number | null,
    evidence: "Relato de dor mecânica que piora com elevação acima de 90° e alivia com repouso.",
  },
  additionalExternalInfo:
    "Avaliação externa realizada em clínica parceira em 10/2025. Profissional sugeriu 10 sessões de cinesioterapia + terapia manual. Paciente relatou já ter feito 3 sessões com pequena melhora antes de procurar nova opinião.",
  aiInterpretedFields: [
    "chiefComplaint", "history", "onset", "duration", "aggravatingFactors", "relievingFactors",
    "medications", "occupation", "complementaryExams", "painScore", "painType",
    "painRegions", "painScoresPerRegion", "painRegionRefinements", "additionalClinicalNotes",
    "romTable", "strengthTable", "functionalTests", "questionnaireResults",
    "diagnosis", "clinicalImpression", "additionalExternalInfo", "painMechanismScreening",
  ],
};

export type ExternalInterpretation = Omit<
  typeof MOCK_EXTERNAL_INTERPRETATION,
  "painMechanismScreening"
> & {
  painMechanismScreening?: {
    criteria?: string[];
    suggestedSubtype?: string | null;
    durationMonths?: number | null;
    csiScore?: number | null;
    evidence?: string | null;
  };
};
