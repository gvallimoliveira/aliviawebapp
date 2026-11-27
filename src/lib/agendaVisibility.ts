import { serviceFilterKey } from "@/lib/appointmentTime";

/** Mirrors public.can_view_clinic_appointment (RLS); change both together. */
export type AgendaScope = "own" | "services" | "clinic";
export interface AgendaAccess { role: string; scope: AgendaScope; services: string[] }

export const AGENDA_MANAGER_ROLES = ["owner", "admin", "secretary"];
export const isAgendaManagerRole = (role: string) => AGENDA_MANAGER_ROLES.includes(role);

type Lang = "pt" | "en" | "es";
/** Built-in services a member can be granted; custom catalog services use `svc:<id>`. */
export const AGENDA_BASE_SERVICES: { key: string; label: Record<Lang, string> }[] = [
  { key: "avaliacao", label: { pt: "Avaliação", en: "Assessment", es: "Evaluación" } },
  { key: "fisioterapia", label: { pt: "Fisioterapia", en: "Physiotherapy", es: "Fisioterapia" } },
  { key: "pilates", label: { pt: "Pilates", en: "Pilates", es: "Pilates" } },
  { key: "osteopatia", label: { pt: "Osteopatia", en: "Osteopathy", es: "Osteopatía" } },
  { key: "massoterapia", label: { pt: "Massoterapia", en: "Massage Therapy", es: "Masoterapia" } },
  { key: "rpg", label: { pt: "RPG", en: "RPG", es: "RPG" } },
];

export function normalizeAgendaScope(value: unknown): AgendaScope {
  return value === "own" || value === "services" ? value : "clinic";
}

export function canViewClinicAppointment(
  access: AgendaAccess,
  apt: { professional_id?: string | null; service_type?: string | null; service_id?: string | null },
  ownProfessionalIds: string[],
): boolean {
  if (isAgendaManagerRole(access.role) || access.scope === "clinic") return true;
  if (apt.professional_id && ownProfessionalIds.includes(apt.professional_id)) return true;
  if (access.scope !== "services" || apt.service_type === "compromisso") return false;
  return access.services.includes(serviceFilterKey(apt));
}

export function agendaServiceLabel(key: string, lang: Lang, custom: { id: string; name: string }[]): string {
  if (key.startsWith("svc:")) return custom.find((c) => `svc:${c.id}` === key)?.name ?? (lang === "en" ? "Removed service" : lang === "es" ? "Servicio eliminado" : "Serviço removido");
  return AGENDA_BASE_SERVICES.find((s) => s.key === key)?.label[lang] ?? key;
}

/** Short label for badges and the Agenda notice. */
export function agendaScopeSummary(scope: AgendaScope, services: string[], lang: Lang, custom: { id: string; name: string }[]): string {
  if (scope === "clinic") return lang === "en" ? "Whole clinic" : lang === "es" ? "Toda la clínica" : "Clínica toda";
  if (scope === "own" || services.length === 0) return lang === "en" ? "Own schedule only" : lang === "es" ? "Solo la propia" : "Só a própria";
  const names = services.map((k) => agendaServiceLabel(k, lang, custom));
  const shown = names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "");
  return (lang === "en" ? "Own + " : lang === "es" ? "Propia + " : "Própria + ") + shown;
}
