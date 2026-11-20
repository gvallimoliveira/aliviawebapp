import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { localISODate, pairSessionsWithSrpe, readinessScore, trainingLoad } from "@/lib/periodization";
import { addDaysISO, groupByDay, HISTORY_BLOCK_DAYS, rollingDailySeries } from "@/lib/loadWindows";
import type { PeriodizationSession, ReadinessCheckin, SrpeEntry } from "@/lib/periodizationData";
import DayGroupList, { type DayGroup } from "./DayGroupList";
import DailyLoadChart from "./DailyLoadChart";
import { DOSE_LABEL, TRACK_LABEL } from "./scales";

const fmt = (iso: string) => iso.split("-").reverse().join("/");

export interface LoadHistoryData {
  entries: SrpeEntry[];
  sessions: PeriodizationSession[];
  checkins: ReadinessCheckin[];
}

/**
 * Histórico completo do controle de carga, sob demanda. Nada é apagado: abre nos
 * últimos 45 dias e navega para blocos anteriores de 45 em 45 dias.
 */
const LoadHistoryDialog = ({ patientId, label = "Ver histórico", demoData }: { patientId: string; label?: string; demoData?: LoadHistoryData }) => {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(String(HISTORY_BLOCK_DAYS));
  const [track, setTrack] = useState("all");
  const [block, setBlock] = useState(0); // 0 = mais recente
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ entries: SrpeEntry[]; sessions: PeriodizationSession[]; checkins: ReadinessCheckin[] }>({
    entries: [], sessions: [], checkins: [],
  });

  const today = localISODate();
  const span = Number(days);
  const to = addDaysISO(today, -block * span);
  const from = addDaysISO(to, -(span - 1));

  useEffect(() => {
    if (!open) return;
    if (demoData) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    Promise.all([
      supabase.from("srpe_entries").select("*").eq("patient_id", patientId).gte("session_date", from).lte("session_date", to).order("session_date"),
      supabase.from("periodization_sessions").select("*").eq("patient_id", patientId).gte("session_date", from).lte("session_date", to).order("session_date"),
      supabase.from("readiness_checkins").select("*").eq("patient_id", patientId).gte("checkin_date", from).lte("checkin_date", to).order("checkin_date"),
    ]).then(([e, s, c]) => {
      if (!alive) return;
      setData({
        entries: (e.data || []) as SrpeEntry[],
        sessions: (s.data || []) as PeriodizationSession[],
        checkins: (c.data || []) as ReadinessCheckin[],
      });
      setLoading(false);
    });
    return () => { alive = false; };
  }, [open, patientId, from, to, demoData]);

  const byTrack = <T extends { track?: string | null }>(xs: T[]) => (track === "all" ? xs : xs.filter((x) => (x.track || "physio") === track));
  const source = demoData ?? data;
  const inPeriod = (date: string) => date >= from && date <= to;
  const entries = byTrack(source.entries.filter(e => inPeriod(e.session_date)));
  const sessions = byTrack(source.sessions.filter(s => inPeriod(s.session_date)));
  const checkins = source.checkins.filter(c => inPeriod(c.checkin_date));
  const series = useMemo(() => rollingDailySeries(entries, from, to), [entries, from, to]);
  const total = series.reduce((a, d) => a + d.total, 0);

  const groups: DayGroup[] = useMemo(() => {
    const pairs = pairSessionsWithSrpe(sessions as any, entries as any).filter((p) => p.plannedLoad > 0);
    const matched = new Set(pairs.filter((p) => p.ratio !== null).map((p) => `${p.session.session_date.slice(0, 10)}|${p.session.track}`));
    type Row = { date: string; key: string; left: string; right: string; load: number; pending: boolean };
    const rows: Row[] = [
      ...pairs.map((p) => ({
        date: p.session.session_date.slice(0, 10),
        key: `p-${p.session.id}`,
        left: `${TRACK_LABEL[p.session.track as string] || p.session.track}${p.session.title ? ` · ${p.session.title}` : ""}`,
        right: `${p.plannedLoad} → ${p.ratio !== null ? `${p.realLoad} · ${p.verdict ? DOSE_LABEL[p.verdict] : "—"}` : p.session.session_date > today ? "a realizar" : "sem resposta"}`,
        load: p.ratio !== null ? p.realLoad : 0,
        pending: p.ratio === null && p.session.session_date <= today,
      })),
      ...entries
        .filter((e) => !matched.has(`${e.session_date}|${e.track || "physio"}`))
        .map((e) => ({
          date: e.session_date,
          key: `e-${e.id}`,
          left: `${TRACK_LABEL[e.track || "physio"] ?? e.track}${e.monitor_source ? " · monitorada" : ""}`,
          right: `sRPE ${trainingLoad(e.duration_min, e.rpe)}${e.trimp ? ` · TRIMP ${e.trimp}` : ""}`,
          load: trainingLoad(e.duration_min, e.rpe),
          pending: false,
        })),
      ...(track === "all" ? checkins : []).map((c) => ({
        date: c.checkin_date,
        key: `c-${c.id}`,
        left: "Check-in",
        right: `Prontidão ${readinessScore(c) ?? "—"}%${c.resting_hr ? ` · FC repouso ${c.resting_hr}` : ""}`,
        load: 0,
        pending: false,
      })),
    ];
    return groupByDay(rows, (r) => r.date).map((g) => {
      const sessionsCount = g.items.filter((r) => !r.key.startsWith("c-")).length;
      const load = g.items.reduce((a, r) => a + r.load, 0);
      const pending = g.items.filter((r) => r.pending).length;
      return {
        date: g.date,
        summary: [
          sessionsCount ? `${sessionsCount} ${sessionsCount === 1 ? "sessão" : "sessões"}` : "só check-in",
          load ? `sRPE ${load}` : null,
          pending ? `${pending} sem resposta` : null,
        ].filter(Boolean).join(" · "),
        rows: g.items.map((r) => ({ key: r.key, left: r.left, right: r.right })),
      };
    });
  }, [sessions, entries, checkins, track, today]);

  return (
    <>
      <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 rounded-xl px-2 text-[11px]" onClick={() => setOpen(true)}>
        <History className="h-3.5 w-3.5" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-base">Histórico de carga</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Select value={days} onValueChange={(v) => { setDays(v); setBlock(0); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["7", "14", "30", "45"].map((d) => <SelectItem key={d} value={d}>{d} dias</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={track} onValueChange={setTrack}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as frentes</SelectItem>
                  {Object.entries(TRACK_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => setBlock((b) => b + 1)}>
                <ChevronLeft className="h-3.5 w-3.5" /> Mais antigos
              </Button>
              <span className="text-[11px] text-muted-foreground">{fmt(from)} → {fmt(to)}</span>
              <Button type="button" size="sm" variant="outline" className="h-7 gap-1 text-[11px]" disabled={block === 0} onClick={() => setBlock((b) => Math.max(0, b - 1))}>
                Recentes <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                <p className="text-xs text-muted-foreground">Carga realizada no período: <strong className="text-foreground">{total} sRPE</strong></p>
                <DailyLoadChart data={series} height={140} />
                {groups.length ? <DayGroupList groups={groups} /> : (
                  <p className="text-xs text-muted-foreground">Sem registros neste período.</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LoadHistoryDialog;
