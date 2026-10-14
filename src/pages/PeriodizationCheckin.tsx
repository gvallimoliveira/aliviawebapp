import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Loader2, Activity, HeartPulse, ShieldAlert, CalendarDays, ChevronDown } from "lucide-react";
import { setSeo } from "@/lib/seo";
import { CHECKIN_ITEMS, TRACK_LABEL } from "@/components/dashboard/periodization/scales";
import { plannedLoad, trainingLoad, loadLevelFromRpe } from "@/lib/periodization";
import CardioPrintReader from "@/components/periodization/CardioPrintReader";
import ExternalWorkoutImport from "@/components/periodization/ExternalWorkoutImport";
import ClinicBrandHeader from "@/components/ClinicBrandHeader";
import { clinicAssessmentTheme } from "@/lib/clinicAssessmentTheme";

const LEVEL_BADGE: Record<string, { label: string; className: string }> = {
  rest: { label: "Descanso", className: "bg-muted text-muted-foreground" },
  low: { label: "Leve", className: "bg-emerald-100 text-emerald-700" },
  moderate: { label: "Moderada", className: "bg-amber-100 text-amber-700" },
  high: { label: "Alta", className: "bg-red-100 text-red-700" },
};

const WEEK_DOW = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface WeekSession {
  session_date: string;
  track: string;
  planned_duration_min: number | null;
  planned_rpe: number | null;
  title: string | null;
}

/** Segunda-feira (UTC) da semana da data informada — mesma regra do MicroWeekGrid. */
const mondayOfISO = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
};
const addDaysISO = (iso: string, n: number): string => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Visão somente leitura do microciclo para o preparador: ele vê como a semana
 * está montada em todas as frentes antes de dosar a própria sessão. Não edita.
 */
