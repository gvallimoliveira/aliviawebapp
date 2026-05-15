import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Award, Lock } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props { clinicId: string; }

interface BenchRow {
  metric: string;
  clinic_value: number | null;
  peer_avg: number | null;
  peer_count: number;
  size_bucket: string;
  better_when_lower: boolean;
}

const metricLabel = (m: string, lang: string) => {
  const map: Record<string, { pt: string; en: string; es: string; unit: string }> = {
    no_show_rate: { pt: "Taxa de não-comparecimento", en: "No-show rate", es: "Tasa de no presentación", unit: "%" },
    occupancy: { pt: "Taxa de ocupação", en: "Occupancy rate", es: "Ocupación", unit: "%" },
    assessments_per_therapist: { pt: "Avaliações por terapeuta/mês", en: "Assessments per therapist/month", es: "Evaluaciones por terapeuta/mes", unit: "" },
  };
  const e = map[m];
  if (!e) return { label: m, unit: "" };
  return { label: (e as any)[lang] || e.en, unit: e.unit };
};

const BenchmarkCard = ({ clinicId }: Props) => {
  const [rows, setRows] = useState<BenchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_clinic_benchmarks" as any, { _clinic_id: clinicId });
      if (cancelled) return;
      if (!error && Array.isArray(data)) setRows(data as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clinicId]);

  const peerCount = rows[0]?.peer_count ?? 0;
  const sizeBucket = rows[0]?.size_bucket ?? "small";
  const sizeLabel = lang === "pt"
    ? sizeBucket === "small" ? "pequeno porte (1-3 terapeutas)" : sizeBucket === "medium" ? "médio porte (4-10)" : "grande porte (11+)"
    : sizeBucket;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" />
          {lang === "pt" ? "Benchmark anônimo" : lang === "es" ? "Benchmark anónimo" : "Anonymous benchmark"}
        </CardTitle>
        <CardDescription className="text-xs">
          {lang === "pt"
            ? `Comparação com ${peerCount} clínicas de ${sizeLabel}. Dados 100% anônimos.`
            : `Compared with ${peerCount} similar-size clinics. Fully anonymous.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : peerCount < 5 ? (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border/60">
            <Lock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              {lang === "pt"
                ? `Precisamos de pelo menos 5 clínicas de porte similar para liberar comparação anônima (atualmente: ${peerCount}).`
                : `We need at least 5 similar-size clinics to unlock anonymous comparison (currently: ${peerCount}).`}
            </p>
          </div>
        ) : (
          rows.map((r) => {
            const { label, unit } = metricLabel(r.metric, lang);
            const cv = r.clinic_value ?? 0;
            const pa = r.peer_avg ?? 0;
            const diff = cv - pa;
            const isBetter = r.better_when_lower ? diff < 0 : diff > 0;
            const isWorse = r.better_when_lower ? diff > 0 : diff < 0;
            const color = isBetter
              ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/30"
              : isWorse
              ? "text-amber-700 bg-amber-500/10 border-amber-500/30"
              : "text-muted-foreground bg-muted border-border";
            const diffAbs = Math.abs(diff).toFixed(1);
            const directionPt = isBetter
              ? r.better_when_lower ? "abaixo" : "acima"
              : r.better_when_lower ? "acima" : "abaixo";
            const verdict = lang === "pt"
              ? `${diffAbs}${unit === "%" ? "pp" : ""} ${directionPt} da média`
              : `${diffAbs}${unit === "%" ? "pp" : ""} ${isBetter ? (r.better_when_lower ? "below" : "above") : (r.better_when_lower ? "above" : "below")} avg`;
            return (
              <div key={r.metric} className="p-3 rounded-lg border border-border/60 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{label}</p>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${color}`}>
                    {isBetter ? "✓" : isWorse ? "↑" : "—"}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-3 text-xs">
                  <span className="font-bold text-base text-foreground">{cv.toFixed(1)}{unit}</span>
                  <span className="text-muted-foreground">{lang === "pt" ? "média" : "avg"}: {pa.toFixed(1)}{unit}</span>
                </div>
                <p className={`text-xs font-medium ${isBetter ? "text-emerald-700" : isWorse ? "text-amber-700" : "text-muted-foreground"}`}>
                  {verdict}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

export default BenchmarkCard;
