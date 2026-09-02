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
import { CheckCircle2, Loader2, Activity, HeartPulse, ShieldAlert } from "lucide-react";
import { setSeo } from "@/lib/seo";
import { CHECKIN_ITEMS, TRACK_LABEL } from "@/components/dashboard/periodization/scales";
import { trainingLoad } from "@/lib/periodization";

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


  useEffect(() => {
    setSeo({
      title: "Check-in de carga e prontidão | Aliv.iA",
      description: "Registre como você está hoje e como foi a sessão de hoje.",
    });
  }, []);

  useEffect(() => {
    (async () => {
      if (!token) { setState("error"); setErrorMsg("Link inválido."); return; }
      const { data, error } = await supabase.functions.invoke("periodization-checkin", {
        body: { action: "load", token },
      });
      if (error || !data?.info) {
        setState("error");
        setErrorMsg("Não encontramos este link. Ele pode ter sido desativado pelo profissional.");
        return;
      }
      const loaded = data.info as Info;
      setInfo(loaded);
      setSessionDate(loaded.today);
      if (loaded.audience === "coach") setTrack("gym");
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

  const submitSrpe = async () => {
    const min = Number(duration);
    if (!Number.isFinite(min) || min <= 0) { setErrorMsg("Informe a duração da sessão em minutos."); return; }
    setErrorMsg("");
    setSavingSrpe(true);
    const { data, error } = await supabase.functions.invoke("periodization-checkin", {
      body: {
        action: "submit_srpe",
        token,
        entry: { session_date: sessionDate || info?.today, track, duration_min: min, rpe, notes: srpeNotes },
      },
    });
    setSavingSrpe(false);
    if (error || !data?.ok) { setErrorMsg("Não foi possível enviar agora. Tente novamente."); return; }
    setSrpeDone(true);
    setDuration("");
    setSrpeNotes("");
  };

  const isCoach = info?.audience === "coach";
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
              {isCoach ? "Registro de sessão (treinador)" : "Check-in de hoje"}
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
                  ? "Este link é do treinador/preparador: registre a sessão treinada (tipo, duração e esforço). As escalas subjetivas são respondidas pelo próprio paciente no link dele."
                  : "Este link é seu: conte como você está hoje e, se treinou, registre como foi a sessão."}
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
                  {srpeDone ? (
                    <div className="text-center py-6 space-y-2">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                      <p className="text-sm font-semibold text-foreground">Sessão registrada!</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => setSrpeDone(false)}>
                        Registrar outra sessão
                      </Button>
                    </div>
                  ) : (
                    <>
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
                      </div>

                      {isCoach && (
                        <div className="space-y-1.5">
                          <span className="text-sm font-medium text-foreground">Data da sessão</span>
                          <Input
                            type="date"
                            value={sessionDate}
                            max={info?.today}
                            onChange={(e) => setSessionDate(e.target.value)}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Pode registrar uma sessão de dias anteriores.
                          </p>
                        </div>
                      )}



                      <div className="space-y-1.5">
                        <span className="text-sm font-medium text-foreground">Duração (minutos)</span>
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
