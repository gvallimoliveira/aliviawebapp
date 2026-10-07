import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, FileDown, Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { backToBackHighDays, loadLevelFromRpe, localISODate, pairSessionsWithSrpe, plannedLoad } from "@/lib/periodization";
import type { PeriodizationSession, SrpeEntry } from "@/lib/periodizationData";
import { deleteSession, savePlannedDose, saveProfessionalSession } from "@/lib/periodizationData";
import { DOSE_CLASS, DOSE_LABEL, PLANNED_LOAD_CLASS, PLANNED_LOAD_LABEL, TRACK_LABEL } from "./scales";
import { Slider } from "@/components/ui/slider";

interface Props {
  planId: string;
  patientId: string;
  sessions: PeriodizationSession[];
  /** sRPE relatado pelo paciente, para o selo de aderência de dose. */
  entries?: SrpeEntry[];
  onChanged: () => void;
  readOnly?: boolean;
  /** Dados só para o PDF do plano da semana entregue ao paciente. */
  patientName?: string | null;
  professionalName?: string | null;
  sport?: string | null;
  currentPhase?: string | null;
}

const mondayOf = (d: Date): string => {
  const copy = new Date(d.getTime());
  const dow = (copy.getUTCDay() + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - dow);
  return copy.toISOString().slice(0, 10);
};

