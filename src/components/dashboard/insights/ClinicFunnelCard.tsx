import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Filter, Loader2, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import InsightCardShell from "./InsightCardShell";
import { useInsightDismissals } from "./useInsightDismissals";
import { funnelStepPct } from "@/lib/insightFormat";

interface Props {
  clinicId?: string;
  professionalId?: string;
  /** Clinic owner/admin: dismissals hide the item for the whole team. */
  dismissForTeam?: boolean;
}

interface FunnelRow {
  assessed_count: number;
  scheduled_count: number;
  unscheduled_count: number;
  attended_count: number;
}

interface UnscheduledRow {
  identity_key: string;
  patient_name: string | null;
  assessment_date: string | null;
  days_since: number;
}

const fmtDate = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

const ClinicFunnelCard = ({ clinicId, professionalId, dismissForTeam = false }: Props) => {
  const [row, setRow] = useState<FunnelRow | null>(null);
  const [unscheduled, setUnscheduled] = useState<UnscheduledRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const t = (pt: string, en: string, es?: string) => (lang === "pt" ? pt : lang === "es" ? es ?? en : en);
  const { dismissed, dismiss, restoreAll } = useInsightDismissals("conversion_unscheduled", clinicId ?? professionalId, dismissForTeam);
  const visibleUnscheduled = unscheduled.filter((r) => !dismissed.has(r.identity_key));
  const dismissLabel = dismissForTeam
    ? t("Remover para toda a equipe", "Remove for the whole team", "Quitar para todo el equipo")
    : t("Remover da lista", "Remove from list", "Quitar de la lista");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setRow(null);
      setUnscheduled([]);
      setFailed(false);
      const scope = {
        _clinic_id: clinicId ?? undefined,
        _professional_id: clinicId ? undefined : professionalId,
      };
      const [funnelRes, listRes] = await Promise.all([
        supabase.rpc("get_assessment_agenda_conversion", scope),
        supabase.rpc("get_assessment_unscheduled_list" as any, scope),
      ]);
      if (cancelled) return;
      if (!funnelRes.error && funnelRes.data?.[0]) setRow(funnelRes.data[0]);
      if (!listRes.error && Array.isArray(listRes.data)) setUnscheduled(listRes.data as any);
      setFailed(Boolean(funnelRes.error));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clinicId, professionalId]);

  const infoContent = (
    <div className="space-y-2 text-sm">
      <p className="font-semibold">{t("Como é calculado", "How it's calculated", "Cómo se calcula")}</p>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {t(
          "Pacientes cuja primeira avaliação concluída neste perfil ocorreu nos últimos 90 dias. Conversão = pacientes com atendimento agendado ou realizado em até 7 dias após a avaliação ÷ novos pacientes avaliados. Reavaliações não aumentam a base. Cancelamentos, faltas, compromissos e agendamentos de avaliação não contam. O vínculo usa e-mail ou avaliação vinculada, nunca apenas o nome; sem vínculo identificável, não confirma conversão. Clínica e PRO são separados. Você pode descartar pacientes da lista com o X e restaurar depois — o descarte vale só para você.",
          "Patients whose first completed assessment in this profile was within 90 days. Conversion = patients with a treatment appointment scheduled or completed within 7 days of the assessment ÷ newly assessed patients. Reassessments do not increase the base. Cancellations, no-shows, personal commitments and assessment appointments do not count. Matching uses email or linked assessment, never name alone; without an identifiable link, conversion is not confirmed. Clinic and solo PRO stay separate. You can dismiss patients from the list with the X and restore them later — dismissal only applies to you.",
          "Pacientes cuya primera evaluación completada en este perfil fue en los últimos 90 días. Conversión = pacientes con atención agendada o realizada dentro de 7 días tras la evaluación ÷ nuevos pacientes evaluados. Las reevaluaciones no aumentan la base. Cancelaciones, faltas, compromisos y citas de evaluación no cuentan. El vínculo usa correo o evaluación vinculada, nunca solo el nombre; sin vínculo identificable, no confirma conversión. Clínica y PRO permanecen separados. Puedes descartar pacientes de la lista con la X y restaurarlos después — el descarte solo aplica para ti.",
        )}
      </p>
    </div>
  );

  const steps = row
    ? [
        { label: t("Novos pacientes avaliados", "Newly assessed patients", "Nuevos pacientes evaluados"), value: row.assessed_count, pct: 100 },
        { label: t("Com atendimento em até 7 dias", "With appointment within 7 days", "Con atención en hasta 7 días"), value: row.scheduled_count, pct: funnelStepPct(row.scheduled_count, row.assessed_count) },
        { label: t("Sem atendimento em até 7 dias", "Without appointment within 7 days", "Sin atención en 7 días"), value: row.unscheduled_count, pct: funnelStepPct(row.unscheduled_count, row.assessed_count) },
        { label: t("Já compareceram", "Already attended", "Ya asistieron"), value: row.attended_count, pct: funnelStepPct(row.attended_count, row.assessed_count) },
      ]
    : [];

  return (
    <InsightCardShell
      id="clinic-funnel"
      icon={<Filter className="h-4 w-4 text-primary" />}
      title={t("Conversão avaliação → agenda", "Assessment → appointment conversion", "Conversión evaluación → agenda")}
      description={t("Últimos 90 dias · janela de 7 dias.", "Last 90 days · 7-day window.", "Últimos 90 días · ventana de 7 días.")}
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

          {visibleUnscheduled.length > 0 && (
            <div className="pt-1 space-y-2">
              <p className="text-xs font-semibold">
                {t("Sem agendamento em até 7 dias", "Without an appointment within 7 days", "Sin cita en hasta 7 días")}
              </p>
              <div className="space-y-2 max-h-[300px] overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
                {visibleUnscheduled.map((r) => (
                  <div key={r.identity_key} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.patient_name || t("Paciente", "Patient", "Paciente")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("Avaliação", "Assessment", "Evaluación")}: {fmtDate(r.assessment_date)}
                        {" · "}
                        {t(`há ${r.days_since} dias`, `${r.days_since} days ago`, `hace ${r.days_since} días`)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(r.identity_key)}
                      aria-label={t("Remover da lista", "Remove from list", "Quitar de la lista")}
                      className="shrink-0 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {dismissed.size > 0 && (
            <button
              type="button"
              onClick={restoreAll}
              className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
            >
              {t(
                `${dismissed.size} oculto(s) · restaurar`,
                `${dismissed.size} hidden · restore`,
                `${dismissed.size} oculto(s) · restaurar`,
              )}
            </button>
          )}
        </div>
      )}
    </InsightCardShell>
  );
};

export default ClinicFunnelCard;
