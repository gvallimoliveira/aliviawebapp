export type GettingStartedStepId = "link" | "patient" | "record" | "hep" | "followup" | "appointment";
export type GettingStartedAction = "patient" | "record" | "hep" | "load" | "appointment";

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

export function gettingStartedSteps(facts: GettingStartedFacts, copiedLink: boolean, clinical: boolean, canSchedule: boolean, hasAgent: boolean) {
  const steps: { id: GettingStartedStepId; complete: boolean | null }[] = [
    { id: "link", complete: copiedLink || anyCompleted(facts.assessments) },
    { id: "patient", complete: anyCompleted(facts.patients, facts.assessments) },
  ];
  if (clinical) {
    steps.push(
      { id: "record", complete: anyCompleted(facts.assessments, facts.notes) },
      { id: "hep", complete: anyCompleted(facts.heps) },
      { id: "followup", complete: anyCompleted(facts.loads, ...(hasAgent ? [facts.conversations] : [])) },
    );
  } else if (canSchedule) {
    steps.push({ id: "appointment", complete: anyCompleted(facts.appointments) });
  }
  return steps;
}

export function gettingStartedDestination(clinicId: string | null | undefined, action: GettingStartedAction, patientKey?: string) {
  const params = new URLSearchParams({ tab: action === "appointment" ? "agenda" : clinicId ? "patients" : "professional" });
  if (patientKey) params.set("patient", patientKey);
  if (action !== "appointment") params.set("gettingStarted", action);
  return `/dashboard?${params.toString()}`;
}