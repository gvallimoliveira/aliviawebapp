import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, CalendarX2, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";
import { CARE_APPOINTMENT_FILTER, careOccupancyStats } from "@/lib/managementMetrics";

interface Props {
  clinicId?: string;
  professionalId?: string;
}

/**
 * Ocupação % (scheduled+completed / capacidade)  vs  Faltas % (no_show+no_show_justified / total)
 * Janela: últimos 30 dias.
 * Capacidade estimada: 08–18h seg–sex × 50min/slot por profissional ativo.
 */
const OccupancyVsNoShowCard = ({ clinicId, professionalId }: Props) => {
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const [loading, setLoading] = useState(true);
  const [appts, setAppts] = useState<any[]>([]);
  const [therapists, setTherapists] = useState(1);

  useEffect(() => {
    if (!clinicId && !professionalId) return;
    let cancelled = false;
    setLoading(true);
    setAppts([]);
    setTherapists(1);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const loadAppts = async () => {
      let q = (supabase.from("professional_appointments" as any) as any)
        .select("status, appointment_date, service_type")
        .or(CARE_APPOINTMENT_FILTER)
        .gte("appointment_date", cutoffStr);
      if (clinicId) q = q.eq("clinic_id", clinicId);
      else q = q.is("clinic_id", null).eq("professional_id", professionalId);
      const { data } = await q;
      if (!cancelled) setAppts(data || []);
    };

    const loadTherapists = async () => {
      if (!clinicId) {
        if (!cancelled) setTherapists(1);
        return;
      }
      const { count } = await supabase
        .from("clinic_members")
        .select("id", { count: "exact", head: true })
        .eq("clinic_id", clinicId)
        .eq("status", "active")
        .in("role", ["owner", "therapist"]);
      if (!cancelled) setTherapists(Math.max(1, count || 1));
    };

    Promise.all([loadAppts(), loadTherapists()]).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clinicId, professionalId]);

  const stats = useMemo(() => {
    // Capacidade: 30 dias → ~22 dias úteis × 10 slots de 50min × therapists
    const workdays = 22;
    const slotsPerDay = 10;
    const capacity = workdays * slotsPerDay * therapists;

    return careOccupancyStats(appts, capacity);
  }, [appts, therapists]);

  const tt = {
    title: lang === "pt" ? "Ocupação vs Faltas" : lang === "es" ? "Ocupación vs Faltas" : "Occupancy vs No-shows",
    sub: lang === "pt" ? "Últimos 30 dias · estimativa 08–18h seg–sex" : lang === "es" ? "Últimos 30 días · estimación 08–18h L–V" : "Last 30 days · estimate 8am–6pm Mon–Fri",
    occ: lang === "pt" ? "Ocupação" : lang === "es" ? "Ocupación" : "Occupancy",
    no: lang === "pt" ? "Taxa de faltas" : lang === "es" ? "Tasa de faltas" : "No-show rate",
    summary: (n: number, t: number, idle: number) =>
      lang === "pt"
        ? `${n} faltas em ${t} atendimentos · ${idle} slots ociosos`
        : lang === "es"
        ? `${n} faltas en ${t} citas · ${idle} huecos libres`
        : `${n} no-shows of ${t} appointments · ${idle} idle slots`,
    empty: lang === "pt" ? "Sem atendimentos no período." : lang === "es" ? "Sin citas en el período." : "No appointments in this period.",
  };

  const noShowColor =
    stats.noShowRate > 20 ? "text-destructive" : stats.noShowRate > 10 ? "text-amber-600" : "text-foreground";

  return (
    <InsightCardShell
      id="occupancy"
      icon={<Activity className="h-4 w-4 text-primary" />}
      title={tt.title}
      description={tt.sub}
    >
      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/40 text-center">
              <p className="text-2xl font-bold text-primary">{stats.occupancy}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{tt.occ}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/40 text-center">
              <p className={`text-2xl font-bold ${noShowColor}`}>{stats.noShowRate}%</p>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <CalendarX2 className="h-3 w-3 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">{tt.no}</p>
              </div>
            </div>
          </div>

          {/* Mini barra comparativa */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] w-20 text-muted-foreground">{tt.occ}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, stats.occupancy)}%` }} />
              </div>
              <span className="text-[10px] tabular-nums w-8 text-right">{stats.occupancy}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] w-20 text-muted-foreground">{tt.no}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${stats.noShowRate > 20 ? "bg-destructive" : stats.noShowRate > 10 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(100, stats.noShowRate)}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums w-8 text-right">{stats.noShowRate}%</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            {stats.total === 0 ? tt.empty : tt.summary(stats.noShow, stats.total, stats.idleSlots)}
          </p>
        </div>
      )}
    </InsightCardShell>
  );
};

export default OccupancyVsNoShowCard;
