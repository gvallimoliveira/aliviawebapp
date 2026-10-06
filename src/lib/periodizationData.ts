import { supabase } from "@/integrations/supabase/client";
import { CLEARANCE_TEMPLATE, MACRO_PHASES, localISODate } from "@/lib/periodization";

export interface PeriodizationPlan {
  id: string;
  patient_id: string;
  professional_id: string | null;
  clinic_id: string | null;
  assessment_id: string | null;
  title: string;
  cardio_profile?: string | null;
  hr_ceiling_override?: number | null;
  sport: string | null;
  injured_limb: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface PeriodizationCycle {
  id: string;
  plan_id: string;
  parent_id: string | null;
  level: "macro" | "meso" | "micro" | string;
  name: string;
  goal: string | null;
  exit_criteria: string | null;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  /** Fase atual marcada pelo profissional (nunca inferida pelo sistema). */
  is_current?: boolean;
  marked_current_at?: string | null;
}

export interface PeriodizationSession {
  id: string;
  plan_id: string;
  cycle_id: string | null;
  session_date: string;
  track: string;
  planned_load: string;
  title: string | null;
  exercise_program_id: string | null;
  notes: string | null;
  patient_id: string | null;
  /** Dose prescrita: duração planejada (min) e RPE alvo. */
  planned_duration_min: number | null;
  planned_rpe: number | null;
  /** Carga alvo derivada no banco (duração × RPE). */
  planned_target_load: number | null;
  created_source: string;
}

export interface SrpeEntry {
  id: string;
  patient_id: string;
  plan_id: string | null;
  session_date: string;
  track: string;
  duration_min: number;
  rpe: number;
  training_load: number;
  source: string;
  notes: string | null;
  session_id: string | null;
  patient_rpe?: number | null;
  hr_avg?: number | null;
  hr_max?: number | null;
  spo2_min?: number | null;
  zone_minutes?: number[] | null;
  trimp?: number | null;
  monitor_source?: string | null;
}

export interface ReadinessCheckin {
  id: string;
  patient_id: string;
  plan_id: string | null;
  checkin_date: string;
  soreness: number | null;
  sleep: number | null;
  stress: number | null;
  fatigue: number | null;
  readiness: number | null;
  pain: number | null;
  resting_hr?: number | null;
  peak_hr?: number | null;
  spo2?: number | null;
  note: string | null;
  source: string;
}

export interface ClearanceItem {
  id: string;
  plan_id: string;
  phase: string;
  item_key: string;
  label: string;
  status: string;
  value: string | null;
  evaluated_at: string | null;
  sort_order: number;
}

export interface PlanRestriction {
  id: string;
  plan_id: string;
  kind: string;
  text: string;
}

export interface PeriodizationLink {
  id: string;
  patient_id: string;
  plan_id: string | null;
  token: string;
  audience: string;
  label: string | null;
  active: boolean;
  last_used_at: string | null;
  created_at: string;
}

const randomToken = (len = 24): string => {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => (b % 36).toString(36)).join("");
};

const addDays = (iso: string, days: number): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/* ------------------------------------------------------------------ plans */

export async function fetchActivePlan(patientId: string): Promise<PeriodizationPlan | null> {
  const { data, error } = await supabase
    .from("periodization_plans")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("fetchActivePlan failed", error);
    return null;
  }
  return (data as PeriodizationPlan) || null;
}

/**
 * Cria o plano com o macrociclo pré-preenchido pelas fases do STEPS,
 * mesociclos do primeiro bloco e o checklist de liberação padrão.
 */
