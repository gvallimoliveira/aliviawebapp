import type { PostOpPhase } from "./postOpTrajectory";

export interface PreOpInput {
  planned_surgery_date?: string | null;
  criteria?: Record<string, boolean>;
}

/** Preparation domains, not a calendar or surgical clearance protocol. */
export const ACL_PREOP_PHASES: PostOpPhase[] = [
  {
    id: "pre_calm", title: "Controle de sintomas e mobilidade", fromWeek: 0,
    focus: ["Controlar dor e derrame", "Recuperar extensão e flexão conforme tolerância", "Ativar quadríceps sem agravar sintomas"],
    avoid: ["Forçar amplitude em joelho bloqueado", "Carga que aumente dor ou derrame", "Pivôs e episódios de falseio"],
    exitCriteria: [
      { id: "pre_pain", label: "Dor controlada para as atividades propostas" },
      { id: "pre_effusion", label: "Derrame reduzido e estável, avaliado clinicamente" },
      { id: "pre_extension", label: "Extensão recuperada em relação ao lado oposto, conforme avaliação" },
      { id: "pre_flexion", label: "Flexão suficiente para progredir os exercícios, sem forçar bloqueios" },
    ], nextMilestone: "Força e função antes da cirurgia",
  },
  {
    id: "pre_function", title: "Força, marcha e controle", fromWeek: 0,
    focus: ["Fortalecer quadríceps e musculatura do membro inferior", "Treinar marcha e controle nas tarefas permitidas", "Acompanhar resposta do joelho após a carga"],
    avoid: ["Treinar através de falseio ou bloqueio", "Progressão de carga com piora persistente dos sintomas", "Retorno esportivo com pivôs por melhora isolada da força"],
    exitCriteria: [
      { id: "pre_activation", label: "Elevação da perna estendida sem déficit de extensão ativo (lag)" },
      { id: "pre_gait", label: "Marcha funcional sem compensações relevantes, respeitando auxílio indicado" },
      { id: "pre_strength", label: "Força medida e preparação individual revisada pelo fisioterapeuta" },
      { id: "pre_load", label: "Exercícios propostos tolerados sem aumento persistente de dor ou derrame" },
    ], nextMilestone: "Preparação prática e alinhamento com a equipe cirúrgica",
  },
  {
    id: "pre_ready", title: "Preparação para a cirurgia", fromWeek: 0,
    focus: ["Manter mobilidade, força e controle de sintomas", "Revisar restrições e lesões associadas com o cirurgião", "Preparar uso de muletas, ambiente e expectativas para o pós-operatório"],
    avoid: ["Interpretar metas cumpridas como autorização para operar", "Suspender preparação apenas porque a data chegou", "Presumir técnica, enxerto ou restrições ainda não confirmados"],
    exitCriteria: [
      { id: "pre_review", label: "Condição do joelho e eventuais bloqueios/restrições discutidos com o cirurgião" },
      { id: "pre_education", label: "Paciente orientado sobre cuidados e expectativas iniciais" },
      { id: "pre_logistics", label: "Auxílios e apoio necessários após a cirurgia revisados" },
    ], nextMilestone: "Cirurgia, quando confirmada pela equipe responsável; depois, registrar a data realizada",
  },
];

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T12:00:00Z")) && new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value;
}

export function computePreOpStatus(input: PreOpInput, today: string) {
  const criteria = input.criteria ?? {};
  const pending = ACL_PREOP_PHASES.findIndex((phase) => !phase.exitCriteria.every((goal) => criteria[goal.id]));
  const currentPhaseIndex = pending < 0 ? ACL_PREOP_PHASES.length - 1 : pending;
  const phase = ACL_PREOP_PHASES[currentPhaseIndex];
  const date = input.planned_surgery_date;
  const daysUntilSurgery = date && validDate(date) && validDate(today)
    ? Math.round((Date.parse(date + "T12:00:00Z") - Date.parse(today + "T12:00:00Z")) / 86400000) : null;
  return { phase, currentPhaseIndex, daysUntilSurgery, met: phase.exitCriteria.filter((goal) => criteria[goal.id]).length, total: phase.exitCriteria.length, preparationComplete: pending < 0 };
}

export interface SurgicalAssessment { created_at: string; anamnesis_data?: any; }

/** Anatomical region or onset alone never identify an ACL preparation case. */
export function prefillAclPreoperative(assessments: SurgicalAssessment[]) {
  for (const assessment of [...assessments].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    const an = assessment.anamnesis_data ?? {};
    const parts = [an.preventionGoalDetails, an.history, an.chiefComplaint, an.previousSurgeries, an.additionalClinicalNotes].filter(Boolean).map(String);
    const context = parts.find((part) => /\bLCA\b|ligamento cruzado anterior|\bACL\b/i.test(part) && /pr[eé][ -]?operat|prehab|pre[ -]?operat|aguarda.{0,40}(cirurgia|reconstru)|cirurgia.{0,30}(marcada|agendada|prevista)|prepara.{0,40}(cirurgia|reconstru)/i.test(part));
    if (!context || /n[aã]o.{0,15}(est[aá].{0,5})?(em )?pr[eé][ -]?operat|sem.{0,15}(cirurgia|indica[çc][aã]o cir[uú]rgica)/i.test(context)) continue;
    if (/p[oó]s[ -]?operat|cirurgia realizada|submetid[oa]|foi operad[oa]/i.test(context)) continue;
    // Only a date attached to scheduling, never an unrelated birth/exam date.
    const scheduled = parts.join("\n").match(/(?:cirurgia|reconstru[çc][aã]o|procedimento)\s*(?:do LCA\s*)?(?:marcad[ao]|agendad[ao]|previst[ao]|programad[ao])?\s*(?:para|em|:)?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/(?:\d{4}|\d{2}))\b/i);
    let date = scheduled?.[1] ?? null;
    if (date?.includes("/")) { const [d, m, y] = date.split("/"); date = `${y.length === 2 ? `20${y}` : y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`; }
    if (date && !validDate(date)) date = null;
    const restrictions = parts.join("\n").split(/\n|(?<=[.;])\s+/).filter((part) => /restri|cirurgi[aã]o|evitar|muleta|bloqueio|sem carga/i.test(part));
    return { planned_surgery_date: date, surgeon_restrictions: restrictions.join(" ") || null, sourceDate: assessment.created_at.slice(0, 10) };
  }
  return null;
}

export function preOpReportText(input: PreOpInput, today: string): string {
  const status = computePreOpStatus(input, today);
  return ["Pré-operatório de reconstrução do LCA — preparação, cirurgia não confirmada como realizada.", input.planned_surgery_date ? `Data planejada: ${input.planned_surgery_date} (confirmar com a equipe cirúrgica).` : "Cirurgia sem data informada.", `Etapa atual: ${status.phase.title}.`, `Próximo marco: ${status.phase.nextMilestone}.`, ...status.phase.exitCriteria.map((goal) => `• ${goal.label}: ${input.criteria?.[goal.id] ? "atingido" : "em construção"}`), "As metas apoiam a preparação; não autorizam cirurgia nem substituem decisão da equipe responsável."].join("\n");
}