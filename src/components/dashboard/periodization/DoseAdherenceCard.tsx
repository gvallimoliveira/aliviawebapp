import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChevronLeft, ChevronRight, ClipboardList, Loader2, Plus, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  adherenceByTrack,
  pairSessionsWithSrpe,
  plannedLoad,
  trainingLoad,
  repeatedDoseDeviation,
  localISODate,
} from "@/lib/periodization";
import { CHART_WINDOW_DAYS, TEXT_WINDOW_DAYS, groupByDay, inWindow, recentDaysWindow } from "@/lib/loadWindows";
import DayGroupList, { type DayGroup } from "./DayGroupList";
import LoadHistoryDialog from "./LoadHistoryDialog";
import type { PeriodizationSession, SrpeEntry } from "@/lib/periodizationData";
import { savePlannedDose } from "@/lib/periodizationData";
import { DOSE_CLASS, DOSE_LABEL, TRACK_LABEL } from "./scales";

interface Props {
  patientId: string;
  planId?: string | null;
  sessions: PeriodizationSession[];
  entries: SrpeEntry[];
  onChanged: () => void;
  readOnly?: boolean;
}

const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  fontSize: 12,
};

/** Tooltip com a conta que forma cada barra (duração × RPE por sessão). */
const DoseTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={tooltipStyle} className="px-3 py-2 shadow-md max-w-[240px]">
      <p className="font-semibold mb-1">{label}</p>
      <p className="text-muted-foreground">Planejado: {d.Planejado}</p>
      {d.planejadoDetalhe?.map((p: string, i: number) => (
        <p key={`p${i}`} className="text-muted-foreground pl-2 text-[11px]">· {p}</p>
      ))}
      <p className="mt-1" style={{ color: "hsl(var(--primary))" }}>Percebido: {d.Percebido}</p>
      {d.percebidoDetalhe?.map((p: string, i: number) => (
        <p key={`r${i}`} className="pl-2 text-[11px]" style={{ color: "hsl(var(--primary))" }}>· {p}</p>
      ))}
      {d.Percebido === 0 && (
        <p className="pl-2 text-[11px] text-muted-foreground">· sem resposta de sRPE</p>
      )}
    </div>
  );
};