export async function createPlanWithTemplate(opts: {
  patientId: string;
  professionalId?: string | null;
  clinicId?: string | null;
  assessmentId?: string | null;
  sport?: string | null;
  injuredLimb?: string | null;
  startDate?: string;
}): Promise<PeriodizationPlan> {
  const { data: userData } = await supabase.auth.getUser();
  const start = opts.startDate || localISODate();

  const { data: plan, error } = await supabase
    .from("periodization_plans")
    .insert({
      patient_id: opts.patientId,
      professional_id: opts.professionalId ?? null,
      clinic_id: opts.clinicId ?? null,
      assessment_id: opts.assessmentId ?? null,
      created_by: userData.user?.id ?? null,
      sport: opts.sport ?? null,
      injured_limb: opts.injuredLimb ?? null,
      start_date: start,
    })
    .select("*")
    .single();
  if (error) throw error;

  // Macrociclo: fases do STEPS em sequência.
  let cursor = start;
  const macros = MACRO_PHASES.map((phase, i) => {
    const startDate = cursor;
    const endDate = addDays(cursor, phase.weeks * 7 - 1);
    cursor = addDays(endDate, 1);
    return {
      plan_id: plan.id,
      level: "macro",
      name: phase.name,
      goal: phase.goal,
      start_date: startDate,
      end_date: endDate,
      sort_order: i,
    };
  });
  await supabase.from("periodization_cycles").insert(macros);

  // Mesociclos (Acumulação/Transmutação/Realização) não são mais criados:
  // o macrociclo mostra apenas a janela de tempo sugerida de cada fase do STEPS.


  await supabase.from("clearance_items").insert(
    CLEARANCE_TEMPLATE.map((item, i) => ({
      plan_id: plan.id,
      item_key: item.item_key,
      label: item.label,
      sort_order: i,
    })),
  );

  return plan as PeriodizationPlan;
}

export async function updatePlan(planId: string, patch: Partial<PeriodizationPlan>): Promise<void> {
  const { error } = await supabase.from("periodization_plans").update(patch).eq("id", planId);
  if (error) throw error;
}

/* ----------------------------------------------------------------- cycles */

export async function fetchCycles(planId: string): Promise<PeriodizationCycle[]> {
  const { data } = await supabase
    .from("periodization_cycles")
    .select("*")
    .eq("plan_id", planId)
    .order("level", { ascending: true })
    .order("sort_order", { ascending: true });
  return (data || []) as PeriodizationCycle[];
}

