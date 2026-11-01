export type UsageWindow = "today" | "24h" | "7d" | "30d" | "90d";

export function brazilUsageDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function usageWindowBounds(window: UsageWindow, now = new Date()) {
  const days = window === "today" || window === "24h" ? 1 : Number(window.slice(0, -1));
  const since = window === "today"
    ? new Date(`${brazilUsageDay(now)}T00:00:00-03:00`).toISOString()
    : new Date(now.getTime() - days * 86400000).toISOString();
  return { since, until: now.toISOString(), days };
}

export function usageAssessmentId(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const id = (metadata as Record<string, unknown>).assessment_id;
  return typeof id === "string" && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

export function assessmentUsageSource(assessment: { type: string; clinic_id?: string | null; professional_id?: string | null }): string {
  if (assessment.clinic_id) return "clinic_link";
  if (assessment.professional_id) return "professional_link";
  return assessment.type === "basic" ? "public_basic" : "assessment";
}