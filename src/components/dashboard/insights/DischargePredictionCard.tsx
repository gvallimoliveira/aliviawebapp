import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingDown, Filter, RotateCcw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";
import { useInsightPrefs } from "./useInsightPreferences";

interface Props {
  clinicId?: string;
  professionalId?: string;
}

interface DischargeFactors {
  pain?: number | null;
  steps?: number | null;
  load?: number | null;
  readiness?: number | null;
}

interface DischargeRow {
  patient_email: string;
  patient_name: string | null;
  professional_id: string | null;
  sessions_done: number;
  current_pain: number | null;
  initial_pain: number | null;
  sessions_remaining: number;
  weeks_estimate: number;
  confidence: "low" | "medium" | "high";
  progress_pct: number;
  factors: DischargeFactors | null;
}

const DEFAULTS = {
  minSessions: 3,
  closeThreshold: 3,
};

const DischargePredictionCard = ({ clinicId, professionalId }: Props) => {
  const [rows, setRows] = useState<DischargeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyClose, setOnlyClose] = useState(false);
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const { prefs, update, reset } = useInsightPrefs("discharge", DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_discharge_predictions" as any, {
        _clinic_id: clinicId ?? null,
        _professional_id: professionalId ?? null,
      });
      if (cancelled) return;
      if (!error && Array.isArray(data)) setRows(data as any);
      setLoading(false);
    };
    if (clinicId || professionalId) load();
    return () => { cancelled = true; };
  }, [clinicId, professionalId]);

  const filtered = useMemo(() => {
    let r = rows.filter((x) => x.sessions_done >= prefs.minSessions);
    if (onlyClose) r = r.filter((x) => x.sessions_remaining <= prefs.closeThreshold);
    return r;
  }, [rows, onlyClose, prefs.minSessions, prefs.closeThreshold]);

  const confLabel = (c: string) =>
    lang === "pt"
      ? c === "high" ? "alta" : c === "medium" ? "média" : "baixa"
      : c === "high" ? "high" : c === "medium" ? "medium" : "low";

  const factorChips = (f: DischargeFactors | null) => {
    if (!f) return null;
    const items: { label: string; v: number | null | undefined }[] = [
      { label: lang === "pt" ? "Dor" : "Pain", v: f.pain },
      { label: "STEPS", v: f.steps },
      { label: lang === "pt" ? "Carga" : "Load", v: f.load },
      { label: lang === "pt" ? "Prontidão" : "Readiness", v: f.readiness },
    ].filter((i) => i.v !== null && i.v !== undefined);
    if (!items.length) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {items.map((i) => (
          <span key={i.label} className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
            {i.label} <b className="text-foreground">{i.v}%</b>
          </span>
        ))}
      </div>
    );
  };

  const infoContent = (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-semibold mb-1">
          {lang === "pt" ? "Como é calculado" : "How it's calculated"}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {lang === "pt"
            ? "O progresso (0–100%) combina quatro sinais, quando existem: evolução da dor nos check-ins de prontidão (peso 40), fase atual do plano STEPS (30), progresso da carga de trabalho nas últimas 4 semanas vs as 4 anteriores (15) e prontidão atual (15). As sessões restantes aplicam o que falta do caminho ao ritmo atual do paciente; semanas usam a frequência real recente. Confiança cresce com mais sinais e mais sessões."
            : "Progress (0–100%) blends four signals when available: pain evolution from readiness check-ins (weight 40), current STEPS plan phase (30), workload progress over the last 4 weeks vs the previous 4 (15) and current readiness (15). Remaining sessions apply the missing path to the patient's current pace; weeks use the recent real frequency. Confidence grows with more signals and sessions."}
        </p>
      </div>
      <div className="border-t pt-3 space-y-3">
        <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
          {lang === "pt" ? "Personalizar" : "Customize"}
        </p>
        <div className="space-y-1">
          <Label className="text-xs">
            {lang === "pt" ? "Sessões mínimas para prever" : "Minimum sessions before predicting"}
          </Label>
          <Input
            type="number" min={1}
            value={prefs.minSessions}
            onChange={(e) => update({ minSessions: Math.max(1, Number(e.target.value) || 1) })}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            {lang === "pt" ? "Sessões para considerar 'perto da alta'" : "Sessions to consider 'close to discharge'"}
          </Label>
          <Input
            type="number" min={1}
            value={prefs.closeThreshold}
            onChange={(e) => update({ closeThreshold: Math.max(1, Number(e.target.value) || 1) })}
            className="h-8"
          />
        </div>
        <Button size="sm" variant="ghost" onClick={reset} className="gap-1 text-xs h-7">
          <RotateCcw className="h-3 w-3" />
          {lang === "pt" ? "Restaurar padrões" : "Reset defaults"}
        </Button>
      </div>
    </div>
  );

  return (
    <InsightCardShell
      id="discharge"
      className="border-emerald-500/20"
      icon={<TrendingDown className="h-4 w-4 text-emerald-600" />}
      title={lang === "pt" ? "Previsão de alta" : lang === "es" ? "Previsión de alta" : "Discharge prediction"}
      description={
        lang === "pt"
          ? "Estimativa combinando dor, fase STEPS, progresso de carga e prontidão."
          : lang === "es"
          ? "Estimación combinando dolor, fase STEPS, progreso de carga y preparación."
          : "Estimate combining pain, STEPS phase, load progress and readiness."
      }
      rightSlot={
        <Button
          variant={onlyClose ? "default" : "outline"}
          size="sm"
          className="h-7 px-2 text-xs gap-1 shrink-0 ml-auto"
          onClick={() => setOnlyClose(v => !v)}
        >
          <Filter className="h-3 w-3" />
          ≤{prefs.closeThreshold}
        </Button>
      }
      infoContent={infoContent}
    >
      <div className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {lang === "pt" ? "Sem dados suficientes ainda." : lang === "es" ? "Sin datos suficientes." : "Not enough data yet."}
          </p>
        ) : (
          filtered.slice(0, 15).map((r) => (
            <div key={r.patient_email} className="p-3 rounded-lg border border-border/60 bg-background space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate flex-1">{r.patient_name || r.patient_email}</p>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {confLabel(r.confidence)}
                </Badge>
              </div>
              <Progress value={r.progress_pct} className="h-1.5" />
              <p className="text-xs text-muted-foreground">
                {lang === "pt"
                  ? `${r.progress_pct}% do caminho · ${r.sessions_done} sessões feitas · ~${r.sessions_remaining} restantes (${r.weeks_estimate} sem)`
                  : `${r.progress_pct}% along · ${r.sessions_done} done · ~${r.sessions_remaining} left (${r.weeks_estimate}w)`}
              </p>
              {factorChips(r.factors)}
            </div>
          ))
        )}
      </div>
    </InsightCardShell>
  );
};

export default DischargePredictionCard;
