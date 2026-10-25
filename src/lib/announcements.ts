import { supabase } from "@/integrations/supabase/client";

export type AnnouncementCategory = "notice" | "holiday" | "education" | "reminder" | "service";
export type AnnouncementAudience = "all" | "active" | "inactive";

export const CATEGORY_LABEL: Record<AnnouncementCategory, string> = {
  notice: "Comunicado",
  holiday: "Feriado / férias",
  education: "Dica de saúde",
  reminder: "Lembrete",
  service: "Serviço / novidade",
};

export const CATEGORY_EMOJI: Record<AnnouncementCategory, string> = {
  notice: "📢", holiday: "🗓️", education: "💡", reminder: "⏰", service: "✨",
};

export const AUDIENCE_LABEL: Record<AnnouncementAudience, string> = {
  all: "Todos os pacientes vinculados",
  active: "Em tratamento (sessão nos últimos 60 dias ou agendada)",
  inactive: "Sem sessão nos últimos 60 dias (alta / pausa)",
};

/** Ready-made starting points; users can also save their own. */
export const BUILTIN_TEMPLATES: { name: string; category: AnnouncementCategory; title: string; body: string; cta_label?: string; cta_url?: string }[] = [
  { name: "Feriado", category: "holiday", title: "Funcionamento no feriado", body: "Informamos que no dia __/__ não haverá atendimento. Se precisar, antecipe seu horário." , cta_label: "Pedir horário", cta_url: "/dashboard?tab=appointments" },
  { name: "Férias do profissional", category: "holiday", title: "Período de férias", body: "Estaremos de férias entre __/__ e __/__. Os atendimentos retornam normalmente em __/__." },
  { name: "Lembrete de check-in", category: "reminder", title: "Seu check-in de hoje", body: "Leva menos de 1 minuto e nos ajuda a ajustar a carga do seu tratamento." },
  { name: "Dica rápida", category: "education", title: "Dica de saúde", body: "Pausas de movimento a cada 1 hora sentado ajudam a reduzir a rigidez e o desconforto." },
  { name: "Novo serviço", category: "service", title: "Novidade por aqui", body: "Agora oferecemos __. Fale conosco para saber se é indicado para você.", cta_label: "Pedir horário", cta_url: "/dashboard?tab=appointments" },
];

/** Only internal paths or https links are accepted as action buttons. */
export function safeCtaUrl(url: string | null | undefined): string | null {
  const u = (url || "").trim();
  if (!u) return null;
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  if (/^https:\/\/[^\s]+$/i.test(u)) return u;
  return null;
}

export async function notifyAnnouncement(id: string) {
  try {
    await supabase.functions.invoke("send-push-notification", { body: { announcement_id: id } });
  } catch (err) {
    console.warn("announcement push failed", err);
  }
}
