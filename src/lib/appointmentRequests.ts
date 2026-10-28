import { supabase } from "@/integrations/supabase/client";

export type RequestPeriod = "morning" | "afternoon" | "evening";

export interface AppointmentRequest {
  id: string;
  patient_user_id: string;
  patient_name: string;
  patient_email: string | null;
  patient_phone: string | null;
  clinic_id: string | null;
  professional_id: string | null;
  service_id: string | null;
  service_name?: string | null;
  requested_date: string;
  requested_time: string | null;
  requested_period: RequestPeriod | null;
  notes: string | null;
  status: "pending" | "approved" | "dismissed" | "cancelled";
  appointment_id: string | null;
  confirmed_date: string | null;
  confirmed_time: string | null;
  created_at: string;
}

export const PERIOD_LABEL: Record<RequestPeriod, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
};

/** Arrival order, independent of the date the patient wants to book. */
export function oldestRequestsFirst<T extends Pick<AppointmentRequest, "id" | "created_at">>(requests: readonly T[]): T[] {
  return [...requests].sort((a, b) =>
    Date.parse(a.created_at) - Date.parse(b.created_at) || a.id.localeCompare(b.id),
  );
}

export function formatRequestCreatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Data não disponível";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(date);
}

/** Default time suggested for approval when the patient picked only a period. */
export function suggestedTime(r: Pick<AppointmentRequest, "requested_time" | "requested_period">): string {
  if (r.requested_time) return r.requested_time;
  if (r.requested_period === "afternoon") return "14:00";
  if (r.requested_period === "evening") return "18:00";
  return "08:00";
}

export function formatBrDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** WhatsApp deep link with a ready-made message about the request. */
export function whatsappLink(r: Pick<AppointmentRequest, "patient_phone" | "patient_name" | "requested_date" | "requested_time">): string | null {
  const digits = (r.patient_phone || "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const phone = digits.length <= 11 ? `55${digits}` : digits;
  const first = r.patient_name.split(" ")[0];
  const msg = `Olá ${first}! Recebemos sua solicitação de agendamento para ${formatBrDate(r.requested_date)}${r.requested_time ? ` às ${r.requested_time}` : ""}.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

export async function notifyAppointmentRequest(requestId: string) {
  try {
    await supabase.functions.invoke("send-push-notification", { body: { appointment_request_id: requestId } });
  } catch (err) {
    console.warn("appointment request push failed", err);
  }
}
