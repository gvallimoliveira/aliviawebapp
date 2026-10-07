import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine,
} from "recharts";
import { Activity, HeartPulse, Loader2, Plus, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { loadStatus, localISODate, readinessScore, recoverySignal, restingHrStatus, trainingLoad } from "@/lib/periodization";
import type { ReadinessCheckin, SrpeEntry } from "@/lib/periodizationData";
import { saveProfessionalSession, saveCheckin } from "@/lib/periodizationData";
import { CHECKIN_ITEMS, LEVEL_CLASS, TRACK_LABEL, ZONE_LABEL } from "./scales";
import { CHART_WINDOW_DAYS, inWindow, recentDaysWindow, rollingDailySeries } from "@/lib/loadWindows";
import DailyLoadChart from "./DailyLoadChart";
import LoadHistoryDialog from "./LoadHistoryDialog";

interface Props {
  patientId: string;
  planId?: string | null;
  entries: SrpeEntry[];
  checkins: ReadinessCheckin[];
  onChanged: () => void;
  readOnly?: boolean;
}

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--card))",
  fontSize: 12,
};

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const LoadMonitorCard = ({ patientId, planId, entries, checkins, onChanged, readOnly }: Props) => {
  const { toast } = useToast();
  const status = useMemo(() => loadStatus(entries, checkins), [entries, checkins]);
  const hr = useMemo(() => restingHrStatus(checkins), [checkins]);
  // Prontidão do check-in é a base; a FC ao acordar, quando existe, tem prioridade (vale a mais cautelosa).
  const recovery = useMemo(() => recoverySignal(checkins as any), [checkins]);
  const advice = useMemo(() => {
    const out = [...status.messages];
    const hrDriven = (recovery.source === "resting_hr" || recovery.source === "both") && recovery.strained && (hr.level === "caution" || hr.level === "danger");
    if (hrDriven) out.unshift(hr.level === "danger"
      ? `FC ao acordar +${hr.delta} bpm da base: recuperação comprometida, considere reduzir a carga de hoje.`
      : `FC ao acordar +${hr.delta} bpm da base: acima do habitual, acompanhe sono e fadiga.`);
    return out;
  }, [status.messages, recovery, hr]);
  const adviceLevel = recovery.level === "danger" ? "danger" : status.level === "ok" && recovery.level === "caution" ? "caution" : status.level;

  // Detalhamento da prontidão: check-ins da data que forma o score exibido
  const [readinessOpen, setReadinessOpen] = useState(false);
  const readinessDetail = useMemo(() => {
    if (status.readiness === null) return null;
    const dated = checkins.filter((c) => readinessScore(c) !== null);
    if (dated.length === 0) return null;
    const lastDate = dated.reduce((max, c) => (c.checkin_date > max ? c.checkin_date : max), dated[0].checkin_date);
    const sameDay = checkins.filter((c) => c.checkin_date === lastDate);
    return {
      date: new Date(`${lastDate}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
      items: sameDay,
    };
  }, [checkins, status.readiness]);

  const chartWindow = useMemo(() => {
    const w = recentDaysWindow([...entries.map((e) => e.session_date), ...checkins.map((c) => c.checkin_date)], CHART_WINDOW_DAYS, localISODate());
    const series = rollingDailySeries(entries, w.from, w.to);
    return { ...w, series, total: series.reduce((a, d) => a + d.total, 0) };
  }, [entries, checkins]);

  const readinessData = useMemo(
    () =>
      checkins
        .filter((c) => inWindow(c.checkin_date, chartWindow))
        .map((c) => ({ date: shortDate(c.checkin_date), Prontidão: readinessScore(c) }))
        .filter((d) => d.Prontidão !== null),
    [checkins, chartWindow],
  );

  // Formulário de sRPE
  const [srpeOpen, setSrpeOpen] = useState(false);
  const [track, setTrack] = useState("physio");
  const [duration, setDuration] = useState("");
  const [rpe, setRpe] = useState(5);
  const [srpeDate, setSrpeDate] = useState(localISODate());
  const [savingSrpe, setSavingSrpe] = useState(false);

  // Formulário de check-in manual (fisio registrando pelo paciente)
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [values, setValues] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [checkinDate, setCheckinDate] = useState(localISODate());
  const [savingCheckin, setSavingCheckin] = useState(false);

  const submitSrpe = async () => {
    const min = Number(duration);
    if (!Number.isFinite(min) || min <= 0) {
      toast({ title: "Informe a duração da sessão", variant: "destructive" });
      return;
    }
    setSavingSrpe(true);
    try {
      await saveProfessionalSession({ patientId, planId, sessionDate: srpeDate, track, durationMin: min, rpe });
      setDuration("");
      setSrpeOpen(false);
      onChanged();
      toast({ title: "Sessão registrada", description: `Carga: ${trainingLoad(min, rpe)} unidades.` });
    } catch (e: any) {
      toast({ title: "Não foi possível registrar", description: e?.message, variant: "destructive" });
    } finally {
      setSavingSrpe(false);
    }
  };

  const submitCheckin = async () => {
    if (Object.keys(values).length === 0) {
      toast({ title: "Responda pelo menos uma escala", variant: "destructive" });
      return;
    }
    setSavingCheckin(true);
    try {
      await saveCheckin({ patientId, planId, date: checkinDate, ...values, note, source: "professional" });
      setValues({});
      setNote("");
      setCheckinOpen(false);
      onChanged();
      toast({ title: "Check-in registrado" });
    } catch (e: any) {
      toast({ title: "Não foi possível registrar", description: e?.message, variant: "destructive" });
    } finally {
      setSavingCheckin(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 periodization-card-header">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Carga e prontidão
          </CardTitle>
          {!readOnly && (
            <div className="flex gap-2">
              <Dialog open={checkinOpen} onOpenChange={setCheckinOpen}>
                <DialogTrigger asChild>
                  <Button type="button" size="sm" variant="outline" className="gap-1 rounded-xl text-xs">
                    <HeartPulse className="h-3.5 w-3.5" /> Check-in
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
                  <DialogHeader><DialogTitle className="text-base">Check-in de prontidão</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Data</span>
                      <Input type="date" value={checkinDate} onChange={(e) => setCheckinDate(e.target.value)} />
                    </div>
                    {CHECKIN_ITEMS.map((item) => (
                      <div key={item.key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-foreground">{item.label}</span>
                          <Badge variant="outline" className="text-xs">{values[item.key] ?? "—"}</Badge>
                        </div>
                        <Slider
                          min={1} max={10} step={1}
                          value={[values[item.key] ?? 5]}
                          onValueChange={([v]) => setValues((prev) => ({ ...prev, [item.key]: v }))}
                        />
                      </div>
                    ))}
                    <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Observação (opcional)" className="text-sm" />
                    <Button type="button" className="w-full rounded-xl gap-2" onClick={submitCheckin} disabled={savingCheckin}>
                      {savingCheckin ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Salvar check-in
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Números-chave */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-xl border border-border p-2">
            <p className="text-[10px] text-muted-foreground">Carga aguda (7d)</p>
            <p className="text-lg font-semibold text-foreground">{status.acuteLoad}</p>
          </div>
          <div className="rounded-xl border border-border p-2">
            <p className="text-[10px] text-muted-foreground">Crônica (28d · média semanal)</p>
            <p className="text-lg font-semibold text-foreground">
              {status.baselineReady ? status.chronicLoad : "—"}
            </p>
            {!status.baselineReady && <p className="text-[10px] text-muted-foreground">Histórico insuficiente</p>}
          </div>
          <div className="rounded-xl border border-border p-2">
            <p className="text-[10px] text-muted-foreground">ACWR</p>
            <p className="text-lg font-semibold text-foreground">{status.acwr ?? "—"}</p>
            {status.zone
              ? <p className="text-[10px] text-muted-foreground">{ZONE_LABEL[status.zone]}</p>
              : <p className="text-[10px] text-muted-foreground">Aguardando histórico</p>}
          </div>

          <button
            type="button"
            onClick={() => readinessDetail && setReadinessOpen(true)}
            disabled={!readinessDetail}
            className="rounded-xl border border-border p-2 text-left transition hover:bg-accent/50 disabled:cursor-default disabled:hover:bg-transparent"
          >
            <p className="text-[10px] text-muted-foreground">Prontidão</p>
            <p className={`text-lg font-semibold ${recovery.level === "danger" ? "text-rose-700 dark:text-rose-400" : recovery.level === "caution" ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}>
              {status.readiness !== null ? `${status.readiness}%` : "—"}
            </p>
            {hr.latest !== null && (
              <p className="text-[10px] text-muted-foreground">
                FC ao acordar {hr.latest} bpm{hr.delta !== null ? ` (${hr.delta > 0 ? "+" : ""}${hr.delta})` : ""}
              </p>
            )}
            {readinessDetail && <p className="text-[10px] text-primary">Toque para ver as respostas</p>}
          </button>
        </div>

        {/* Sugestões */}
        {advice.length > 0 && (
          <div className={`rounded-xl border px-3 py-2 space-y-1 ${LEVEL_CLASS[adviceLevel]}`}>
            {advice.map((m, i) => (
              <p key={i} className="text-xs">{m}</p>
            ))}
            <p className="text-[10px] opacity-80">Sugestões automáticas. A decisão clínica é sempre sua.</p>
          </div>
        )}

        {/* Carga dos últimos 7 dias corridos */}
        <div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-foreground">
              Carga total dos últimos 7 dias <span className="font-normal text-muted-foreground">· todas as frentes · {chartWindow.total} sRPE</span>
            </p>
            <LoadHistoryDialog patientId={patientId} />
          </div>
          {chartWindow.fallback && (
            <p className="mb-1 text-[10px] text-muted-foreground">Sem registros nos últimos 7 dias — exibindo os mais recentes.</p>
          )}
          <DailyLoadChart data={chartWindow.series} />
        </div>

        {/* Prontidão */}
        {readinessData.length > 1 && (
          <div>
            <p className="text-xs font-medium text-foreground mb-1">Prontidão (0-100)</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={readinessData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <ReferenceLine y={40} stroke="hsl(0, 70%, 55%)" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="Prontidão" stroke="hsl(150, 60%, 40%)" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {entries.length === 0 && checkins.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Sem registros ainda. Use os botões acima para lançar a sessão de hoje ou envie um link de check-in ao paciente.
          </p>
        )}

        {/* Detalhe das respostas que formam a prontidão exibida */}
        <Dialog open={readinessOpen} onOpenChange={setReadinessOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base">Prontidão de {readinessDetail?.date}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {readinessDetail?.items.map((c) => {
                const score = readinessScore(c);
                const answered = CHECKIN_ITEMS.filter((it) => typeof c[it.key] === "number");
                return (
                  <div key={c.id} className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">
                        {c.source === "coach" ? "Preparador" : c.source === "professional" ? "Fisioterapeuta" : "Paciente"}
                      </Badge>
                      <p className="text-sm font-semibold text-foreground">{score !== null ? `${score}%` : "—"}</p>
                    </div>
                    {answered.length === 0 && (
                      <p className="text-xs text-muted-foreground">Nenhuma escala respondida neste registro.</p>
                    )}
                    {answered.map((it) => {
                      const raw = c[it.key] as number;
                      const pts = it.inverse ? 11 - raw : raw;
                      return (
                        <div key={it.key} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-muted-foreground">{it.label}</span>
                          <span className="font-medium text-foreground whitespace-nowrap">
                            {raw}/10{it.inverse ? ` → ${pts} pts` : ""}
                          </span>
                        </div>
                      );
                    })}
                    {c.note && <p className="text-xs italic text-muted-foreground">“{c.note}”</p>}
                  </div>
                );
              })}
              <p className="text-[10px] text-muted-foreground">
                Cada escala vale 1-10. Nas escalas ruins (dor, fadiga, estresse, dor muscular) a nota é invertida (11 − nota) antes da média, convertida para 0-100.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default LoadMonitorCard;