const DoseAdherenceCard = ({ patientId, planId, sessions, entries, onChanged, readOnly }: Props) => {
  const { toast } = useToast();
  const today = localISODate();
  // Janela padrão: 7 dias corridos terminando hoje (ou nos últimos dias com dado).
  const defaultWindow = useMemo(() => recentDaysWindow(
    [...entries.map((e) => e.session_date), ...sessions.filter((s) => plannedLoad(s.planned_duration_min, s.planned_rpe) > 0).map((s) => s.session_date)],
    CHART_WINDOW_DAYS, today,
  ), [entries, sessions, today]);
  const [shift, setShift] = useState(0);
  const weekStart = addDays(defaultWindow.from, shift * 7);
  const windowFallback = shift === 0 && defaultWindow.fallback;

  const summary = useMemo(() => adherenceByTrack(entries, sessions, weekStart), [entries, sessions, weekStart]);
  const pairs = useMemo(() => pairSessionsWithSrpe(sessions, entries), [sessions, entries]);
  const repeated = useMemo(() => repeatedDoseDeviation(pairs), [pairs]);

  const upcomingNext = useMemo(() => {
    const until = addDays(today, 7);
    const next = sessions.filter((s) => s.session_date.slice(0, 10) > today && s.session_date.slice(0, 10) <= until)
      .map((s) => plannedLoad(s.planned_duration_min, s.planned_rpe)).filter((l) => l > 0);
    return { count: next.length, load: next.reduce((a, l) => a + l, 0) };
  }, [sessions, today]);

  // Lista em texto: últimos 3 dias da janela exibida, agrupada por dia.
  const recentGroups = useMemo(() => {
    const end = summary.weekEnd < today ? summary.weekEnd : today;
    const relevant = pairs.filter((p) => p.plannedLoad > 0 && p.session.session_date.slice(0, 10) <= end);
    const w = recentDaysWindow(relevant.map((p) => p.session.session_date), TEXT_WINDOW_DAYS, end);
    const groups: DayGroup[] = groupByDay(relevant.filter((p) => inWindow(p.session.session_date, w)), (p) => p.session.session_date)
      .map((g) => {
        const answered = g.items.filter((p) => p.ratio !== null);
        const pending = g.items.length - answered.length;
        return {
          date: g.date,
          summary: [
            `${g.items.length} ${g.items.length === 1 ? "sessão" : "sessões"}`,
            `alvo ${g.items.reduce((a, p) => a + p.plannedLoad, 0)} → ${answered.reduce((a, p) => a + p.realLoad, 0)}`,
            pending ? `${pending} sem resposta` : null,
          ].filter(Boolean).join(" · "),
          rows: g.items.map((p, i) => ({
            key: p.session.id || String(i),
            left: `${TRACK_LABEL[p.session.track as string] || p.session.track}${p.session.title ? ` · ${p.session.title}` : ""}`,
            right: `${p.plannedLoad} → ${p.ratio !== null ? p.realLoad : "sem resposta"}${p.verdict ? ` · ${DOSE_LABEL[p.verdict]}` : ""}`,
          })),
        };
      });
    return { groups, fallback: w.fallback };
  }, [pairs, summary.weekEnd, today]);
  const weekly = useMemo(() => {
    const inWeek = (date: string) => date >= summary.weekStart && date <= summary.weekEnd;
    const plannedPairs = pairs.filter((p) => inWeek(p.session.session_date) && p.plannedLoad > 0);
    const actualEntries = entries.filter((e) => inWeek(e.session_date) && e.session_date <= today);
    const totalsFor = (track?: string) => {
      const selected = plannedPairs.filter((p) => !track || (p.session.track || "physio") === track);
      return {
        planned: selected.reduce((sum, p) => sum + p.plannedLoad, 0),
        real: actualEntries.filter((e) => !track || (e.track || "physio") === track)
          .reduce((sum, e) => sum + trainingLoad(e.duration_min, e.rpe), 0),
        scheduled: selected.length,
        answered: selected.filter((p) => p.session.session_date <= today && p.ratio !== null).length,
      };
    };
    return { total: totalsFor(), byTrack: Object.fromEntries(summary.byTrack.map((t) => [t.track, totalsFor(t.track)])) };
  }, [pairs, entries, summary, today]);

  const chartData = useMemo(
    () =>
      summary.byTrack
        .filter((t) => t.planned > 0 || t.real > 0)
        .map((t) => ({
          frente: TRACK_LABEL[t.track],
          Planejado: t.planned,
          Percebido: t.real,
          planejadoDetalhe: t.plannedParts,
          percebidoDetalhe: t.realParts,
        })),
    [summary],
  );

  const hasTarget = weekly.total.planned > 0 || weekly.total.real > 0;

  // Prescrição de dose
  const [open, setOpen] = useState(false);
  const [track, setTrack] = useState("gym");
  const [date, setDate] = useState(() => localISODate());
  const [duration, setDuration] = useState("");
  const [rpe, setRpe] = useState(7);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const min = Number(duration);
    if (!Number.isFinite(min) || min <= 0) {
      toast({ title: "Informe a duração planejada", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await savePlannedDose({
        patientId,
        planId,
        sessionDate: date,
        track,
        plannedDurationMin: min,
        plannedRpe: rpe,
        title: title.trim() || null,
      });
      setDuration("");
      setTitle("");
      setOpen(false);
      onChanged();
      toast({ title: "Dose prescrita", description: `Alvo: ${plannedLoad(min, rpe)} unidades.` });
    } catch (e: any) {
      toast({ title: "Não foi possível prescrever", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 periodization-card-header">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Dose planejada x percebida
            </CardTitle>
            <p className="text-[11px] text-muted-foreground pt-1">
              O sRPE é sempre do paciente. Aqui ele é comparado com a dose que você (ou o preparador) planejou.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShift((v) => v - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {shortDate(summary.weekStart)} → {shortDate(summary.weekEnd)}
            </span>
            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShift((v) => Math.min(0, v + 1))} disabled={shift === 0}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!readOnly && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline" className="gap-1 rounded-xl text-xs ml-1">
                    <ClipboardList className="h-3.5 w-3.5" /> Prescrever
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader><DialogTitle className="text-base">Dose planejada da sessão</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(TRACK_LABEL).map(([key, label]) => (
                        <Button type="button"
                          key={key}
                          size="sm"
                          variant={track === key ? "default" : "outline"}
                          className="text-[11px] rounded-xl"
                          onClick={() => setTrack(key)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Data da sessão</span>
                      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Duração planejada (min)</span>
                      <Input type="number" min={1} max={600} value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="40" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Esforço alvo (0-10)</span>
                        <Badge variant="outline" className="text-xs">{rpe}</Badge>
                      </div>
                      <Slider min={0} max={10} step={1} value={[rpe]} onValueChange={([v]) => setRpe(v)} />
                    </div>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Descrição curta (opcional)" />
                    {Number(duration) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Carga alvo: <strong>{plannedLoad(Number(duration), rpe)}</strong> unidades.
                      </p>
                    )}
                    <Button type="button" className="w-full rounded-xl gap-2" onClick={submit} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Prescrever dose
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!hasTarget ? (
          <p className="text-xs text-muted-foreground">
            Nenhuma dose planejada neste período de 7 dias. Prescreva duração e esforço alvo por frente (fisioterapia, academia,
            campo) para saber se o trabalho ficou na dose certa, subdosado ou superdosado.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 border-b border-border pb-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Planejado no período</p>
                <p className="text-lg font-semibold text-foreground">{weekly.total.planned} <span className="text-xs font-normal text-muted-foreground">sRPE</span></p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Real registrado no período</p>
                <p className="text-lg font-semibold text-foreground">{weekly.total.real} <span className="text-xs font-normal text-muted-foreground">sRPE</span></p>
              </div>
            </div>
            {windowFallback && (
              <p className="text-[10px] text-muted-foreground">Sem registros nos últimos 7 dias — exibindo os mais recentes.</p>
            )}
            <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible">
              {[...summary.byTrack.filter((t) => weekly.byTrack[t.track]?.scheduled > 0 || weekly.byTrack[t.track]?.real > 0), summary.total].map((t, i, arr) => {
                const isTotal = i === arr.length - 1;
                const week = isTotal ? weekly.total : weekly.byTrack[t.track];
                return (
                  <div
                    key={isTotal ? "total" : t.track}
                    className={`flex min-w-[78%] snap-start flex-col justify-between gap-2 rounded-xl border px-3 py-2 sm:min-w-0 ${
                      isTotal ? "border-primary/40 bg-muted/40 sm:col-span-2" : "border-border"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {isTotal ? "Comparação das sessões respondidas" : TRACK_LABEL[t.track]}
                      </p>
                      {!isTotal && <p className="text-[10px] text-muted-foreground">Período: planejado {week.planned} · Real {week.real}</p>}
                      <p className="text-[10px] text-muted-foreground">
                        Respondidas: alvo {t.planned} · Percebido {t.real}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-foreground">
                        {t.ratio !== null ? t.ratio.toFixed(2) : "—"}
                      </span>
                      {t.verdict && (
                        <Badge variant="outline" className={`text-[10px] whitespace-normal border-0 ${DOSE_CLASS[t.verdict]}`}>
                          {DOSE_LABEL[t.verdict]} ({week.answered}/{week.scheduled} sessões no período)
                        </Badge>
                      )}
                      {!t.verdict && <span className="text-[10px] text-muted-foreground">Sem comparação ({week.answered}/{week.scheduled} sessões no período)</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {chartData.length > 0 && (
              <>
              <p className="text-xs font-medium text-foreground">
                Planejado × percebido por frente <span className="font-normal text-muted-foreground">· semana atual, até hoje</span>
              </p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="frente" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                    <Tooltip content={<DoseTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Planejado" fill="hsl(var(--muted-foreground) / 0.5)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Percebido" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              </>
            )}

            {summary.byTrack.some((t) => t.verdict === "under" || t.verdict === "over") && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 space-y-1">
                {summary.byTrack
                  .filter((t) => t.verdict === "under" || t.verdict === "over")
                  .map((t) => (
                    <p key={t.track} className="text-xs text-amber-800 dark:text-amber-300">
                      {TRACK_LABEL[t.track]}: {t.verdict === "under" ? "estímulo abaixo" : "estímulo acima"} do planejado
                      ({t.ratio?.toFixed(2)}; {weekly.byTrack[t.track].answered}/{weekly.byTrack[t.track].scheduled} sessões no período). {t.verdict === "under"
                        ? "Revise a dose das próximas sessões desta frente, conforme a tolerância e a prontidão."
                        : "Considere reduzir a próxima sessão desta frente."}
                    </p>
                  ))}
                {repeated.length > 0 && (
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                    Desvio repetido em {repeated.map((r) => TRACK_LABEL[r.track]).join(", ")} — duas sessões seguidas fora
                    da dose. Ajuste a prescrição.
                  </p>
                )}
                <p className="text-[10px] opacity-80">Dose certa = ±10% do planejado (Gabbett, BJSM 2016; ACWR seguro 0,8–1,3, Hulin et al., BJSM 2016). Leitura automática. A decisão é sempre sua.</p>
              </div>
            )}

            {(summary.unanswered.length > 0 || summary.upcoming.length > 0 || summary.extras.length > 0) && (
              <p className="text-[11px] text-muted-foreground">
                A comparação usa só sessões já realizadas e com resposta.
                {summary.unanswered.length > 0 && ` ${summary.unanswered.length} sem resposta (o paciente pode informar até 7 dias depois pelo link).`}
                {summary.upcoming.length > 0 && ` ${summary.upcoming.length} a realizar.`}
                {summary.extras.length > 0 && ` ${summary.extras.length} treino(s) extra(s) fora do planejado.`}
              </p>
            )}

            {upcomingNext.count > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Próximos 7 dias: {upcomingNext.count} {upcomingNext.count === 1 ? "sessão a realizar" : "sessões a realizar"} · alvo {upcomingNext.load} sRPE.
              </p>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-foreground">
                  Sessão por sessão <span className="font-normal text-muted-foreground">· {recentGroups.fallback ? "dias mais recentes com registro" : "últimos 3 dias"}</span>
                </p>
                <LoadHistoryDialog patientId={patientId} />
              </div>
              {recentGroups.groups.length ? <DayGroupList groups={recentGroups.groups} /> : (
                <p className="text-[11px] text-muted-foreground">Nenhuma sessão planejada nos últimos 3 dias.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DoseAdherenceCard;
