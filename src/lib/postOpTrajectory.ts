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

// ---------- Leitura automática das medições do prontuário ----------
export interface MeasuredAssessment {
  created_at: string;
  anamnesis_data?: {
    romTable?: Array<{ joint?: string; leftValue?: string; rightValue?: string }>;
    strengthTable?: Array<{ movement?: string; leftValue?: string; rightValue?: string }>;
  } | null;
}
export interface AutoCriterion { value: boolean; source: string; date: string; }

const num = (v?: string) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; };
const isKnee = (s: string) => /joelho|knee|rodilla/i.test(s);
const isExt = (s: string) => /extens|extension|extensi/i.test(s);
const isQuad = (s: string) => /quadr[ií]ceps|quadriceps|cu[aá]driceps/i.test(s) || (isKnee(s) && isExt(s));

/**
 * Marca critérios a partir da medição mais recente feita após a cirurgia.
 * Só usa critérios com corte explícito no próprio critério: extensão simétrica (±2°)
 * e força de quadríceps pelo índice de simetria (menor/maior lado) ≥ 80% / ≥ 90%.
 */
export function autoCriteriaFromMeasurements(assessments: MeasuredAssessment[], surgeryDate: string): Record<string, AutoCriterion> {
  const out: Record<string, AutoCriterion> = {};
  const sorted = [...assessments]
    .filter((a) => a.created_at && a.created_at.slice(0, 10) >= surgeryDate)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const a of sorted) {
    const date = a.created_at.slice(0, 10);
    if (!out.full_extension) {
      const r = (a.anamnesis_data?.romTable || []).find((x) => isKnee(x.joint || "") && isExt(x.joint || ""));
      const l = num(r?.leftValue), rt = num(r?.rightValue);
      if (r && l !== null && rt !== null) out.full_extension = { value: Math.abs(l - rt) <= 2, source: `Extensão do joelho E ${l}° / D ${rt}°`, date };
    }
    if (!out.quad_lsi_80) {
      const s = (a.anamnesis_data?.strengthTable || []).find((x) => isQuad(x.movement || ""));
      const l = num(s?.leftValue), rt = num(s?.rightValue);
      if (s && l !== null && rt !== null && Math.max(l, rt) > 0) {
        const lsi = Math.round((Math.min(l, rt) / Math.max(l, rt)) * 100);
        const source = `Quadríceps: simetria ${lsi}% (E ${l} / D ${rt})`;
        out.quad_lsi_80 = { value: lsi >= 80, source, date };
        out.quad_lsi_90 = { value: lsi >= 90, source, date };
      }
    }
    if (out.full_extension && out.quad_lsi_80) break;
  }
  return out;
}

/** Marcação manual do fisioterapeuta prevalece; sem marcação, usa a medição. */
export function effectiveCriteria(manual: Record<string, boolean> | undefined, auto: Record<string, AutoCriterion>): Record<string, boolean> {
  const res: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(auto)) res[k] = v.value;
  for (const [k, v] of Object.entries(manual || {})) res[k] = v;
  return res;
}

export function postOpReportText(status: PostOpStatus, surgeryDate: string, criteria: Record<string, boolean>): string {
  const d = new Date(surgeryDate + "T12:00:00").toLocaleDateString("pt-BR");
  const lines = [
    `Pós-operatório de reconstrução do LCA (cirurgia em ${d}) — semana ${status.week} (D+${status.days}).`,
    `Fase atual: ${status.phase.title}.`,
    `Próximo marco: ${status.phase.nextMilestone}.`,
    `Critérios da fase (${status.met}/${status.total}):`,
    ...status.phase.exitCriteria.map((c) => `• ${c.label}: ${criteria[c.id] ? "atingido" : "pendente"}`),
  ];
  if (status.behindSchedule) lines.push("Observação: critérios ainda pendentes em relação ao tempo pós-operatório esperado.");
  return lines.join("\n");
}

// ---------- Ponte anamnese → trajetória ----------
export interface PostOpPrefill {
  surgery_date: string | null;
  graft_type: string | null;
  meniscal_repair: boolean;
  surgeon_restrictions: string | null;
  sourceDate: string | null;
}

const toIso = (d: number, m: number, y: number) => {
  const yy = y < 100 ? 2000 + y : y;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${yy}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

/** Extrai dados da cirurgia já escritos na anamnese (avaliação mais recente com contexto cirúrgico). Nunca inventa: campo ausente fica vazio. */
export function prefillFromAnamnesis(assessments: Array<{ created_at: string; anamnesis_data?: any }>, todayIso: string): PostOpPrefill | null {
  const sorted = [...assessments].filter((a) => a?.created_at).sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const a of sorted) {
    const an = a.anamnesis_data || {};
    const surg = String(an.previousSurgeries || an.previousTreatments || "");
    const text = [surg, an.history, an.additionalClinicalNotes, an.chiefComplaint].filter(Boolean).join("\n");
    if (an.onset !== "post_surgery" && !/lca|lce|cruzado|acl/i.test(text)) continue;
    let surgery_date: string | null = null;
    const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    const br = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/);
    if (iso) surgery_date = `${iso[1]}-${iso[2]}-${iso[3]}`;
    else if (br) surgery_date = toIso(+br[1], +br[2], +br[3]);
    if (surgery_date && surgery_date > todayIso) surgery_date = null;
    const graft_type = /patelar|patellar|osso.?tend[aã]o.?osso|\bbtb\b/i.test(text) ? "patellar"
      : /flexor|isquiotib|semitend|gr[aá]cil|hamstring|\bst\b/i.test(text) ? "hamstring"
      : /quadricipital|tend[aã]o do quadr[ií]ceps/i.test(text) ? "quadriceps" : null;
    const meniscal_repair = /(sutura|reparo)\s+(do\s+|de\s+)?menisc|meniscorrafia/i.test(text);
    const restr = text.split(/\n|(?<=[.;])\s+/).map((s) => s.trim())
      .filter((s) => /restri|muleta|cirurgi[aã]o|m[eé]dico|evitar|proib|sem carga|descarga|brace|[oó]rtese|limite de flex/i.test(s));
    return { surgery_date, graft_type, meniscal_repair, surgeon_restrictions: restr.length ? restr.join(" ") : null, sourceDate: a.created_at.slice(0, 10) };
  }
  return null;
}

/** Data em que a fase de índice i passa a ser biologicamente permitida pelo tempo. */
export function phaseUnlockDate(surgeryDate: string, phaseIndex: number, phases = ACL_PHASES): string {
  const ms = Date.UTC(+surgeryDate.slice(0, 4), +surgeryDate.slice(5, 7) - 1, +surgeryDate.slice(8, 10)) + Math.max(0, phases[phaseIndex].fromWeek - 1) * 7 * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}
