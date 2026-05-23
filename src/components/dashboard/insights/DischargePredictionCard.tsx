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
}

const DEFAULTS = {
  minSessions: 3,
  painDropPerSession: 0.3,
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

  const infoContent = (
    <div className="space-y-3 text-sm">
      <div>
        <p className="font-semibold mb-1">
          {lang === "pt" ? "Como é calculado" : "How it's calculated"}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {lang === "pt"
            ? "Estimamos sessões restantes com base na queda média da dor por sessão (NRS inicial → atual). Confiança é maior quando há mais registros do diário e sessões consistentes."
            : "We estimate remaining sessions from the average pain drop per session (initial → current NRS). Confidence is higher with more diary entries and consistent attendance."}
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
            {lang === "pt" ? "Queda de dor esperada por sessão (NRS)" : "Expected pain drop per session (NRS)"}
          </Label>
          <Input
            type="number" min={0.1} step={0.1}
            value={prefs.painDropPerSession}
            onChange={(e) => update({ painDropPerSession: Math.max(0.1, Number(e.target.value) || 0.1) })}
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
          ? "Estimativa de sessões restantes baseada na evolução da dor."
          : lang === "es"
          ? "Estimación de sesiones restantes basada en la evolución del dolor."
          : "Estimated sessions remaining based on pain evolution."
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
          filtered.slice(0, 15).map((r) => {
            const total = r.sessions_done + r.sessions_remaining;
            const progress = total > 0 ? Math.round((r.sessions_done / total) * 100) : 0;
            return (
              <div key={r.patient_email} className="p-3 rounded-lg border border-border/60 bg-background space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate flex-1">{r.patient_name || r.patient_email}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {confLabel(r.confidence)}
                  </Badge>
                </div>
                <Progress value={progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground">
                  {lang === "pt"
                    ? `${r.sessions_done} sessões feitas · ~${r.sessions_remaining} restantes (${r.weeks_estimate} sem)`
                    : `${r.sessions_done} done · ~${r.sessions_remaining} left (${r.weeks_estimate}w)`}
                </p>
              </div>
            );
          })
        )}
      </div>
    </InsightCardShell>
  );
};

export default DischargePredictionCard;