const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const DOW = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const MicroWeekGrid = ({
  planId,
  patientId,
  sessions,
  entries = [],
  onChanged,
  readOnly,
  patientName,
  professionalName,
  sport,
  currentPhase,
}: Props) => {
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [editing, setEditing] = useState<{ date: string } | null>(null);
  const [track, setTrack] = useState("physio");
  const [title, setTitle] = useState("");
  const [plannedMin, setPlannedMin] = useState("");
  const [plannedRpe, setPlannedRpe] = useState(7);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Atalho: clicar numa sessão planejada (hoje ou até 7 dias atrás) abre o
  // registro de sessão monitorada já preenchido com data, frente e dose alvo.
  const [monitoring, setMonitoring] = useState<PeriodizationSession | null>(null);
  const [monDuration, setMonDuration] = useState("");
  const [monRpe, setMonRpe] = useState("");
  const [monHrAvg, setMonHrAvg] = useState("");
  const [monHrMax, setMonHrMax] = useState("");
  const [monSpo2, setMonSpo2] = useState("");
  const [monHrRec, setMonHrRec] = useState("");
  const [monDistance, setMonDistance] = useState("");
  const [monNotes, setMonNotes] = useState("");
  const [monSaving, setMonSaving] = useState(false);

  // Selo de dose por sessão (alvo prescrito x sRPE relatado pelo paciente).
  const doseBySession = useMemo(() => {
    const map = new Map<string, { verdict: string | null; realLoad: number; plannedLoad: number }>();
    pairSessionsWithSrpe(sessions, entries).forEach((p) => {
      if (p.session.id) map.set(p.session.id, { verdict: p.verdict, realLoad: p.realLoad, plannedLoad: p.plannedLoad });
    });
    return map;
  }, [sessions, entries]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const flagged = useMemo(() => new Set(backToBackHighDays(sessions)), [sessions]);

  const byDay = useMemo(() => {
    const map = new Map<string, PeriodizationSession[]>();
    sessions.forEach((s) => {
      const key = s.session_date.slice(0, 10);
      map.set(key, [...(map.get(key) || []), s]);
    });
    return map;
  }, [sessions]);

  // Nível de intensidade do calendário deriva da nota de sRPE alvo.
  const load = loadLevelFromRpe(plannedRpe, String(plannedMin).trim() === "" ? null : Number(plannedMin));

  const add = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await savePlannedDose({
        patientId,
        planId,
        sessionDate: editing.date,
        track,
        plannedLoad: load,
        plannedDurationMin: Number(plannedMin) > 0 ? Number(plannedMin) : 0,
        plannedRpe,
        title: title.trim() || null,
      });
      setTitle("");
      setPlannedMin("");
      (document.activeElement as HTMLElement | null)?.blur?.();
      onChanged();
      setEditing(null);
    } catch (e: any) {
      toast({ title: "Não foi possível salvar", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await deleteSession(id);
    onChanged();
  };

  /** Sessão planejada elegível ao registro monitorado: hoje ou até 7 dias atrás. */
  const canMonitor = (s: PeriodizationSession): boolean => {
    if (readOnly || !s.id) return false;
    const d = s.session_date.slice(0, 10);
    const todayIso = localISODate();
    return d <= todayIso && d >= addDays(todayIso, -7);
  };

  const openMonitoring = (s: PeriodizationSession) => {
    setMonitoring(s);
    setMonDuration(s.planned_duration_min > 0 ? String(s.planned_duration_min) : "");
    setMonRpe(s.planned_rpe > 0 ? String(s.planned_rpe) : "");
    setMonHrAvg("");
    setMonHrMax("");
    setMonSpo2("");
    setMonHrRec("");
    setMonDistance("");
    setMonNotes(s.title ?? "");
  };

  const saveMonitoring = async () => {
    if (!monitoring) return;
    const d = Number(monDuration);
    const r = Number(monRpe.replace(",", "."));
    if (!(d > 0 && d <= 600)) { toast({ title: "Informe a duração", variant: "destructive" }); return; }
    if (!(r >= 0 && r <= 10)) { toast({ title: "Informe a PSE (0–10)", variant: "destructive" }); return; }
    const rec = monHrRec.trim() === "" ? null : Number(monHrRec);
    const hmax = monHrMax.trim() === "" ? null : Number(monHrMax);
    if (rec != null && (!(rec >= 30 && rec <= 240) || (hmax != null && rec >= hmax))) { toast({ title: "FC 1 min após deve ser menor que a FC máxima", variant: "destructive" }); return; }
    const dist = monDistance.trim() === "" ? null : Number(monDistance.replace(",", "."));
    if (dist != null && !(dist > 0 && dist <= 500)) { toast({ title: "Distância inválida", variant: "destructive" }); return; }
    setMonSaving(true);
    const ri = (v: string) => { const n = v.trim() === "" ? null : Number(v); return n == null ? null : Math.round(n); };
    let merged = false;
    let error: unknown = null;
    try {
      ({ merged } = await saveProfessionalSession({
        patientId,
        planId,
        sessionDate: monitoring.session_date.slice(0, 10),
        track: monitoring.track,
        durationMin: d,
        rpe: r,
        notes: monNotes,
        monitor: {
          hr_avg: ri(monHrAvg),
          hr_max: ri(monHrMax),
          spo2_min: ri(monSpo2),
          zone_minutes: null,
          trimp: null,
          monitor_source: "manual",
          hr_recovery_1min: ri(monHrRec),
          distance_km: dist != null ? Math.round(dist * 100) / 100 : null,
        },
      }));
    } catch (e) { error = e; }
    setMonSaving(false);
    if (error) { toast({ title: "Não foi possível salvar", variant: "destructive" }); return; }
    toast({ title: merged ? "Sessão unida ao check-in do paciente" : "Sessão monitorada salva" });
    setMonitoring(null);
    onChanged();
  };

  const weekLabel = `${new Date(`${weekStart}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} → ${new Date(`${addDays(weekStart, 6)}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;

  /** PDF do plano da semana, para alinhar com o paciente. */
  const exportWeekPdf = async () => {
    setExporting(true);
    try {
      const weekEnd = addDays(weekStart, 6);
      const weekSessions = sessions
        .filter((s) => {
          const d = s.session_date.slice(0, 10);
          return d >= weekStart && d <= weekEnd;
        })
        .sort((a, b) => a.session_date.localeCompare(b.session_date));
      const { downloadMicrocyclePdf } = await import("@/utils/generateMicrocyclePdf");
      await downloadMicrocyclePdf({
        weekStart,
        sessions: weekSessions,
        patientName,
        professionalName,
        sport,
        currentPhase,
      });
    } catch (e: any) {
      toast({ title: "Não foi possível gerar o PDF", description: e?.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      {/* O wrapper colapsável oculta o CardHeader (título duplicado); por isso a
          barra de semana + PDF vive dentro do CardContent, sempre visível. */}
      <CardContent className="pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1">
            <CalendarDays className="h-4 w-4 text-primary" />
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Semana anterior" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-semibold text-foreground whitespace-nowrap">{weekLabel}</span>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Próxima semana" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button type="button"
            size="sm"
            variant="outline"
            className="rounded-xl gap-1 h-8 text-[11px]"
            disabled={exporting}
            onClick={exportWeekPdf}
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            PDF da semana
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {days.map((date, i) => {
            const items = byDay.get(date) || [];
            const isFlagged = flagged.has(date);
            const isToday = date === localISODate();
            return (
              <div
                key={date}
                className={`rounded-xl border p-2 min-h-[104px] space-y-1 ${
                  isFlagged ? "border-rose-500/50 bg-rose-500/5" : isToday ? "border-primary" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-foreground">
                    {DOW[i]} {date.slice(8, 10)}
                  </span>
                  {isFlagged && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
                </div>
                {items.map((s) => (
                  <div
                    key={s.id}
                    role={canMonitor(s) ? "button" : undefined}
                    tabIndex={canMonitor(s) ? 0 : undefined}
                    onClick={() => canMonitor(s) && openMonitoring(s)}
                    onKeyDown={(e) => { if (canMonitor(s) && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openMonitoring(s); } }}
                    title={canMonitor(s) ? "Registrar sessão monitorada" : undefined}
                    className={`group rounded-lg bg-muted/60 px-1.5 py-1 ${canMonitor(s) ? "cursor-pointer hover:bg-muted transition" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium text-foreground truncate">{TRACK_LABEL[s.track] || s.track}</p>
                        {s.title && <p className="text-[10px] text-muted-foreground truncate">{s.title}</p>}
                      </div>
                      {!readOnly && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); remove(s.id); }} className="opacity-0 group-hover:opacity-100 transition">
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      <Badge variant="outline" className={`text-[9px] border-0 ${PLANNED_LOAD_CLASS[s.planned_load] || ""}`}>
                        {PLANNED_LOAD_LABEL[s.planned_load] || s.planned_load}
                      </Badge>
                      {plannedLoad(s.planned_duration_min, s.planned_rpe) > 0 && (
                        <span className="text-[9px] text-muted-foreground">
                          {s.planned_duration_min}&apos; @{s.planned_rpe} = {plannedLoad(s.planned_duration_min, s.planned_rpe)}
                        </span>
                      )}
                      {(() => {
                        const dose = doseBySession.get(s.id);
                        if (!dose?.verdict) return null;
                        return (
                          <Badge variant="outline" className={`text-[9px] border-0 ${DOSE_CLASS[dose.verdict] || ""}`}>
                            {DOSE_LABEL[dose.verdict]}
                          </Badge>
                        );
                      })()}
                    </div>
                  </div>
                ))}
                {!readOnly && (
                  <button
                    onClick={() => setEditing({ date })}
                    className="w-full text-[10px] text-muted-foreground hover:text-primary flex items-center justify-center gap-1 py-1"
                  >
                    <Plus className="h-3 w-3" /> sessão
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {flagged.size > 0 && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            Dias de alto estresse em sequência — considere intercalar carga leve ou descanso.
          </p>
        )}

        {/* Navegação explícita de semanas: permite planejar semanas futuras (ex.: no sábado, montar a próxima). */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-border/60">
          <Button type="button" size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-[11px]" onClick={() => setWeekStart(addDays(weekStart, -7))}>
            <ChevronLeft className="h-3.5 w-3.5" /> Semana anterior
          </Button>
          {weekStart !== mondayOf(new Date()) && (
            <Button type="button" size="sm" variant="ghost" className="h-8 text-[11px]" onClick={() => setWeekStart(mondayOf(new Date()))}>
              Semana atual
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" className="rounded-xl gap-1 h-8 text-[11px]" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            Próxima semana <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-sm" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader><DialogTitle className="text-base">Sessão planejada</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(TRACK_LABEL).map(([key, label]) => (
                  <Button type="button" key={key} size="sm" variant={track === key ? "default" : "outline"} className="text-[11px] rounded-xl" onClick={() => setTrack(key)}>
                    {label}
                  </Button>
                ))}
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Duração planejada (min)</span>
                <Input
                  type="number"
                  min={0}
                  max={600}
                  value={plannedMin}
                  onChange={(e) => setPlannedMin(e.target.value)}
                  placeholder="40"
                />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">sRPE alvo (0-10)</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">{plannedRpe}</Badge>
                    <Badge variant="outline" className={`text-[10px] border-0 ${PLANNED_LOAD_CLASS[load] || ""}`}>
                      {PLANNED_LOAD_LABEL[load]}
                    </Badge>
                  </div>
                </div>
                <Slider min={0} max={10} step={1} value={[plannedRpe]} onValueChange={([v]) => setPlannedRpe(v)} />
                <p className="text-[10px] text-muted-foreground">
                  {Number(plannedMin) > 0 ? (
                    <>
                      Carga alvo: <strong>{plannedLoad(Number(plannedMin), plannedRpe)}</strong> — será comparada ao sRPE
                      que o paciente relatar.
                    </>
                  ) : (
                    <>Informe a duração para calcular a carga alvo (duração × sRPE).</>
                  )}
                </p>
              </div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Descrição curta (opcional)" />
              <Button type="button" className="w-full rounded-xl gap-2" onClick={add} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Adicionar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Atalho: sessão monitorada a partir da sessão planejada clicada. */}
        <Dialog open={!!monitoring} onOpenChange={(o) => !o && setMonitoring(null)}>
          <DialogContent className="max-w-sm" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader><DialogTitle className="text-base">Sessão monitorada</DialogTitle></DialogHeader>
            {monitoring && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {monitoring.session_date.slice(0, 10).split("-").reverse().join("/")} · {TRACK_LABEL[monitoring.track] || monitoring.track}
                  {plannedLoad(monitoring.planned_duration_min, monitoring.planned_rpe) > 0 && (
                    <> — alvo {monitoring.planned_duration_min}&apos; @{monitoring.planned_rpe} = {plannedLoad(monitoring.planned_duration_min, monitoring.planned_rpe)}</>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3 [&>label]:flex [&>label]:flex-col [&>label]:gap-1 [&>label]:min-w-0 [&_input]:min-w-0 [&_input]:max-w-full">
                  <label className="text-xs space-y-1">Duração (min)<Input inputMode="numeric" value={monDuration} onChange={(e) => setMonDuration(e.target.value)} /></label>
                  <label className="text-xs space-y-1">PSE do paciente (0–10)<Input inputMode="decimal" value={monRpe} onChange={(e) => setMonRpe(e.target.value)} /></label>
                  <label className="text-xs space-y-1">FC média (bpm)<Input inputMode="numeric" value={monHrAvg} onChange={(e) => setMonHrAvg(e.target.value)} /></label>
                  <label className="text-xs space-y-1">FC máxima (bpm)<Input inputMode="numeric" value={monHrMax} onChange={(e) => setMonHrMax(e.target.value)} /></label>
                  <label className="text-xs space-y-1">FC 1 min após (bpm)<Input inputMode="numeric" value={monHrRec} onChange={(e) => setMonHrRec(e.target.value)} placeholder="opcional" /></label>
                  <label className="text-xs space-y-1">SpO₂ mínima (%)<Input inputMode="numeric" value={monSpo2} onChange={(e) => setMonSpo2(e.target.value)} placeholder="opcional" /></label>
                  <label className="text-xs space-y-1 col-span-2">Distância (km)<Input inputMode="decimal" value={monDistance} onChange={(e) => setMonDistance(e.target.value)} placeholder="opcional" /></label>
                </div>
                <Input placeholder="Observação (opcional)" value={monNotes} onChange={(e) => setMonNotes(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">
                  Para ler um print do monitor com IA ou informar minutos por zona, use o bloco &quot;Sessões monitoradas&quot;.
                </p>
                <Button type="button" className="w-full rounded-xl" disabled={monSaving} onClick={saveMonitoring}>
                  {monSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar sessão
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default MicroWeekGrid;
