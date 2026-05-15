import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Loader2, MessageCircle, CalendarPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  clinicId?: string;
  professionalId?: string;
}

interface ChurnRow {
  patient_email: string;
  patient_name: string | null;
  professional_id: string | null;
  score: number;
  reasons: string[];
  last_session_date: string | null;
  next_session_date: string | null;
}

const scoreColor = (score: number) => {
  if (score >= 80) return "bg-red-500/10 text-red-700 border-red-500/30";
  if (score >= 60) return "bg-amber-500/10 text-amber-700 border-amber-500/30";
  return "bg-yellow-500/10 text-yellow-700 border-yellow-500/30";
};

const ChurnRiskCard = ({ clinicId, professionalId }: Props) => {
  const [rows, setRows] = useState<ChurnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_patient_churn_risk" as any, {
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

  return (
    <Card className="border-red-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          {lang === "pt" ? "Pacientes em risco de evasão" : lang === "es" ? "Pacientes en riesgo de evasión" : "Patients at churn risk"}
          {!loading && rows.length > 0 && (
            <Badge variant="destructive" className="ml-auto text-[10px] px-2 py-0">{rows.length}</Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          {lang === "pt"
            ? "Pacientes que combinam ausência, faltas, dor estagnada ou silêncio prolongado."
            : lang === "es"
            ? "Pacientes que combinan ausencias, faltas, dolor estancado o silencio prolongado."
            : "Patients combining absence, no-shows, stagnant pain or long silence."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {lang === "pt" ? "Nenhum paciente em risco no momento ✨" : lang === "es" ? "Sin pacientes en riesgo ✨" : "No patients at risk ✨"}
          </p>
        ) : (
          rows.slice(0, 10).map((r) => (
            <div key={r.patient_email} className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-background">
              <Badge variant="outline" className={`shrink-0 px-2 py-1 text-xs font-bold ${scoreColor(r.score)}`}>
                {r.score}
              </Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.patient_name || r.patient_email}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {(r.reasons || []).slice(0, 2).join(" · ") || "—"}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => navigate("/dashboard?tab=agenda")}
                  title={lang === "pt" ? "Reagendar" : "Reschedule"}
                >
                  <CalendarPlus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => navigate("/dashboard?tab=messages")}
                  title={lang === "pt" ? "Mensagem" : "Message"}
                >
                  <MessageCircle className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default ChurnRiskCard;
