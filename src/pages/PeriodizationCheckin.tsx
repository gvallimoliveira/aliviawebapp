import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Loader2, Activity, HeartPulse, ShieldAlert, CalendarDays, ChevronDown } from "lucide-react";
import { setSeo } from "@/lib/seo";
import { CHECKIN_ITEMS, TRACK_LABEL } from "@/components/dashboard/periodization/scales";
import { plannedLoad, trainingLoad, loadLevelFromRpe } from "@/lib/periodization";

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
}


const PeriodizationCheckin = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>("loading");
  const [info, setInfo] = useState<Info | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [values, setValues] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
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
      if (loaded.today_checkin) {
        const preset: Record<string, number> = {};
        CHECKIN_ITEMS.forEach((item) => {
          const v = loaded.today_checkin?.[item.key];
          if (typeof v === "number") preset[item.key] = v;
        });
        setValues(preset);
      }
      setState("ready");

    })();
  }, [token]);


  const submitCheckin = async () => {
    if (Object.keys(values).length === 0) {
      setErrorMsg("Responda pelo menos uma escala.");
      return;
    }
    setErrorMsg("");
    setSavingCheckin(true);
    const { data, error } = await supabase.functions.invoke("periodization-checkin", {
      body: { action: "submit_checkin", token, values: { ...values, note } },
    });
    setSavingCheckin(false);
    if (error || !data?.ok) { setErrorMsg("Não foi possível enviar agora. Tente novamente."); return; }
    setCheckinDone(true);
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
    setSelectedSessionId(t.id);
    setTrack(t.track);
    setDuration(t.planned_duration_min ? String(t.planned_duration_min) : "");
    setFreeMode(false);
    setErrorMsg("");
  };

  const submitSrpe = async () => {
    const pendingTargets = (info?.today_targets || []).filter((t) => !t.already_reported);
    if (!freeMode && pendingTargets.length > 0 && !selectedSessionId) {
      setErrorMsg("Escolha qual sessão de hoje você fez.");
      return;
    }
    const min = Number(duration);
    if (!Number.isFinite(min) || min <= 0) { setErrorMsg("Informe a duração da sessão em minutos."); return; }

    setErrorMsg("");
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
    if (error || !data?.ok) { setErrorMsg("Não foi possível enviar agora. Tente novamente."); return; }
    setSrpeDone(true);
    setDuration("");
    setSrpeNotes("");
    setRpe(5);
    setSelectedSessionId(null);
    // Recarrega os alvos para marcar a sessão como já relatada.
    const refreshed = await fetchInfo();
    if (refreshed) {
      setInfo(refreshed);
      applyAutoSelection(refreshed);
    }
  };


  const isCoach = info?.audience === "coach";
  const todayTargets = info?.today_targets || [];
  const dateLabel = info?.today
    ? new Date(`${info.today}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  return (
    <main className="min-h-screen bg-background flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {isCoach ? "Planejamento da sessão (treinador)" : "Check-in de hoje"}
            </CardTitle>
            {state === "ready" && (
              <p className="text-sm text-muted-foreground">
                {info?.patient_name ? <><strong>{info.patient_name}</strong> · </> : null}
                {dateLabel}
                {info?.professional_name ? <> · acompanhamento de <strong>{info.professional_name}</strong></> : null}
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
                      <p className="text-xs text-muted-foreground">
                        Escala de 1 a 10. Responda o que fizer sentido — nada é obrigatório.
                      </p>
                      {CHECKIN_ITEMS.map((item) => (
                        <div key={item.key} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-foreground">{item.label}</span>
                            <Badge variant="outline" className="text-xs">
                              {values[item.key] ?? "—"}
                            </Badge>
                          </div>
                          <Slider
                            min={1}
                            max={10}
                            step={1}
                            value={[values[item.key] ?? 5]}
                            onValueChange={([v]) => setValues((prev) => ({ ...prev, [item.key]: v }))}
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>{item.low}</span>
                            <span>{item.high}</span>
                          </div>
                        </div>
                      ))}
                      <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        rows={3}
                        maxLength={1000}
                        placeholder="Algo que queira contar sobre hoje? (opcional)"
                        className="text-sm"
                      />
                      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
                      <Button className="w-full rounded-xl gap-2" onClick={submitCheckin} disabled={savingCheckin}>
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
                          <span className="text-sm font-medium text-foreground">Frente de trabalho</span>
                          <div className="grid grid-cols-3 gap-2">
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
                        </div>

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
                          <Slider min={0} max={10} step={1} value={[planRpe]} onValueChange={([v]) => setPlanRpe(v)} />
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
                            Fiz outra atividade não planejada
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <span className="text-sm font-medium text-foreground">Tipo de sessão</span>
                          <div className="grid grid-cols-3 gap-2">
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
                        <Slider min={0} max={10} step={1} value={[rpe]} onValueChange={([v]) => setRpe(v)} />
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
                      <Button className="w-full rounded-xl gap-2" onClick={submitSrpe} disabled={savingSrpe}>
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
    </main>
  );
};

export default PeriodizationCheckin;