export async function upsertCycle(cycle: Partial<PeriodizationCycle> & { plan_id: string; level: string; name: string }): Promise<void> {
  if (cycle.id) {
    const { error } = await supabase.from("periodization_cycles").update(cycle).eq("id", cycle.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("periodization_cycles").insert(cycle);
  if (error) throw error;
}

/**
 * O profissional marca a fase atual do macrociclo. A partir dessa marcação o
 * sistema apenas SUGERE as janelas de datas: a fase marcada começa hoje (ou na
 * data informada) e as seguintes são encadeadas pela duração padrão do STEPS.
 * Fases anteriores ficam como estão (histórico).
 */
export async function setCurrentMacroPhase(
  planId: string,
  cycleId: string,
  fromDate?: string,
): Promise<void> {
  const sb = supabase as any;
  const cycles = await fetchCycles(planId);
  const macros = cycles
    .filter((c) => c.level === "macro")
    .sort((a, b) => a.sort_order - b.sort_order);
  const idx = macros.findIndex((c) => c.id === cycleId);
  if (idx < 0) return;

  const start = fromDate || localISODate();
  const { error: clearError } = await sb
    .from("periodization_cycles")
    .update({ is_current: false, marked_current_at: null })
    .eq("plan_id", planId)
    .eq("level", "macro");
  if (clearError) throw clearError;

  let cursor = start;
  for (let i = idx; i < macros.length; i++) {
    const weeks = MACRO_PHASES.find((p) => p.name.toLowerCase() === macros[i].name.toLowerCase())?.weeks ?? 4;
    const endDate = addDays(cursor, weeks * 7 - 1);
    const { error } = await sb
      .from("periodization_cycles")
      .update({
        start_date: cursor,
        end_date: endDate,
        is_current: i === idx,
        marked_current_at: i === idx ? new Date().toISOString() : null,
      })
      .eq("id", macros[i].id);
    if (error) throw error;
    cursor = addDays(endDate, 1);
  }
}

export async function deleteCycle(id: string): Promise<void> {
  await supabase.from("periodization_cycles").delete().eq("id", id);
}

/* --------------------------------------------------------------- sessions */

export async function fetchSessions(planId: string, fromDate?: string, toDate?: string): Promise<PeriodizationSession[]> {
  let q = supabase.from("periodization_sessions").select("*").eq("plan_id", planId);
  if (fromDate) q = q.gte("session_date", fromDate);
  if (toDate) q = q.lte("session_date", toDate);
  const { data } = await q.order("session_date", { ascending: true });
  return (data || []) as PeriodizationSession[];
}

export async function saveSession(session: Partial<PeriodizationSession> & { plan_id: string; session_date: string }): Promise<void> {
  if (session.id) {
    const { error } = await supabase.from("periodization_sessions").update(session).eq("id", session.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("periodization_sessions").insert(session);
  if (error) throw error;
}

/** Sessões prescritas do paciente, com ou sem plano estruturado. */
export async function fetchSessionsByPatient(patientId: string, fromDate?: string): Promise<PeriodizationSession[]> {
  let q = supabase.from("periodization_sessions").select("*").eq("patient_id", patientId);
  if (fromDate) q = q.gte("session_date", fromDate);
  const { data } = await q.order("session_date", { ascending: true });
  return (data || []) as PeriodizationSession[];
}

/** Prescreve (ou ajusta) a dose alvo de uma sessão. */
export async function savePlannedDose(opts: {
  id?: string | null;
  patientId: string;
  planId?: string | null;
  sessionDate: string;
  track: string;
  plannedLoad?: string;
  plannedDurationMin: number;
  plannedRpe: number;
  title?: string | null;
  notes?: string | null;
  source?: string;
}): Promise<void> {
  const payload: Record<string, unknown> = {
    patient_id: opts.patientId,
    plan_id: opts.planId ?? null,
    session_date: opts.sessionDate,
    track: opts.track,
    planned_load: opts.plannedLoad ?? "moderate",
    planned_duration_min: Math.round(opts.plannedDurationMin),
    planned_rpe: opts.plannedRpe,
    title: opts.title ?? null,
    notes: opts.notes ?? null,
    created_source: opts.source ?? "professional",
  };
  if (opts.id) {
    const { error } = await supabase.from("periodization_sessions").update(payload).eq("id", opts.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("periodization_sessions").insert(payload as never);
  if (error) throw error;
}

export async function deleteSession(id: string): Promise<void> {
  await supabase.from("periodization_sessions").delete().eq("id", id);
}

/* ------------------------------------------------------------------- srpe */

export async function fetchSrpe(patientId: string, sinceDate?: string): Promise<SrpeEntry[]> {
  let q = supabase.from("srpe_entries").select("*").eq("patient_id", patientId);
  if (sinceDate) q = q.gte("session_date", sinceDate);
  const { data } = await q.order("session_date", { ascending: true });
  return (data || []) as SrpeEntry[];
}

/** Dados do monitor cardíaco (cinta, relógio ou oxímetro) lançados pelo profissional. */
export interface MonitorData {
  hr_avg: number | null;
  hr_max: number | null;
  spo2_min: number | null;
  zone_minutes: number[] | null;
  trimp: number | null;
  monitor_source: "manual" | "print";
}

const VALID_TRACKS = ["physio", "gym", "sport", "cardio"];

/**
 * Único caminho de gravação de sessão pelo profissional. Uma sessão por data +
 * frente: se o paciente já relatou pelo check-in, junta no mesmo registro (a
 * PSE dele fica em `patient_rpe`) para nunca contar duas vezes no ACWR/dose.
 * Também vincula a sessão planejada do microciclo (`session_id`).
 */
export async function saveProfessionalSession(entry: {
  patientId: string;
  planId?: string | null;
  sessionDate: string;
  track: string;
  durationMin: number;
  rpe: number;
  notes?: string | null;
  monitor?: MonitorData | null;
}): Promise<{ merged: boolean }> {
  const track = VALID_TRACKS.includes(entry.track) ? entry.track : "physio";
  const sb = supabase as any;
  const [{ data: existing }, { data: planned }] = await Promise.all([
    sb.from("srpe_entries").select("id, rpe, source, notes, patient_rpe, session_id")
      .eq("patient_id", entry.patientId).eq("session_date", entry.sessionDate).eq("track", track)
      .order("created_at", { ascending: true }).limit(1).maybeSingle(),
    sb.from("periodization_sessions").select("id")
      .eq("patient_id", entry.patientId).eq("session_date", entry.sessionDate).eq("track", track)
      .limit(1).maybeSingle(),
  ]);
  const base = {
    duration_min: Math.round(entry.durationMin),
    rpe: entry.rpe,
    source: "professional",
    ...(entry.monitor ?? {}),
  };
  if (existing) {
    const patientRpe = existing.source === "patient" ? existing.rpe : existing.patient_rpe ?? null;
    const notes = [existing.notes, entry.notes?.trim() || null].filter(Boolean).join("\n") || null;
    const { error } = await sb.from("srpe_entries").update({
      ...base, patient_rpe: patientRpe, notes, session_id: existing.session_id ?? planned?.id ?? null,
    }).eq("id", existing.id);
    if (error) throw error;
    return { merged: true };
  }
  const { error } = await sb.from("srpe_entries").insert({
    ...base,
    patient_id: entry.patientId,
    plan_id: entry.planId ?? null,
    session_date: entry.sessionDate,
    track,
    session_id: planned?.id ?? null,
    notes: entry.notes?.trim() || null,
  });
  if (error) throw error;
  return { merged: false };
}

export async function deleteSrpe(id: string): Promise<void> {
  const { error } = await supabase.from("srpe_entries").delete().eq("id", id);
  if (error) throw error;
}

/* --------------------------------------------------------------- checkins */

export async function fetchCheckins(patientId: string, sinceDate?: string): Promise<ReadinessCheckin[]> {
  let q = supabase.from("readiness_checkins").select("*").eq("patient_id", patientId);
  if (sinceDate) q = q.gte("checkin_date", sinceDate);
  const { data } = await q.order("checkin_date", { ascending: true });
  return (data || []) as ReadinessCheckin[];
}

export async function saveCheckin(entry: {
  patientId: string;
  planId?: string | null;
  date: string;
  soreness?: number | null;
  sleep?: number | null;
  stress?: number | null;
  fatigue?: number | null;
  readiness?: number | null;
  pain?: number | null;
  note?: string | null;
  source?: string;
}): Promise<void> {
  const { error } = await supabase
    .from("readiness_checkins")
    .upsert(
      {
        patient_id: entry.patientId,
        plan_id: entry.planId ?? null,
        checkin_date: entry.date,
        soreness: entry.soreness ?? null,
        sleep: entry.sleep ?? null,
        stress: entry.stress ?? null,
        fatigue: entry.fatigue ?? null,
        readiness: entry.readiness ?? null,
        pain: entry.pain ?? null,
        note: entry.note ?? null,
        source: entry.source ?? "professional",
      },
      { onConflict: "patient_id,checkin_date" },
    );
  if (error) throw error;
}

/* ------------------------------------------------- clearance / restrições */

export async function fetchClearance(planId: string): Promise<ClearanceItem[]> {
  const { data } = await supabase
    .from("clearance_items")
    .select("*")
    .eq("plan_id", planId)
    .order("sort_order", { ascending: true });
  return (data || []) as ClearanceItem[];
}

export async function updateClearance(id: string, patch: { status?: string; value?: string | null }): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("clearance_items")
    .update({ ...patch, evaluated_by: userData.user?.id ?? null, evaluated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function fetchRestrictions(planId: string): Promise<PlanRestriction[]> {
  const { data } = await supabase
    .from("plan_restrictions")
    .select("*")
    .eq("plan_id", planId)
    .order("created_at", { ascending: true });
  return (data || []) as PlanRestriction[];
}

export async function addRestriction(planId: string, kind: "allow" | "avoid", text: string): Promise<void> {
  const { error } = await supabase.from("plan_restrictions").insert({ plan_id: planId, kind, text: text.trim() });
  if (error) throw error;
}

export async function deleteRestriction(id: string): Promise<void> {
  await supabase.from("plan_restrictions").delete().eq("id", id);
}

/* ------------------------------------------------------------------ links */

export async function fetchLinks(patientId: string): Promise<PeriodizationLink[]> {
  const { data } = await supabase
    .from("periodization_links")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  return (data || []) as PeriodizationLink[];
}

/**
 * One active link per patient + audience. Without `renew`, an existing active
 * link is reused; with `renew`, previous active links are deactivated first.
 */
export async function createLink(opts: {
  patientId: string;
  planId?: string | null;
  audience: "patient" | "coach";
  label?: string | null;
  renew?: boolean;
}): Promise<PeriodizationLink> {
  const { data: existing } = await supabase
    .from("periodization_links")
    .select("*")
    .eq("patient_id", opts.patientId)
    .eq("audience", opts.audience)
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (!opts.renew && existing && existing.length > 0) return existing[0] as PeriodizationLink;
  if (existing && existing.length > 0) {
    await supabase.from("periodization_links").update({ active: false })
      .in("id", existing.map((l: any) => l.id));
  }
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("periodization_links")
    .insert({
      patient_id: opts.patientId,
      plan_id: opts.planId ?? null,
      audience: opts.audience,
      label: opts.label ?? null,
      token: randomToken(),
      created_by: userData.user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as PeriodizationLink;
}

export async function revokeLink(id: string): Promise<void> {
  await supabase.from("periodization_links").update({ active: false }).eq("id", id);
}