const CoachWeekOverview = ({ sessions, today }: { sessions: WeekSession[]; today: string }) => {
  const [open, setOpen] = useState(true);
  const monday = mondayOfISO(today);
  const days = Array.from({ length: 7 }, (_, i) => addDaysISO(monday, i));
  const byDate = new Map<string, WeekSession[]>();
  sessions.forEach((s) => {
    const key = String(s.session_date).slice(0, 10);
    byDate.set(key, [...(byDate.get(key) || []), s]);
  });

  return (
    <div className="rounded-xl border border-border bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" />
          Semana planejada (visão geral)
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-[11px] text-muted-foreground">
            Veja como a semana está montada em todas as frentes para dosar melhor a sua sessão. Apenas visualização.
          </p>
          <div className="space-y-1.5">
            {days.map((day, i) => {
              const items = byDate.get(day) || [];
              const isToday = day === today;
              const label = new Date(`${day}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
              return (
                <div
                  key={day}
                  className={`rounded-lg border px-2.5 py-1.5 ${isToday ? "border-primary/50 bg-primary/5" : "border-border bg-background"}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-foreground whitespace-nowrap shrink-0">
                      {WEEK_DOW[i]} {label}
                    </span>
                    {isToday && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">hoje</Badge>}
                  </div>
                  {items.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">Sem sessão planejada</p>
                  ) : (
                    <div className="mt-1 space-y-1">
                      {items.map((s, j) => {
                        const level = LEVEL_BADGE[loadLevelFromRpe(s.planned_rpe, s.planned_duration_min)] || LEVEL_BADGE.rest;
                        return (
                          <div key={j} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-foreground">
                              <strong>{TRACK_LABEL[s.track] || s.track}</strong>
                              {s.planned_duration_min ? ` · ${s.planned_duration_min} min` : ""}
                              {s.planned_rpe !== null && s.planned_rpe !== undefined ? ` · alvo ${s.planned_rpe}/10` : ""}
                              {s.title ? ` · ${s.title}` : ""}
                            </span>
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${level.className}`}>
                              {level.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

type State = "loading" | "ready" | "error";

interface Info {
  patient_name: string | null;
  professional_name: string | null;
  clinic_name?: string | null;
  clinic_logo_url?: string | null;
  clinic_brand_color?: string | null;
  audience: string;
  label: string | null;
  plan_title: string | null;
  today: string;
  today_checkin: Record<string, number | null> | null;
  restrictions: Array<{ kind: string; text: string }>;
  today_targets?: Array<{
    id: string;
    track: string;
    planned_duration_min: number | null;
    planned_rpe: number | null;
    title: string | null;
    already_reported?: boolean;
  }>;
  week_sessions?: WeekSession[];
  /** Sessões planejadas dos últimos 7 dias ainda sem sRPE. */
  pending_sessions?: Array<{ id: string; session_date: string; track: string; planned_duration_min: number | null; title: string | null }>;
  backfill_from?: string;
}

const shortBr = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
const lastDays = (today: string, n: number) => Array.from({ length: n + 1 }, (_, i) => {
  const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - i); return d.toISOString().slice(0, 10);
});


const PeriodizationCheckin = ({ token: tokenProp, embedded }: { token?: string; embedded?: boolean }) => {
  const params = useParams<{ token: string }>();
  const token = tokenProp ?? params.token;
  const [state, setState] = useState<State>("loading");
  const [info, setInfo] = useState<Info | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [values, setValues] = useState<Record<string, number>>({});
  const [scalesTouched, setScalesTouched] = useState(false);
  const [note, setNote] = useState("");
  const [restingHr, setRestingHr] = useState("");
  const [peakHr, setPeakHr] = useState("");
  const [spo2, setSpo2] = useState("");
  const [savingCheckin, setSavingCheckin] = useState(false);
  const [checkinDone, setCheckinDone] = useState(false);

  const [track, setTrack] = useState("physio");
  const [duration, setDuration] = useState("");
  const [rpe, setRpe] = useState(5);
  const [srpeNotes, setSrpeNotes] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [savingSrpe, setSavingSrpe] = useState(false);
  const [srpeDone, setSrpeDone] = useState(false);
  // Sessão planejada do microciclo escolhida pelo paciente (pré-preenchimento).
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [freeMode, setFreeMode] = useState(false);


  // Prescrição de dose (link do treinador/preparador)
  const [planMin, setPlanMin] = useState("");
  const [planRpe, setPlanRpe] = useState(7);
  const [planTitle, setPlanTitle] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);
  const [planDone, setPlanDone] = useState(false);
  const [importMode, setImportMode] = useState(false);


  useEffect(() => {
    setSeo({
      title: "Check-in de carga e prontidão | Aliv.iA",
      description: "Registre como você está hoje e como foi a sessão de hoje.",
    });
  }, []);

  // Pré-seleciona a única sessão planejada ainda não relatada do dia.
  const applyAutoSelection = (loaded: Info) => {
    if (loaded.audience === "coach") return;
    const pending = (loaded.today_targets || []).filter((t) => !t.already_reported);
    if (pending.length === 1) {
      setSelectedSessionId(pending[0].id);
      setTrack(pending[0].track);
      setDuration(pending[0].planned_duration_min ? String(pending[0].planned_duration_min) : "");
      setFreeMode(false);
    } else {
      setSelectedSessionId(null);
      setFreeMode(pending.length === 0);
    }
  };

  const fetchInfo = async (): Promise<Info | null> => {
    const { data, error } = await supabase.functions.invoke("periodization-checkin", {
      body: { action: "load", token },
    });
    if (error || !data?.info) return null;
    return data.info as Info;
  };

  useEffect(() => {
    (async () => {
      if (!token) { setState("error"); setErrorMsg("Link inválido."); return; }
      const loaded = await fetchInfo();
      if (!loaded) {
        setState("error");
        setErrorMsg("Não encontramos este link. Ele pode ter sido desativado pelo profissional.");
        return;
      }
      setInfo(loaded);
      setSessionDate(loaded.today);
      if (loaded.audience === "coach") setTrack("gym");
      applyAutoSelection(loaded);
      // Escala parada no meio vale como resposta 5 (o paciente concorda com ela).
      const preset: Record<string, number> = {};
      CHECKIN_ITEMS.forEach((item) => {
        const v = loaded.today_checkin?.[item.key];
        preset[item.key] = typeof v === "number" ? v : 5;
      });
      setValues(preset);
      if (loaded.today_checkin) {
        const hr = loaded.today_checkin?.resting_hr;
        if (typeof hr === "number") setRestingHr(String(hr));
        const tc = loaded.today_checkin as any;
        if (typeof tc?.peak_hr === "number") setPeakHr(String(tc.peak_hr));
        if (typeof tc?.spo2 === "number") setSpo2(String(tc.spo2));
      }
      setState("ready");

    })();
  }, [token]);


  // Há notas de prontidão preenchidas que ainda não foram enviadas?
  const checkinPending = () =>
    !checkinDone && (scalesTouched || !!restingHr || !!peakHr || !!spo2 || !!note?.trim());
  // Há uma sessão (carga) preenchida que ainda não foi enviada?
  const srpePending = () => !srpeDone && Number(duration) > 0;

  const submitCheckin = async (opts: { silent?: boolean } = {}): Promise<boolean> => {
    const fail = (m: string) => { if (!opts.silent) setErrorMsg(m); return false; };
    const hrNum = restingHr ? Number(restingHr) : null;
    if (hrNum !== null && (!Number.isFinite(hrNum) || hrNum < 25 || hrNum > 140)) {
      return fail("FC ao acordar deve ficar entre 25 e 140 bpm.");
    }
    const peakNum = peakHr ? Number(peakHr) : null;
    const spoNum = spo2 ? Number(spo2) : null;
    if (peakNum !== null && (peakNum < 40 || peakNum > 240)) return fail("FC no esforço deve ficar entre 40 e 240 bpm.");
    if (spoNum !== null && (spoNum < 70 || spoNum > 100)) return fail("SpO₂ deve ficar entre 70 e 100%.");
    if (Object.keys(values).length === 0 && hrNum === null && peakNum === null && spoNum === null) {
      return fail("Responda pelo menos uma escala.");
    }
    if (!opts.silent) setErrorMsg("");
    setSavingCheckin(true);
    const { data, error } = await supabase.functions.invoke("periodization-checkin", {
      body: { action: "submit_checkin", token, values: { ...values, resting_hr: hrNum, peak_hr: peakNum, spo2: spoNum, note } },
    });
    setSavingCheckin(false);
    if (error || !data?.ok) return fail("Não foi possível enviar agora. Tente novamente.");
    setCheckinDone(true);
    // Sessão de carga preenchida mas não enviada segue junto.
    if (!opts.silent && srpePending()) await submitSrpe({ silent: true });
    return true;
  };

  const submitPlanned = async () => {
    const min = Number(planMin);
    if (!Number.isFinite(min) || min <= 0) { setErrorMsg("Informe a duração planejada em minutos."); return; }
    setErrorMsg("");
    setSavingPlan(true);
    const { data, error } = await supabase.functions.invoke("periodization-checkin", {
      body: {
        action: "submit_planned_session",
        token,
        session: {
          session_date: sessionDate || info?.today,
          track,
          planned_duration_min: min,
          planned_rpe: planRpe,
          title: planTitle,
        },
      },
    });
    setSavingPlan(false);
    if (error || !data?.ok) { setErrorMsg("Não foi possível enviar agora. Tente novamente."); return; }
    setPlanDone(true);
    setPlanMin("");
    setPlanTitle("");
    // Atualiza a visão semanal com a sessão recém-planejada.
    const refreshed = await fetchInfo();
    if (refreshed) setInfo(refreshed);
  };

  const pickSession = (t: NonNullable<Info["today_targets"]>[number]) => {
    if (t.already_reported) return;
    setSessionDate("");
    setSelectedSessionId(t.id);
    setTrack(t.track);
    setDuration(t.planned_duration_min ? String(t.planned_duration_min) : "");
    setFreeMode(false);
    setErrorMsg("");
  };

  const pickPastSession = (t: NonNullable<Info["pending_sessions"]>[number]) => {
    setSelectedSessionId(t.id);
    setTrack(t.track);
    setDuration(t.planned_duration_min ? String(t.planned_duration_min) : "");
    setSessionDate(t.session_date);
    setFreeMode(false);
    setErrorMsg("");
  };

  const submitSrpe = async (opts: { silent?: boolean } = {}): Promise<boolean> => {
    const pendingTargets = (info?.today_targets || []).filter((t) => !t.already_reported);
    const isPast = !!sessionDate && sessionDate !== info?.today;
    if (!isPast && !freeMode && pendingTargets.length > 0 && !selectedSessionId) {
      if (!opts.silent) setErrorMsg("Escolha qual sessão de hoje você fez.");
      return false;
    }
    const min = Number(duration);
    if (!Number.isFinite(min) || min <= 0) { if (!opts.silent) setErrorMsg("Informe a duração da sessão em minutos."); return false; }

    if (!opts.silent) {
      setErrorMsg("");
      // Notas de prontidão preenchidas mas não enviadas seguem junto.
      if (checkinPending()) await submitCheckin({ silent: true });
    }
    setSavingSrpe(true);
    const { data, error } = await supabase.functions.invoke("periodization-checkin", {
      body: {
        action: "submit_srpe",
        token,
        entry: {
          session_date: sessionDate || info?.today,
          track,
          duration_min: min,
          rpe,
          notes: srpeNotes,
          // Vínculo direto com a sessão planejada, quando o paciente confirmou uma.
          session_id: freeMode ? null : selectedSessionId,
        },
      },
    });
    setSavingSrpe(false);
    if (error || !data?.ok) { if (!opts.silent) setErrorMsg("Não foi possível enviar agora. Tente novamente."); return false; }
    setSrpeDone(true);
    setDuration("");
    setSrpeNotes("");
    setRpe(5);
    setSelectedSessionId(null);
    setSessionDate("");
    // Recarrega os alvos para marcar a sessão como já relatada.
    const refreshed = await fetchInfo();
    if (refreshed) {
      setInfo(refreshed);
      applyAutoSelection(refreshed);
    }
    return true;
  };


  const isCoach = info?.audience === "coach";
  const todayTargets = info?.today_targets || [];
  const pastPending = info?.pending_sessions || [];
  const answeringPast = !!sessionDate && sessionDate !== info?.today;
  const dateLabel = info?.today
    ? new Date(`${info.today}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  const content = (
      <div className={embedded ? "w-full space-y-4" : "w-full max-w-lg space-y-4"} style={clinicAssessmentTheme(info?.clinic_brand_color)}>
        {state === "ready" && info?.clinic_name && <ClinicBrandHeader {...info} />}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {isCoach ? "Planejamento da sessão (treinador)" : "Check-in de hoje"}
            </CardTitle>
            {state === "ready" && info?.clinic_name && (
              <div className="border-l-2 border-primary pl-3">
                <div className="min-w-0">
                  {info.professional_name ? (
                    <p className="text-xs text-muted-foreground truncate">Fisioterapeuta responsável: {info.professional_name}</p>
                  ) : null}
                </div>
              </div>
            )}
            {state === "ready" && (
              <p className="text-sm text-muted-foreground">
                {info?.patient_name ? <><strong>{info.patient_name}</strong> · </> : null}
                {dateLabel}
                {!info?.clinic_name && info?.professional_name ? <> · acompanhamento de <strong>{info.professional_name}</strong></> : null}
              </p>
            )}
            {state === "ready" && (
              <p className="text-xs text-muted-foreground pt-1">
                {isCoach
                  ? "Este link é do treinador/preparador: planeje a dose esperada da sessão (tipo, duração e esforço alvo). O esforço percebido (sRPE) é sempre relatado pelo próprio paciente no link dele — o sistema cruza os dois para mostrar se o trabalho ficou na dose certa, subdosado ou superdosado."
                  : "Este link é seu: conte como você está hoje e, se treinou, registre como foi a sessão. Só você responde o esforço percebido."}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {state === "loading" && (
              <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            )}
            {state === "error" && <p className="text-sm text-destructive">{errorMsg}</p>}

            {state === "ready" && (
              <Tabs defaultValue={isCoach ? "srpe" : "checkin"}>
                {!isCoach && (
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="checkin" className="gap-1 text-xs">
                      <HeartPulse className="h-3.5 w-3.5" /> Como estou
                    </TabsTrigger>
                    <TabsTrigger value="srpe" className="gap-1 text-xs">
                      <Activity className="h-3.5 w-3.5" /> Sessão de hoje
                    </TabsTrigger>
                  </TabsList>
                )}


                {!isCoach && (
                <TabsContent value="checkin" className="space-y-5 pt-4">
                  {checkinDone ? (
                    <div className="text-center py-6 space-y-2">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                      <p className="text-sm font-semibold text-foreground">Check-in enviado!</p>
                      <p className="text-xs text-muted-foreground">Você pode voltar amanhã para o próximo check-in.</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setCheckinDone(false)}>
                        Ajustar respostas de hoje
                      </Button>
                    </div>
                  ) : (
                    <>
                      {CHECKIN_ITEMS.map((item) => (
                        <div key={item.key} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{item.label}</span>
                            <Badge variant="outline" className="text-xs">
                              {values[item.key] ?? 5}
                            </Badge>
                          </div>
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            dragOnly
                            value={[values[item.key] ?? 5]}
                            onValueChange={([v]) => { setScalesTouched(true); setValues((prev) => ({ ...prev, [item.key]: v })); }}
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span><strong className="text-foreground">1</strong> · {item.low}</span>
                            <span>{item.high} · <strong className="text-foreground">10</strong></span>
                          </div>
                        </div>
                      ))}
                      <div className="space-y-1.5 rounded-xl border border-border p-3">
                        <label htmlFor="resting-hr" className="text-sm font-medium text-foreground">
                          Frequência cardíaca ao acordar (opcional)
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          Meça em repouso, antes de levantar (relógio, cinta ou 60 s no pulso). Subir 5–7 bpm acima do seu normal pode indicar recuperação incompleta.
                        </p>
                        <div className="flex items-center gap-2">
                          <Input
                            id="resting-hr"
                            type="number"
                            inputMode="numeric"
                            min={25}
                            max={140}
                            value={restingHr}
                            onChange={(e) => setRestingHr(e.target.value)}
                            placeholder="ex.: 58"
                            className="w-28"
                          />
                          <span className="text-xs text-muted-foreground">bpm</span>
                        </div>
                      </div>
                      <div className="space-y-1.5 rounded-xl border border-border p-3">
                        <p className="text-sm font-medium text-foreground">Coração no treino (opcional)</p>
                        {(info as any)?.hr_ceiling ? (
                          <p className="text-[11px] text-foreground">
                            Seu teto de batimentos: <strong>{(info as any).hr_ceiling} bpm</strong>. Se tiver monitor cardíaco com alarme, configure o aviso nesse valor. Passou dele, reduza o ritmo.
                          </p>
                        ) : null}
                        <p className="text-[11px] text-muted-foreground">
                          Sem monitor cardíaco (cinta, relógio ou pulseira)? Use um oxímetro de dedo: meça em repouso, ao fim da série ou bloco e após 2–3 min de recuperação.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <Input type="number" inputMode="numeric" value={peakHr} onChange={(e) => setPeakHr(e.target.value)} placeholder="FC mais alta" className="w-32" aria-label="FC mais alta no treino" />
                          <span className="text-xs text-muted-foreground">bpm</span>
                          <Input type="number" inputMode="numeric" value={spo2} onChange={(e) => setSpo2(e.target.value)} placeholder="SpO₂" className="w-24" aria-label="SpO2" />
                          <span className="text-xs text-muted-foreground">%</span>
                        </div>
                        {peakHr && (info as any)?.hr_ceiling && Number(peakHr) > (info as any).hr_ceiling && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">Acima do seu teto. Seu fisioterapeuta será avisado.</p>
                        )}
                        {spo2 && Number(spo2) < 92 && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-400">Oxigenação abaixo de 92%. Descanse e avise seu fisioterapeuta; se tiver falta de ar ou dor no peito, procure atendimento.</p>
                        )}
                      </div>
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        maxLength={1000}
                        placeholder="Algo que queira contar sobre hoje? (opcional)"
                        className="text-sm"
                      />
                      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
                      <Button className="w-full rounded-xl gap-2" onClick={() => submitCheckin()} disabled={savingCheckin}>
                        {savingCheckin ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Enviar check-in
                      </Button>
                    </>
                  )}
                </TabsContent>
                )}


                <TabsContent value="srpe" className="space-y-4 pt-4">
                  {isCoach && info?.week_sessions && (
                    <CoachWeekOverview sessions={info.week_sessions} today={info.today} />
                  )}
                  {isCoach ? (
                    planDone ? (
                      <div className="text-center py-6 space-y-2">
                        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                        <p className="text-sm font-semibold text-foreground">Dose planejada registrada!</p>
                        <p className="text-xs text-muted-foreground">
                          Quando o paciente relatar o esforço percebido, o fisioterapeuta verá se ficou na dose certa.
                        </p>
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => setPlanDone(false)}>
                          Planejar outra sessão
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1.5">
                          <label htmlFor="coach-track" className="text-sm font-medium text-foreground">Frente de trabalho</label>
                          <Select value={track} onValueChange={setTrack}>
                            <SelectTrigger id="coach-track" className="h-11 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(TRACK_LABEL).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Tabs value={importMode ? "import" : "manual"} onValueChange={(value) => setImportMode(value === "import")} className="border-t border-border pt-4">
                          <TabsList className="grid h-11 w-full grid-cols-2 rounded-lg">
                            <TabsTrigger value="manual" className="h-9 text-xs">Duração e esforço</TabsTrigger>
                            <TabsTrigger value="import" className="h-9 text-xs">Importar treino</TabsTrigger>
                          </TabsList>
                        </Tabs>

                        {importMode ? (
                          <ExternalWorkoutImport
                            token={token ?? ""}
                            track={track}
                            onSaved={async () => {
                              setPlanDone(true);
                              const refreshed = await fetchInfo();
                              if (refreshed) setInfo(refreshed);
                            }}
                          />
                        ) : (<>


                        <div className="space-y-1.5">
                          <span className="text-sm font-medium text-foreground">Data da sessão</span>
                          <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
                          <p className="text-[10px] text-muted-foreground">
                            Pode planejar para hoje ou para os próximos dias.
                          </p>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-sm font-medium text-foreground">Duração planejada (minutos)</span>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={600}
                            value={planMin}
                            onChange={(e) => setPlanMin(e.target.value)}
                            placeholder="Ex.: 40"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">Esforço alvo (0-10)</span>
                            <Badge variant="outline" className="text-xs">{planRpe}</Badge>
                          </div>
                          <Slider dragOnly min={0} max={10} step={1} value={[planRpe]} onValueChange={([v]) => setPlanRpe(v)} />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Muito leve</span><span>Máximo</span>
                          </div>
                        </div>

                        {Number(planMin) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Dose alvo desta sessão: <strong>{plannedLoad(Number(planMin), planRpe)}</strong> unidades
                            ({planMin} min × {planRpe}).
                          </p>
                        )}

                        <Textarea
                          value={planTitle}
                          onChange={(e) => setPlanTitle(e.target.value)}
                          rows={2}
                          maxLength={200}
                          placeholder="O que está planejado? (opcional)"
                          className="text-sm"
                        />
                        {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
                        <Button className="w-full rounded-xl gap-2" onClick={submitPlanned} disabled={savingPlan}>
                          {savingPlan ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                          Salvar dose planejada
                        </Button>
                        </>)}
                      </>
                    )
                  ) : srpeDone ? (
                    <div className="text-center py-6 space-y-2">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                      <p className="text-sm font-semibold text-foreground">Sessão registrada!</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setSrpeDone(false)}>
                        Registrar outra sessão
                      </Button>
                    </div>
                  ) : (
                    <>
                      {pastPending.length > 0 && (
                        <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                          <span className="text-sm font-medium text-foreground">Sessões dos últimos dias sem resposta</span>
                          <p className="text-[11px] text-muted-foreground">Você pode informar como foram até 7 dias depois.</p>
                          <div className="space-y-1.5">
                            {pastPending.map((t) => {
                              const active = selectedSessionId === t.id;
                              return (
                                <button key={t.id} type="button" onClick={() => pickPastSession(t)}
                                  className={`w-full text-left rounded-xl border px-3 py-2 transition ${active ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/60"}`}>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-foreground capitalize">{shortBr(t.session_date)} · {TRACK_LABEL[t.track] || t.track}</span>
                                    {active ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <span className="text-[11px] text-primary">Responder</span>}
                                  </div>
                                  {t.title && <p className="text-[11px] text-muted-foreground">{t.title}</p>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {todayTargets.length > 0 && !freeMode ? (
                        <div className="space-y-2">
                          <span className="text-sm font-medium text-foreground">Suas sessões de hoje</span>
                          <div className="space-y-2">
                            {todayTargets.map((t) => {
                              const done = !!t.already_reported;
                              const active = selectedSessionId === t.id && !done;
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => pickSession(t)}
                                  disabled={done}
                                  className={`w-full text-left rounded-xl border px-3 py-2 transition ${
                                    active
                                      ? "border-primary bg-primary/5"
                                      : done
                                        ? "border-border bg-muted/40 opacity-70 cursor-default"
                                        : "border-border hover:border-primary/60"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-sm font-medium text-foreground">
                                      {TRACK_LABEL[t.track] || t.track}
                                    </span>
                                    {done ? (
                                      <Badge variant="secondary" className="text-[10px]">Já registrada</Badge>
                                    ) : active ? (
                                      <CheckCircle2 className="h-4 w-4 text-primary" />
                                    ) : null}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground">
                                    {t.planned_duration_min ? `~${t.planned_duration_min} min` : "duração livre"}
                                    {t.planned_rpe !== null && t.planned_rpe !== undefined
                                      ? ` · esforço alvo ${t.planned_rpe}/10`
                                      : ""}
                                    {t.title ? ` · ${t.title}` : ""}
                                  </p>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Responda pelo que você realmente sentiu — não precisa bater com o alvo.
                          </p>
                          <button
                            type="button"
                            onClick={() => { setFreeMode(true); setSelectedSessionId(null); setDuration(""); }}
                            className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-primary"
                          >
                            Registrar treino extra (hoje ou até 7 dias atrás)
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="text-sm font-medium text-foreground">Dia da sessão</span>
                          {info?.today && (
                            <select
                              value={sessionDate || info.today}
                              onChange={(e) => { setSessionDate(e.target.value === info.today ? "" : e.target.value); setSelectedSessionId(null); }}
                              className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm capitalize"
                              aria-label="Dia da sessão"
                            >
                              {lastDays(info.today, 7).map((d, i) => (
                                <option key={d} value={d}>{i === 0 ? "Hoje" : i === 1 ? "Ontem" : shortBr(d)}</option>
                              ))}
                            </select>
                          )}
                          <span className="text-sm font-medium text-foreground pt-1 block">Tipo de sessão</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {Object.entries(TRACK_LABEL).map(([key, label]) => (
                              <Button
                                key={key}
                                type="button"
                                variant={track === key ? "default" : "outline"}
                                size="sm"
                                className="text-xs rounded-xl"
                                onClick={() => setTrack(key)}
                              >
                                {label}
                              </Button>
                            ))}
                          </div>
                          {todayTargets.length > 0 && (
                            <button
                              type="button"
                              onClick={() => { setFreeMode(false); applyAutoSelection(info!); }}
                              className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-primary"
                            >
                              Voltar para as sessões planejadas
                            </button>
                          )}
                        </div>
                      )}





                      {track === "cardio" && token && (
                        <CardioPrintReader
                          token={token}
                          onApply={(r) => {
                            if (r.duration_min) setDuration(String(Math.round(r.duration_min)));
                            if (r.suggested_rpe !== null) setRpe(Math.round(r.suggested_rpe));
                            if (r.max_hr) setPeakHr(String(Math.round(r.max_hr)));
                            if (r.spo2) setSpo2(String(Math.round(r.spo2)));
                            const parts = [r.distance_km && `${r.distance_km} km`, r.avg_hr && `FC média ${r.avg_hr}`, r.max_hr && `FC máx. ${r.max_hr}`, r.spo2 && `SpO₂ ${r.spo2}%`].filter(Boolean);
                            if (parts.length) setSrpeNotes((n) => [n, `Print: ${parts.join(", ")}`].filter(Boolean).join(" · "));
                          }}
                        />
                      )}
                      {answeringPast && !freeMode && (
                        <p className="text-xs font-medium text-primary">Respondendo a sessão de {shortBr(sessionDate)}</p>
                      )}
                      <div className="space-y-1.5">
                        <span className="text-sm font-medium text-foreground">
                          Duração real (minutos){!freeMode && selectedSessionId ? " — ajuste se foi diferente" : ""}
                        </span>

                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={600}
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          placeholder="Ex.: 50"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">Esforço percebido (0-10)</span>
                          <Badge variant="outline" className="text-xs">{rpe}</Badge>
                        </div>
                        <Slider dragOnly min={0} max={10} step={1} value={[rpe]} onValueChange={([v]) => setRpe(v)} />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Muito leve</span><span>Máximo</span>
                        </div>
                      </div>

                      {Number(duration) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Carga desta sessão: <strong>{trainingLoad(Number(duration), rpe)}</strong> unidades.
                        </p>
                      )}

                      <Textarea
                        value={srpeNotes}
                        onChange={(e) => setSrpeNotes(e.target.value)}
                        rows={2}
                        maxLength={1000}
                        placeholder="Observações da sessão (opcional)"
                        className="text-sm"
                      />
                      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
                      <Button className="w-full rounded-xl gap-2" onClick={() => submitSrpe()} disabled={savingSrpe}>
                        {savingSrpe ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Registrar sessão
                      </Button>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {state === "ready" && info && info.restrictions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Orientações do fisioterapeuta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {info.restrictions.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Badge
                    variant="outline"
                    className={r.kind === "allow"
                      ? "text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
                      : "text-rose-700 dark:text-rose-400 border-rose-500/40"}
                  >
                    {r.kind === "allow" ? "Pode" : "Evitar"}
                  </Badge>
                  <span className="text-foreground">{r.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="text-[11px] text-muted-foreground text-center">
          Estes registros ajudam seu fisioterapeuta a ajustar a carga. Não substituem avaliação presencial.
        </p>
      </div>
  );

  if (embedded) return content;
  return (
    <main className="min-h-screen bg-background flex items-start justify-center px-4 py-8">
      {content}
    </main>
  );
};

export default PeriodizationCheckin;
