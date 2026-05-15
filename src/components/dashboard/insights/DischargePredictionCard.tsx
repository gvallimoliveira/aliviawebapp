import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, TrendingDown, Filter } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

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

const DischargePredictionCard = ({ clinicId, professionalId }: Props) => {
  const [rows, setRows] = useState<DischargeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyClose, setOnlyClose] = useState(false);
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";

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

  const filtered = useMemo(
    () => onlyClose ? rows.filter(r => r.sessions_remaining <= 3) : rows,
    [rows, onlyClose]
  );

  const confLabel = (c: string) =>
    lang === "pt"
      ? c === "high" ? "alta" : c === "medium" ? "média" : "baixa"
      : c === "high" ? "high" : c === "medium" ? "medium" : "low";

  return (
    <Card className="border-emerald-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-emerald-600" />
              {lang === "pt" ? "Previsão de alta" : lang === "es" ? "Previsión de alta" : "Discharge prediction"}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {lang === "pt"
                ? "Estimativa de sessões restantes baseada na evolução da dor."
                : lang === "es"
                ? "Estimación de sesiones restantes basada en la evolución del dolor."
                : "Estimated sessions remaining based on pain evolution."}
            </CardDescription>
          </div>
          <Button
            variant={onlyClose ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs gap-1 shrink-0"
            onClick={() => setOnlyClose(v => !v)}
          >
            <Filter className="h-3 w-3" />
            ≤3
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
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
      </CardContent>
    </Card>
  );
};

export default DischargePredictionCard;
