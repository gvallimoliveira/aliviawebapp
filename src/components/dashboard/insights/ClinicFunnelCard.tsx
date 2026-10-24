import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Filter, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";
import { funnelStepPct } from "@/lib/insightFormat";

interface Props {
  clinicId?: string;
  professionalId?: string;
}

interface FunnelRow {
  assessed_count: number;
  scheduled_count: number;
  unscheduled_count: number;
  attended_count: number;
}

const ClinicFunnelCard = ({ clinicId, professionalId }: Props) => {
  const [row, setRow] = useState<FunnelRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const t = (pt: string, en: string, es?: string) => (lang === "pt" ? pt : lang === "es" ? es ?? en : en);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setRow(null);
      setFailed(false);
      const { data, error } = await supabase.rpc("get_assessment_agenda_conversion", {
        _clinic_id: clinicId ?? undefined,
        _professional_id: clinicId ? undefined : professionalId,
      });
      if (cancelled) return;
      if (!error && data?.[0]) setRow(data[0]);
      setFailed(Boolean(error));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clinicId, professionalId]);

  const infoContent = (
    <div className="space-y-2 text-sm">
      <p className="font-semibold">{t("Como é calculado", "How it's calculated", "Cómo se calcula")}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t(
          "Pacientes cuja primeira avaliação concluída neste perfil ocorreu nos últimos 90 dias. Conversão = pacientes com atendimento agendado ou realizado na agenda a partir da data da avaliação ÷ novos pacientes avaliados. Reavaliações não aumentam a base. Cancelamentos, faltas, compromissos e agendamentos de avaliação não contam. O vínculo usa e-mail ou avaliação vinculada, nunca apenas o nome; sem vínculo identificável, não confirma conversão. Clínica e PRO são separados.",
          "Patients whose first completed assessment in this profile was within 90 days. Conversion = patients with a scheduled or completed treatment appointment on or after their assessment date ÷ newly assessed patients. Reassessments do not increase the base. Cancellations, no-shows, personal commitments and assessment appointments do not count. Matching uses email or linked assessment, never name alone; without an identifiable link, conversion is not confirmed. Clinic and solo PRO stay separate.",
          "Pacientes cuya primera evaluación completada en este perfil fue en los últimos 90 días. Conversión = pacientes con atención agendada o realizada desde la fecha de evaluación ÷ nuevos pacientes evaluados. Las reevaluaciones no aumentan la base. Cancelaciones, faltas, compromisos y citas de evaluación no cuentan. El vínculo usa correo o evaluación vinculada, nunca solo el nombre; sin vínculo identificable, no confirma conversión. Clínica y PRO permanecen separados.",
        )}
      </p>
    </div>
  );

  const steps = row
    ? [
        { label: t("Novos pacientes avaliados", "Newly assessed patients", "Nuevos pacientes evaluados"), value: row.assessed_count, pct: 100 },
        { label: t("Com atendimento na agenda", "With treatment appointment", "Con atención en agenda"), value: row.scheduled_count, pct: funnelStepPct(row.scheduled_count, row.assessed_count) },
        { label: t("Sem atendimento confirmado", "Without confirmed treatment appointment", "Sin atención confirmada"), value: row.unscheduled_count, pct: funnelStepPct(row.unscheduled_count, row.assessed_count) },
        { label: t("Já compareceram", "Already attended", "Ya asistieron"), value: row.attended_count, pct: funnelStepPct(row.attended_count, row.assessed_count) },
      ]
    : [];

  return (
    <InsightCardShell
      id="clinic-funnel"
      icon={<Filter className="h-4 w-4 text-primary" />}
      title={t("Conversão avaliação → agenda", "Assessment → appointment conversion", "Conversión evaluación → agenda")}
      description={t("Últimos 90 dias.", "Last 90 days.", "Últimos 90 días.")}
      infoContent={infoContent}
    >
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : failed ? (
        <p role="alert" className="text-sm text-destructive py-2">{t("Não foi possível carregar a conversão.", "Could not load conversion.", "No se pudo cargar la conversión.")}</p>
      ) : !row || row.assessed_count === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          {t("Sem novos pacientes avaliados no período.", "No newly assessed patients in the period.", "Sin nuevos pacientes evaluados en el período.")}
        </p>
      ) : (
        <div className="space-y-3">
          {steps.map((s) => (
            <div key={s.label} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground min-w-0">{s.label}</span>
                <span className="font-semibold tabular-nums shrink-0">
                  {s.value} <span className="text-muted-foreground font-normal">({s.pct}%)</span>
                </span>
              </div>
              <Progress value={s.pct} className="h-2" />
            </div>
          ))}
        </div>
      )}
    </InsightCardShell>
  );
};

export default ClinicFunnelCard;
