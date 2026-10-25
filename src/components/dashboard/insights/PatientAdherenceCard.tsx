import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Trophy, ChevronDown, RotateCcw, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { adherenceScore } from "@/lib/patientAdherence";
import { useLanguage } from "@/contexts/LanguageContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import InsightCardShell from "./InsightCardShell";
import { useInsightPrefs } from "./useInsightPreferences";

interface Props { clinicId?: string; professionalId?: string; }

interface AdherenceRow {
  patient_email: string;
  patient_name: string | null;
  score: number;
  exercises_pct: number | null;
  checkin_pct: number | null;
  attendance_pct: number | null;
}

const scoreColor = (s: number) => {
  if (s >= 70) return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
  if (s >= 40) return "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";
  return "bg-red-500/10 text-red-700 border-red-500/30";
};

const DEFAULTS = {
  wExercises: 45,
  wCheckin: 25,
  wAttendance: 30,
};

const PatientAdherenceCard = ({ clinicId, professionalId }: Props) => {
  const [rawRows, setRawRows] = useState<AdherenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(false);
  const [search, setSearch] = useState("");
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const { prefs, update, reset } = useInsightPrefs("adherence", DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setRawRows([]);
      setErrorMessage(false);
      const { data, error } = await supabase.rpc("get_patient_adherence_scores" as any, {
        _clinic_id: clinicId ?? null,
        _professional_id: professionalId ?? null,
      });
      if (cancelled) return;
      if (!error && Array.isArray(data)) setRawRows(data as any);
      setErrorMessage(!!error);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clinicId, professionalId]);

  // Recompute composite score using user weights (normalized to 100).
  const rows = useMemo(() => {
    return rawRows
      .map((r) => ({
        ...r,
        score: adherenceScore([r.exercises_pct, r.checkin_pct, r.attendance_pct], [prefs.wExercises, prefs.wCheckin, prefs.wAttendance], r.score),
      }))
      .sort((a, b) => b.score - a.score);
  }, [rawRows, prefs]);

  const visible = rows.filter((r) => (r.patient_name || r.patient_email).toLocaleLowerCase().includes(search.toLocaleLowerCase()));

  const WeightSlider = ({ label, k }: { label: string; k: keyof typeof DEFAULTS }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="font-semibold tabular-nums">{prefs[k]}%</span>
      </div>
      <Slider
        value={[prefs[k]]}
        onValueChange={(v) => update({ [k]: v[0] } as any)}
        min={0}
        max={100}
        step={5}
      />
    </div>
  );

  const totalW = prefs.wExercises + prefs.wCheckin + prefs.wAttendance;

  const infoContent = (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-semibold mb-1">
          {lang === "pt" ? "Como o score é calculado" : "How the score is calculated"}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {lang === "pt"
            ? "Combinação ponderada de: exercícios concluídos (app do paciente), consistência dos check-ins de prontidão e comparecimento às sessões classificadas. Diário de dor e mensagens não entram — na prática a maioria dos pacientes não usa esses canais. Você pode ajustar os pesos."
            : "Weighted blend of: exercise completion (patient app), readiness check-in consistency and classified session attendance. Pain diary and messages are not used — most patients don't use those channels in practice. You can adjust the weights."}
        </p>
      </div>
      <div className="border-t pt-3 space-y-3">
        <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
          {lang === "pt" ? "Pesos personalizados" : "Custom weights"}
        </p>
        <WeightSlider label={lang === "pt" ? "Exercícios" : "Exercises"} k="wExercises" />
        <WeightSlider label={lang === "pt" ? "Check-ins de prontidão" : "Readiness check-ins"} k="wCheckin" />
        <WeightSlider label={lang === "pt" ? "Comparecimento" : "Attendance"} k="wAttendance" />
        <p className="text-[11px] text-muted-foreground">
          {lang === "pt"
            ? `Soma atual: ${totalW}% — normalizamos automaticamente para 100%.`
            : `Current sum: ${totalW}% — automatically normalized to 100%.`}
        </p>
        <Button size="sm" variant="ghost" onClick={reset} className="gap-1 text-xs h-7">
          <RotateCcw className="h-3 w-3" />
          {lang === "pt" ? "Restaurar padrões" : "Reset defaults"}
        </Button>
      </div>
    </div>
  );

  const Row = ({ r }: { r: AdherenceRow }) => (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="h-auto w-full flex items-center gap-3 p-2.5 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors text-left">
          <Badge variant="outline" className={`shrink-0 px-2 py-0.5 text-xs font-bold ${scoreColor(r.score)}`}>{r.score}</Badge>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{r.patient_name || r.patient_email}</p>
            <Progress value={r.score} className="h-1 mt-1" />
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pl-3 pr-2 pb-1 space-y-1">
        {[
          { label: lang === "pt" ? "Exercícios" : "Exercises", v: r.exercises_pct, w: prefs.wExercises },
          { label: lang === "pt" ? "Check-ins" : "Check-ins", v: r.checkin_pct, w: prefs.wCheckin },
          { label: lang === "pt" ? "Comparecimento" : "Attendance", v: r.attendance_pct, w: prefs.wAttendance },
        ].map((m) => (
          <div key={m.label} className="flex items-center gap-2 text-xs">
            <span className="w-32 text-muted-foreground">{m.label} ({m.w}%)</span>
            <Progress value={m.v ?? 0} className="h-1 flex-1" />
            <span className="text-right tabular-nums text-muted-foreground">{m.v === null ? (lang === "pt" ? "Sem dados" : lang === "es" ? "Sin datos" : "No data") : `${m.v}%`}</span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <InsightCardShell
      id="adherence"
      icon={<Trophy className="h-4 w-4 text-amber-500" />}
      title={lang === "pt" ? "Adesão dos pacientes" : lang === "es" ? "Adherencia de pacientes" : "Patient adherence"}
      description={
        lang === "pt"
          ? "Score 0–100 combinando exercícios, check-ins de prontidão e comparecimento."
          : "0–100 score combining exercises, readiness check-ins and attendance."
      }
      infoContent={infoContent}
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : errorMessage ? (
          <p className="text-sm text-destructive">{lang === "pt" ? "Não foi possível carregar a adesão. Tente novamente." : "Could not load adherence. Please try again."}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {lang === "pt" ? "Sem dados suficientes." : "Not enough data."}
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={lang === "pt" ? "Buscar paciente" : lang === "es" ? "Buscar paciente" : "Search patient"} aria-label={lang === "pt" ? "Buscar paciente na adesão" : "Search adherence patients"} /><Badge variant="secondary">{rows.length}</Badge></div>
            <div className="max-h-[360px] overflow-y-auto overscroll-contain space-y-1.5" tabIndex={0}>{visible.map(r => <Row key={r.patient_email} r={r} />)}</div>
          </>
        )}
      </div>
    </InsightCardShell>
  );
};

export default PatientAdherenceCard;
