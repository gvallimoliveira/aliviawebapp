/**
 * Trajetória pós-operatória (beta admin). Motor puro e determinístico:
 * tempo desde a cirurgia indica a fase esperada, mas a progressão depende
 * dos critérios marcados pelo fisioterapeuta. Nunca libera atividade sozinho.
 */
export type PostOpSurgery = "acl_reconstruction";

export interface PostOpCriterion { id: string; label: string; }
export interface PostOpPhase {
  id: string;
  title: string;
  fromWeek: number; // semana mínima esperada (início)
  focus: string[];
  avoid: string[];
  biologicalNote?: string;
  exitCriteria: PostOpCriterion[];
  nextMilestone: string;
}

export interface PostOpProfileInput {
  surgery_date: string; // YYYY-MM-DD
  graft_type?: string | null;
  meniscal_repair?: boolean;
  criteria?: Record<string, boolean>;
}

export const ACL_PHASES: PostOpPhase[] = [
  {
    id: "protection", title: "Proteção, extensão e ativação", fromWeek: 0,
    focus: ["Extensão completa (0°)", "Controle de edema", "Ativação do quadríceps", "Marcha conforme liberação"],
    avoid: ["Ganho de flexão agressivo", "Exercícios fora das restrições do cirurgião"],
    exitCriteria: [
      { id: "full_extension", label: "Extensão completa ativa e passiva" },
      { id: "effusion_low", label: "Derrame articular mínimo (traço/grau 0)" },
      { id: "slr_no_lag", label: "Elevação da perna estendida sem lag" },
      { id: "gait_normal", label: "Marcha sem muletas e sem claudicação" },
    ],
    nextMilestone: "Fortalecimento progressivo e controle",
  },
  {
    id: "strength", title: "Força, ADM e carga controlada", fromWeek: 5,
    biologicalNote: "Período de remodelação do enxerto: progressão gradual e monitorar reação à carga.",
    focus: ["Flexão funcional", "Força de quadríceps e posteriores", "Cadeia fechada", "Equilíbrio unipodal"],
    avoid: ["Pivôs e mudanças de direção", "Impacto sem critérios"],
    exitCriteria: [
      { id: "flexion_functional", label: "Flexão funcional sem dor relevante" },
      { id: "quad_lsi_80", label: "Força de quadríceps ≥ 80% do lado contralateral" },
      { id: "no_effusion_load", label: "Sem aumento de derrame após carga" },
      { id: "single_leg_control", label: "Controle unipodal sem valgo dinâmico" },
    ],
    nextMilestone: "Corrida linear e saltos iniciais",
  },
  {
    id: "running", title: "Corrida linear e pliometria inicial", fromWeek: 13,
    focus: ["Trote progressivo", "Saltos bipodais → unipodais", "Força máxima"],
    avoid: ["Esporte com contato", "Cortes e pivôs reativos"],
    exitCriteria: [
      { id: "run_pain_free", label: "Corrida sem dor nem derrame nas 24h seguintes" },
      { id: "hop_symmetry", label: "Testes de salto com simetria satisfatória" },
      { id: "quad_lsi_90", label: "Força de quadríceps ≥ 90% do contralateral" },
    ],
    nextMilestone: "Agilidade e gesto esportivo",
  },
  {
    id: "sport", title: "Agilidade e gesto esportivo", fromWeek: 24,
    focus: ["Mudança de direção planejada → reativa", "Treino específico do esporte", "Prontidão psicológica"],
    avoid: ["Jogo competitivo sem bateria de retorno"],
    exitCriteria: [
      { id: "agility_ok", label: "Agilidade sem compensações" },
      { id: "psych_ready", label: "Prontidão psicológica avaliada" },
      { id: "sport_drills", label: "Treino do esporte sem sintomas" },
    ],
    nextMilestone: "Bateria de retorno ao esporte",
  },
  {
    id: "return", title: "Retorno ao esporte / alta", fromWeek: 36,
    biologicalNote: "Tempo sozinho não libera: decisão por bateria completa e cirurgião.",
    focus: ["Bateria de retorno completa", "Prevenção de nova lesão", "Manutenção de força"],
    avoid: ["Liberação baseada apenas em tempo ou um único teste"],
    exitCriteria: [
      { id: "rts_battery", label: "Bateria de retorno ao esporte completa" },
      { id: "surgeon_clearance", label: "Liberação do cirurgião" },
    ],
    nextMilestone: "Alta",
  },
];

export function daysSince(dateIso: string, todayIso: string): number {
  const a = Date.UTC(+dateIso.slice(0, 4), +dateIso.slice(5, 7) - 1, +dateIso.slice(8, 10));
  const b = Date.UTC(+todayIso.slice(0, 4), +todayIso.slice(5, 7) - 1, +todayIso.slice(8, 10));
  return Math.max(0, Math.round((b - a) / 86400000));
}

export interface PostOpStatus {
  days: number;
  week: number;
  expectedPhaseIndex: number;
  /** Fase clínica real: primeira cujos critérios de saída não estão todos cumpridos. */
  currentPhaseIndex: number;
  phase: PostOpPhase;
  met: number;
  total: number;
  /** Tempo já indica fase posterior, mas critérios da fase atual estão pendentes. */
  behindSchedule: boolean;
  caveats: string[];
}

export function computePostOpStatus(p: PostOpProfileInput, todayIso: string, phases = ACL_PHASES): PostOpStatus {
  const days = daysSince(p.surgery_date, todayIso);
  const week = Math.floor(days / 7) + 1;
  let expected = 0;
  phases.forEach((ph, i) => { if (week >= ph.fromWeek) expected = i; });
  const crit = p.criteria ?? {};
  let current = phases.findIndex((ph) => !ph.exitCriteria.every((c) => crit[c.id]));
  if (current === -1) current = phases.length - 1;
  // Nunca adiantar além do tempo esperado: critérios cumpridos cedo não pulam proteção biológica.
  current = Math.min(current, expected);
  const phase = phases[current];
  const met = phase.exitCriteria.filter((c) => crit[c.id]).length;
  const caveats: string[] = [];
  if (p.meniscal_repair) caveats.push("Sutura meniscal: respeitar limites de flexão e descarga definidos pelo cirurgião.");
  if (p.graft_type === "patellar") caveats.push("Enxerto patelar: monitorar dor anterior/tendão patelar.");
  if (p.graft_type === "hamstring") caveats.push("Enxerto de flexores: progredir força de posteriores com cautela.");
  if (p.graft_type === "quadriceps") caveats.push("Enxerto quadricipital: monitorar dor no sítio doador do quadríceps.");
  return { days, week, expectedPhaseIndex: expected, currentPhaseIndex: current, phase, met, total: phase.exitCriteria.length, behindSchedule: current < expected, caveats };
}
