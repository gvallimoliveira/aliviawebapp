export function resolvePatientTab(tab: string | null, linked: boolean): string {
  if (tab === "notices") return "messages";
  if (tab === "evolution") return "health";
  if (tab === "today") return linked ? "today" : "health";
  if (tab && ["health", "appointments", "messages"].includes(tab)) return tab;
  return linked ? "today" : "health";
}