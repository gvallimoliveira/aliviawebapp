import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Trophy, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Props { clinicId: string; }

interface AdherenceRow {
  patient_email: string;
  patient_name: string | null;
  score: number;
  exercises_pct: number;
  diary_pct: number;
  attendance_pct: number;
  messages_pct: number;
}

const scoreColor = (s: number) => {
  if (s >= 70) return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
  if (s >= 40) return "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";
  return "bg-red-500/10 text-red-700 border-red-500/30";
};

const PatientAdherenceCard = ({ clinicId }: Props) => {
  const [rows, setRows] = useState<AdherenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_patient_adherence_scores" as any, { _clinic_id: clinicId });
      if (cancelled) return;
      if (!error && Array.isArray(data)) setRows(data as any);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clinicId]);

  const top = rows.slice(0, 5);
  const bottom = rows.slice(-5).reverse();

  const Row = ({ r }: { r: AdherenceRow }) => (
    <Collapsible>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border/60 hover:bg-muted/40 transition-colors text-left">
          <Badge variant="outline" className={`shrink-0 px-2 py-0.5 text-xs font-bold ${scoreColor(r.score)}`}>{r.score}</Badge>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{r.patient_name || r.patient_email}</p>
            <Progress value={r.score} className="h-1 mt-1" />
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2 pl-3 pr-2 pb-1 space-y-1">
        {[
          { label: lang === "pt" ? "Exercícios" : "Exercises", v: r.exercises_pct, w: 40 },
          { label: lang === "pt" ? "Diário de dor" : "Pain diary", v: r.diary_pct, w: 25 },
          { label: lang === "pt" ? "Comparecimento" : "Attendance", v: r.attendance_pct, w: 25 },
          { label: lang === "pt" ? "Mensagens lidas" : "Messages read", v: r.messages_pct, w: 10 },
        ].map((m) => (
          <div key={m.label} className="flex items-center gap-2 text-xs">
            <span className="w-32 text-muted-foreground">{m.label} ({m.w}%)</span>
            <Progress value={m.v} className="h-1 flex-1" />
            <span className="w-10 text-right tabular-nums text-muted-foreground">{m.v}%</span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          {lang === "pt" ? "Adesão dos pacientes" : lang === "es" ? "Adherencia de pacientes" : "Patient adherence"}
        </CardTitle>
        <CardDescription className="text-xs">
          {lang === "pt"
            ? "Score 0–100 combinando exercícios, diário, comparecimento e leitura de mensagens."
            : "0–100 score combining exercises, diary, attendance and message reads."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {lang === "pt" ? "Sem dados suficientes." : "Not enough data."}
          </p>
        ) : (
          <>
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-2 uppercase tracking-wide">
                {lang === "pt" ? "🏆 Top 5" : "🏆 Top 5"}
              </p>
              <div className="space-y-1.5">{top.map(r => <Row key={r.patient_email} r={r} />)}</div>
            </div>
            {rows.length > 5 && (
              <div>
                <p className="text-xs font-semibold text-red-700 mb-2 uppercase tracking-wide">
                  {lang === "pt" ? "⚠️ Atenção (5 mais baixos)" : "⚠️ Attention (lowest 5)"}
                </p>
                <div className="space-y-1.5">{bottom.map(r => <Row key={r.patient_email} r={r} />)}</div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientAdherenceCard;
