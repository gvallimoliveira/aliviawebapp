export type GettingStartedStepId = "link" | "patient" | "record" | "hep" | "appointment" | "identity" | "team" | "services";
export type GettingStartedAction = "patient" | "record" | "manual-assessment" | "hep" | "load" | "appointment" | "identity" | "team" | "services";

export interface GettingStartedScope {
  userId: string;
  professionalId?: string | null;
  clinicId?: string | null;
}

export interface GettingStartedFacts {
  patients: number | null;
  assessments: number | null;
  notes: number | null;
  heps: number | null;
  loads: number | null;
  conversations: number | null;
  appointments: number | null;
  identity?: boolean | null;
  team?: number | null;
  services?: number | null;
}

export interface GettingStartedPreferences {
  copiedLink?: boolean;
  dismissed?: boolean;
  review?: boolean;
}

export function gettingStartedKey(scope: GettingStartedScope): string {
  return `alivia:first-steps:v1:${scope.userId}:${scope.clinicId ? `clinic:${scope.clinicId}` : `solo:${scope.professionalId ?? "pending"}`}`;
}

export function readGettingStartedPreferences(key: string): GettingStartedPreferences {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    if (!value || typeof value !== "object") return {};
    return { copiedLink: value.copiedLink === true, dismissed: value.dismissed === true, review: value.review === true };
  } catch { return {}; }
}

export function writeGettingStartedPreferences(key: string, value: GettingStartedPreferences) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep the in-memory guide usable. */ }
  window.dispatchEvent(new CustomEvent("alivia:first-steps-changed", { detail: { key, preferences: value } }));
}

export function markGettingStartedLinkCopied(scope: GettingStartedScope) {
  const key = gettingStartedKey(scope);
  writeGettingStartedPreferences(key, { ...readGettingStartedPreferences(key), copiedLink: true });
}

export function restoreGettingStarted(scope: GettingStartedScope) {
  const key = gettingStartedKey(scope);
  writeGettingStartedPreferences(key, { ...readGettingStartedPreferences(key), dismissed: false, review: true });
}

function anyCompleted(...counts: (number | null)[]): boolean | null {
  if (counts.some((count) => count !== null && count > 0)) return true;
  return counts.some((count) => count === null) ? null : false;
}

export function gettingStartedSteps(facts: GettingStartedFacts, copiedLink: boolean, clinical: boolean, canSchedule: boolean, _hasAgent: boolean, manager = false) {
  if (manager) return [
    { id: "identity" as const, complete: facts.identity ?? null },
    { id: "team" as const, complete: anyCompleted(facts.team ?? null) },
    { id: "services" as const, complete: anyCompleted(facts.services ?? null) },
    { id: "link" as const, complete: copiedLink || anyCompleted(facts.assessments) },
    ...(canSchedule ? [{ id: "appointment" as const, complete: anyCompleted(facts.appointments) }] : []),
  ];
  const steps: { id: GettingStartedStepId; complete: boolean | null }[] = [
    { id: "link", complete: copiedLink || anyCompleted(facts.assessments) },
    { id: "patient", complete: anyCompleted(facts.patients, facts.assessments) },
  ];
  if (clinical) {
    steps.push(
      { id: "record", complete: anyCompleted(facts.assessments, facts.notes) },
      { id: "hep", complete: anyCompleted(facts.heps) },
    );
  } else if (canSchedule) {
    steps.push({ id: "appointment", complete: anyCompleted(facts.appointments) });
  }
  return steps;
}

export function gettingStartedDestination(clinicId: string | null | undefined, action: GettingStartedAction, patientKey?: string) {
  const tab = action === "appointment" ? "agenda" : action === "services" ? "insights" : action === "identity" || action === "team" ? "clinic" : clinicId ? "patients" : "professional";
  const params = new URLSearchParams({ tab, context: clinicId ? "clinic" : "professional" });
  if (clinicId) params.set("clinicId", clinicId);
  if (patientKey) params.set("patient", patientKey);
  params.set("gettingStarted", action);
  return `/dashboard?${params.toString()}`;
}

export function clinicIdentityReady(clinic: { name?: string | null; logo_url?: string | null; phone?: string | null; operating_hours_start?: string | null; operating_hours_end?: string | null } | null) {
  return !!(clinic?.name?.trim() && clinic.logo_url && clinic.phone?.trim() && clinic.operating_hours_start && clinic.operating_hours_end);
}

export function agendaGuidanceState(appointments: { service_type?: string | null; status: string }[], loading: boolean, hasError: boolean, canSchedule: boolean, clinical: boolean, dismissed: boolean, demo = false) {
  const care = appointments.filter((appointment) => appointment.service_type !== "compromisso" && appointment.status !== "cancelled");
  return {
    empty: !demo && !loading && !hasError && care.length === 0 && canSchedule,
    tip: !demo && !loading && !hasError && clinical && !dismissed,
  };
}