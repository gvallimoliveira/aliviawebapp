/** Curated fictional scenarios, not treatment recommendations or clinical inference. */
export interface DemoLoadProfile {
  title: string;
  phase: string;
  step: 1 | 2 | 3 | 4 | 5 | 6;
  goal: string;
  sport: string | null;
  limb: string | null;
  pain: number;
  readiness: number;
  historyDays: number;
  sessions: { weekday: number; track: "physio" | "gym" | "sport"; title: string; minutes: number; rpe: number }[];
  /** Concurrent activities outside physio (pilates, gym, sport) the patient reports doing. */
  concurrent?: { weekday: number; track: "physio" | "gym" | "sport"; title: string; minutes: number; rpe: number }[];
  notes: string;
}

export const demoLoadProfiles: Record<string, DemoLoadProfile> = {
  "demo-001c": {
    title: "Manutenção funcional lombar", phase: "Manutenção e prevenção secundária", step: 6,
    goal: "Manter a autonomia e a atividade física regular após a alta funcional",
    sport: "Atividade física regular", limb: null, pain: 1, readiness: 8, historyDays: 70,
    sessions: [1, 3, 5].map(weekday => ({ weekday, track: "physio", title: "Manutenção domiciliar lombar", minutes: 25, rpe: 3 })),
    concurrent: [{ weekday: 2, track: "gym", title: "Pilates de solo (estúdio)", minutes: 50, rpe: 4 }, { weekday: 6, track: "sport", title: "Caminhada no parque", minutes: 45, rpe: 3 }],
    notes: "Alta funcional na última avaliação. Hipertensão controlada: manter acompanhamento e observar sintomas.",
  },
  "demo-002b": {
    title: "Reabordagem da dor patelofemoral", phase: "Controle de dor e retomada da adesão", step: 1,
    goal: "Reavaliar a tolerância, pactuar adesão e evitar retorno à corrida longa sem progressão",
    sport: "Corrida — retorno ainda não liberado", limb: "Joelho direito", pain: 7, readiness: 4, historyDays: 70,
    sessions: [1, 3, 5].map(weekday => ({ weekday, track: "physio", title: "Reavaliação e exercício de baixa demanda conforme tolerância", minutes: 20, rpe: 2 })),
    notes: "Piora, edema e abandono do HEP na última avaliação. Histórico de corrida excessiva é relato fictício; não representa dose recomendada.",
  },
  "demo-003b": {
    title: "Recuperação funcional cervical", phase: "Mobilidade e controle motor", step: 3,
    goal: "Trabalhar dor cervical residual e tolerância às atividades sem progressão automática",
    sport: "Atividade física leve", limb: null, pain: 4, readiness: 5, historyDays: 14,
    sessions: [2, 4].map(weekday => ({ weekday, track: "physio", title: "Mobilidade cervical e pausas ativas", minutes: 20, rpe: 2 })),
    concurrent: [{ weekday: 6, track: "gym", title: "Pilates leve (aparelhos)", minutes: 45, rpe: 3 }],
    notes: "Irradiação resolvida. Diabetes não controlado na triagem: requer avaliação e acompanhamento médico antes de aumentar esforço.",
  },
  "demo-004b": {
    title: "Início da reabilitação lombar", phase: "Controle de dor e proteção funcional", step: 1,
    goal: "Iniciar avaliação de tolerância após investigação médica, sem presumir liberação cardiovascular",
    sport: "Atividade física leve", limb: null, pain: 6, readiness: 4, historyDays: 0,
    sessions: [1, 3, 5].map(weekday => ({ weekday, track: "physio", title: "Avaliação supervisionada e mobilidade confortável", minutes: 15, rpe: 2 })),
    notes: "Investigação lombar concluída hoje. Sem histórico prévio de exercício inventado durante a triagem de red flags. Cardiopatia parcialmente controlada e uso de atenolol exigem cautela e avaliação médica.",
  },
  "demo-005c": {
    title: "Preparação funcional pós-reparo SLAP", phase: "Força específica e transição esportiva", step: 5,
    goal: "Progredir gestos overhead conforme critérios profissionais; retorno pleno ainda não liberado",
    sport: "Gestos esportivos overhead", limb: "Ombro direito", pain: 1, readiness: 7, historyDays: 70,
    sessions: [{ weekday: 1, track: "physio", title: "Controle e força do ombro", minutes: 35, rpe: 4 },
      { weekday: 3, track: "gym", title: "Força progressiva sem carga máxima overhead", minutes: 30, rpe: 4 },
      { weekday: 5, track: "physio", title: "Gestos específicos progressivos supervisionados", minutes: 30, rpe: 4 }],
    concurrent: [{ weekday: 2, track: "gym", title: "Academia — membros inferiores e core", minutes: 50, rpe: 6 }, { weekday: 6, track: "gym", title: "Pilates com foco em escápula (sem overhead máximo)", minutes: 50, rpe: 4 }],
    notes: "LSI de RE 88% e flexão 92% na avaliação. Sem presumir alta ou retorno irrestrito ao esporte.",
  },
  "demo-006d": {
    title: "Retorno gradual à corrida pós-LCA", phase: "Retorno ao esporte e prevenção secundária", step: 6,
    goal: "Manter prevenção neuromuscular e retorno gradual após liberação registrada",
    sport: "Corrida", limb: "Joelho esquerdo", pain: 0, readiness: 8, historyDays: 70,
    sessions: [{ weekday: 1, track: "gym", title: "Manutenção de força e controle neuromuscular", minutes: 30, rpe: 4 },
      { weekday: 3, track: "sport", title: "Corrida gradual — volume controlado", minutes: 20, rpe: 4 },
      { weekday: 5, track: "physio", title: "Prevenção neuromuscular domiciliar", minutes: 25, rpe: 3 }],
    concurrent: [{ weekday: 4, track: "gym", title: "Academia — membros superiores", minutes: 45, rpe: 5 }, { weekday: 6, track: "sport", title: "Corrida no fim de semana", minutes: 35, rpe: 6 }],
    notes: "Alta funcional e RTS registrados na última avaliação. Histórico anterior representa preparação, não corrida já liberada.",
  },
  "demo-007c": {
    title: "Manutenção funcional pós-ATQ", phase: "Manutenção domiciliar e prevenção de quedas", step: 6,
    goal: "Preservar marcha independente e autonomia, respeitando orientações do cirurgião",
    sport: "Atividade funcional domiciliar", limb: "Quadril direito", pain: 1, readiness: 6, historyDays: 70,
    sessions: [1, 3, 5].map(weekday => ({ weekday, track: "physio", title: "Equilíbrio e manutenção funcional domiciliar", minutes: 20, rpe: 2 })),
    notes: "Alta ortopédica funcional; sem acesso à academia. Asma sem acompanhamento na triagem: revisar controle antes de progressão de esforço.",
  },
};