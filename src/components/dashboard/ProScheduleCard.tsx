import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Video, MapPin, ExternalLink, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ProScheduleCardProps {
  professionalId: string;
  onNavigateToSchedule: () => void;
}

const TYPE_ICONS: Record<string, typeof Video> = {
  video_call: Video,
  in_person: MapPin,
  external: ExternalLink,
};

const TYPE_COLORS: Record<string, string> = {
  video_call: "bg-blue-500/10 text-blue-600 border-blue-200",
  in_person: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  external: "bg-amber-500/10 text-amber-600 border-amber-200",
};

const SERVICE_DOT: Record<string, string> = {
  avaliacao: "bg-red-500",
  fisioterapia: "bg-teal-500",
  pilates: "bg-purple-500",
  osteopatia: "bg-orange-500",
  massoterapia: "bg-pink-500",
  rpg: "bg-indigo-500",
  compromisso: "bg-muted-foreground",
};

const SERVICE_LABELS: Record<string, Record<string, string>> = {
  avaliacao: { pt: "Avaliação", en: "Assessment", es: "Evaluación" },
  fisioterapia: { pt: "Fisio", en: "Physio", es: "Fisio" },
  pilates: { pt: "Pilates", en: "Pilates", es: "Pilates" },
  osteopatia: { pt: "Osteo", en: "Osteo", es: "Osteo" },
  massoterapia: { pt: "Massot.", en: "Massage", es: "Masot." },
  rpg: { pt: "RPG", en: "RPG", es: "RPG" },
  compromisso: { pt: "Compromisso", en: "Commitment", es: "Compromiso" },
};

const SERVICE_BORDER: Record<string, string> = {
  avaliacao: "border-l-2 border-l-red-500",
  fisioterapia: "border-l-2 border-l-teal-500",
  pilates: "border-l-2 border-l-purple-500",
  osteopatia: "border-l-2 border-l-orange-500",
  massoterapia: "border-l-2 border-l-pink-500",
  rpg: "border-l-2 border-l-indigo-500",
  compromisso: "border-l-2 border-l-muted-foreground",
};

const STATUS_BG: Record<string, string> = {
  scheduled: "bg-muted/30",
  completed: "bg-emerald-100/70 dark:bg-emerald-900/20",
  no_show: "bg-red-100/70 dark:bg-red-900/20",
  no_show_justified: "bg-amber-100/70 dark:bg-amber-900/20",
  cancelled: "bg-muted/30 opacity-60",
};

const ProScheduleCard = ({ professionalId, onNavigateToSchedule }: ProScheduleCardProps) => {
  const { t, language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const storageKey = `aliviA:scheduleCardCollapsed:${professionalId}`;
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(storageKey, collapsed ? "1" : "0"); } catch {}
  }, [collapsed, storageKey]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const upcomingRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    (supabase.from("professional_appointments" as any) as any)
      .select("*")
      .eq("professional_id", professionalId)
      .eq("appointment_date", today)
      .order("appointment_time", { ascending: true })
      .then(({ data }: any) => {
        setAppointments(data || []);
        setLoading(false);
      });
  }, [professionalId]);

  // Identify the "current or next" appointment to surface first
  const nowMinutes = (() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  })();
  const upcomingId = (() => {
    const upcoming = appointments.find((a: any) => {
      const [hh, mm] = (a.appointment_time || "00:00").split(":").map(Number);
      return hh * 60 + mm >= nowMinutes - 60 && a.status !== "completed" && a.status !== "cancelled";
    });
    return (upcoming || appointments[0])?.id;
  })();

  // Auto-scroll the upcoming row into view inside the scroll container
  useEffect(() => {
    if (collapsed || !upcomingRef.current || !scrollRef.current) return;
    const container = scrollRef.current;
    const target = upcomingRef.current;
    container.scrollTo({ top: target.offsetTop - container.offsetTop, behavior: "auto" });
  }, [collapsed, appointments.length, upcomingId]);

  const activeServices = new Set(appointments.map((a: any) => a.service_type || "fisioterapia"));

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="flex items-center gap-2 flex-1 text-left"
            onClick={() => setCollapsed((v) => !v)}
            aria-expanded={!collapsed}
          >
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t("schedule.today_title")}</CardTitle>
            {collapsed ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <button
            type="button"
            onClick={onNavigateToSchedule}
            className="p-1 -m-1 rounded hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t("schedule.today_title") as string}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {!collapsed && (
          <CardDescription className="text-xs">
            {appointments.length > 0
              ? `${appointments.length} ${t("schedule.appointments_count")}`
              : t("schedule.no_appointments")}
          </CardDescription>
        )}
      </CardHeader>
      {!collapsed && (
        <CardContent>
          {loading ? (
            <div className="h-16 flex items-center justify-center">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : appointments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">{t("schedule.empty_day")}</p>
          ) : (
            <>
              {/* Native scroll: ~2 cards visible (each row ~40px + 6px gap) */}
              <div
                ref={scrollRef}
                className="overflow-y-auto space-y-1.5 pr-1"
                style={{ maxHeight: "92px" }}
              >
                {appointments.map((apt: any) => {
                  const Icon = TYPE_ICONS[apt.type] || MapPin;
                  const colorClass = TYPE_COLORS[apt.type] || TYPE_COLORS.in_person;
                  const svcBorder = SERVICE_BORDER[apt.service_type || "fisioterapia"] || "";
                  const statusBg = STATUS_BG[apt.status] || STATUS_BG.scheduled;
                  const isUpcoming = apt.id === upcomingId;
                  return (
                    <div
                      key={apt.id}
                      ref={isUpcoming ? upcomingRef : undefined}
                      className={cn(
                        "flex items-center gap-2.5 p-2 rounded-lg border border-border/40",
                        statusBg,
                        svcBorder,
                        isUpcoming && "ring-1 ring-primary/40"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-semibold text-foreground tabular-nums">
                          {apt.appointment_time?.slice(0, 5)}
                        </span>
                      </div>
                      <span className="text-xs text-foreground truncate flex-1">{apt.patient_name}</span>
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${colorClass}`}>
                        <Icon className="h-2.5 w-2.5 mr-0.5" />
                        {t(`schedule.type_${apt.type}`)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
              {activeServices.size > 0 && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/30 flex-wrap">
                  {Array.from(activeServices).map((svc) => (
                    <span key={svc} className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <span className={cn("w-1.5 h-1.5 rounded-full", SERVICE_DOT[svc] || "bg-muted-foreground")} />
                      {SERVICE_LABELS[svc]?.[lang] || svc}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default ProScheduleCard;
