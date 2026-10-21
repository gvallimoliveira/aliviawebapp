export type ClinicDemoRole = "owner" | "therapist" | "secretary";
export const DEMO_THERAPIST_ID = "demo-pro-t1";
export const DEMO_ROLE_LABELS = { owner: "Proprietário", therapist: "Fisioterapeuta", secretary: "Secretária" };
export const DEMO_TEAM_ROLE_LABELS: Record<string, string> = {
  ...DEMO_ROLE_LABELS, admin: "Administrador", intern: "Acadêmico / Estagiário", osteopath: "Osteopata",
};
export function clinicDemoTabs(role: ClinicDemoRole): string[] {
  if (role === "secretary") return ["agenda", "reception"];
  if (role === "therapist") return ["agenda", "patients", "agente"];
  return ["agenda", "patients", "insights", "messages", "agente", "clinic"];
}
export function scopeDemoRows<T extends { professional_id: string | null }>(rows: T[], role: ClinicDemoRole) {
  return role === "therapist" ? rows.filter(row => row.professional_id === DEMO_THERAPIST_ID) : rows;
}