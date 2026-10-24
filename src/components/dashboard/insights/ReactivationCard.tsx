import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserRoundPlus, Loader2, MessageCircle, CalendarPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";

interface Props {
  clinicId?: string;
  professionalId?: string;
}

interface Row {
  patient_email: string;
  patient_name: string | null;
  last_session_date: string | null;
  days_inactive: number;
}

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

const ReactivationCard = ({ clinicId, professionalId }: Props) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const t = (pt: string, en: string, es?: string) => (lang === "pt" ? pt : lang === "es" ? es ?? en : en);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_reactivation_candidates" as any, {
        _clinic_id: clinicId ?? null,
        _professional_id: professionalId ?? null,
      });
      if (cancelled) return;
      if (!error && Array.isArray(data)) setRows(data as any);
      setLoading(false);
    };
    if (clinicId || professionalId) load();
    else setLoading(false);
    return () => { cancelled = true; };
  }, [clinicId, professionalId]);

  const infoContent = (
    <div className="space-y-2 text-sm">
      <p className="font-semibold">{t("Como é calculado", "How it's calculated")}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t(
          "Pacientes com pelo menos 2 atendimentos concluídos, último entre 30 e 180 dias atrás e nenhum agendamento futuro. Diferente do risco de evasão (pacientes ativos esfriando), aqui são contatos já inativos que valem uma abordagem de retorno.",
          "Patients with at least 2 completed appointments, the last one 30–180 days ago, and no upcoming booking. Unlike churn risk (active patients cooling off), these are already-inactive contacts worth a comeback approach.",
        )}
      </p>
    </div>
  );

  return (
    <InsightCardShell
      id="reactivation"
      icon={<UserRoundPlus className="h-4 w-4 text-primary" />}
      title={t("Reativação de inativos", "Inactive reactivation", "Reactivación de inactivos")}
      description={t(
        "Ex-pacientes recentes sem retorno agendado — oportunidade de reconquista.",
        "Recent past patients with no return booked — a win-back opportunity.",
      )}
      rightSlot={
        !loading && rows.length > 0 ? (
          <Badge variant="outline" className="text-xs">{rows.length}</Badge>
        ) : null
      }
      infoContent={infoContent}
    >
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {t("Nenhum paciente inativo no período ✨", "No inactive patients in the period ✨")}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.patient_email} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.patient_name || r.patient_email}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Último atendimento", "Last visit")}: {fmtDate(r.last_session_date)} · {r.days_inactive}d
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => navigate("/dashboard?tab=agenda")}
                  title={t("Agendar retorno", "Book return")}
                >
                  <CalendarPlus className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => navigate("/dashboard?tab=messages")}
                  title={t("Mensagem", "Message")}
                >
                  <MessageCircle className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </InsightCardShell>
  );
};

export default ReactivationCard;
