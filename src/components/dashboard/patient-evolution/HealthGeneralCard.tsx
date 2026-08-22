import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeartPulse, AlertTriangle, Pill, ChevronDown, ChevronUp, Info } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { normalizeAnamnesis } from "@/lib/anamnesisCompat";
import {
  formatHealthConditions,
  formatContinuousMedication,
  getHealthRiskFlags,
  healthConditionLabel,
  healthHistoryLabel,
  isHealthHistoryEmpty,
  normalizeHealthHistory,
  otherControlLabel,
  otherOnsetLabel,
  RISK_CONDITION_IDS,
} from "@/lib/healthHistory";

interface HealthGeneralCardProps {
  assessments: any[];
  /** Anchor id used by the "Saúde geral" shortcut in the assessment history. */
  id?: string;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Seção fixa "Saúde geral" do prontuário: mostra sempre as comorbidades
 * essenciais (hipertensão / diabetes / cardiopatia / outra) e a medicação de
 * uso contínuo do registro mais recente, sinalizando condições de risco.
 */
const HealthGeneralCard: React.FC<HealthGeneralCardProps> = ({ assessments, id = "saude-geral" }) => {
  const { language } = useLanguage();
  const [showHistory, setShowHistory] = useState(false);

  const records = useMemo(() => {
    return (assessments || [])
      .map((a: any) => ({
        id: a.id,
        date: a.created_at,
        data: normalizeHealthHistory(normalizeAnamnesis(a.anamnesis_data)),
      }))
      .filter((r) => !isHealthHistoryEmpty(r.data))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [assessments]);

  const latest = records[0];
  const previous = records.slice(1);
  const risk = latest ? getHealthRiskFlags(latest.data) : { riskConditions: [], uncontrolledOther: false, hasRisk: false };
  const conditionsText = latest ? formatHealthConditions(latest.data, language) : "";
  const medicationText = latest ? formatContinuousMedication(latest.data, language) : "";

  const txt = (pt: string, en: string, es: string) => (language === "en" ? en : language === "es" ? es : pt);

  return (
    <Card id={id} className={`scroll-mt-24 ${risk.hasRisk ? "border-destructive/40 bg-destructive/[0.03]" : ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <HeartPulse className={`h-4 w-4 ${risk.hasRisk ? "text-destructive" : "text-primary"}`} />
          {txt("Saúde geral", "General health", "Salud general")}
          {risk.hasRisk && (
            <Badge variant="outline" className="gap-1 border-destructive/40 bg-destructive/10 text-destructive text-[10px]">
              <AlertTriangle className="h-3 w-3" />
              {txt("Condição de risco", "Risk condition", "Condición de riesgo")}
            </Badge>
          )}
          {latest && (
            <span className="text-[11px] font-normal text-muted-foreground">
              {txt("Registrado em", "Recorded on", "Registrado el")} {fmtDate(latest.date)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!latest ? (
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            {txt(
              "Sem triagem de saúde geral registrada. Ela é coletada automaticamente na próxima avaliação (manual, autoavaliação ou link).",
              "No general health screening recorded yet. It is collected automatically in the next assessment (manual, self-assessment or link).",
              "Sin cribado de salud general registrado. Se recoge automáticamente en la próxima evaluación (manual, autoevaluación o enlace).",
            )}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {(latest.data.healthConditions || []).map((cid) => {
                const isRisk = RISK_CONDITION_IDS.includes(cid as any);
                return (
                  <Badge
                    key={cid}
                    variant="outline"
                    className={
                      isRisk
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : cid === "none"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : ""
                    }
                  >
                    {isRisk && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {healthConditionLabel(cid, language)}
                  </Badge>
                );
              })}
            </div>

            {latest.data.healthConditions?.includes("other") && (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-1 text-sm">
                <p className="font-medium text-foreground">
                  {latest.data.healthConditionsOther?.trim() ||
                    txt("Outra condição", "Other condition", "Otra condición")}
                </p>
                {latest.data.healthConditionsOtherOnset && (
                  <p className="text-muted-foreground">
                    {txt("Desde", "Since", "Desde")}: {otherOnsetLabel(latest.data.healthConditionsOtherOnset, language)}
                  </p>
                )}
                {latest.data.healthConditionsOtherControl && (
                  <p className={risk.uncontrolledOther ? "text-destructive font-medium" : "text-muted-foreground"}>
                    {txt("Controle", "Control", "Control")}:{" "}
                    {otherControlLabel(latest.data.healthConditionsOtherControl, language)}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-start gap-2 text-sm">
              <Pill className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <span>
                <span className="text-muted-foreground">{healthHistoryLabel("medication", language)}: </span>
                <span className="text-foreground font-medium">
                  {medicationText || txt("Não informado", "Not informed", "No informado")}
                </span>
              </span>
            </div>

            {risk.hasRisk && (
              <p className="text-xs text-destructive/90 leading-relaxed">
                {txt(
                  "Ajuste a dosagem: evite manobra de Valsalva e isometrias intensas prolongadas, monitore percepção de esforço e considere liberação médica antes de alta intensidade.",
                  "Adjust dosage: avoid Valsalva and prolonged high-intensity isometrics, monitor perceived exertion and consider medical clearance before high-intensity work.",
                  "Ajuste la dosificación: evite Valsalva e isometrías intensas prolongadas, monitoree el esfuerzo percibido y considere autorización médica antes de alta intensidad.",
                )}
              </p>
            )}

            {previous.length > 0 && (
              <div className="pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1.5 text-muted-foreground"
                  onClick={() => setShowHistory((v) => !v)}
                >
                  {showHistory ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {txt(
                    `Registros anteriores (${previous.length})`,
                    `Previous records (${previous.length})`,
                    `Registros anteriores (${previous.length})`,
                  )}
                </Button>
                {showHistory && (
                  <div className="mt-2 space-y-2">
                    {previous.map((r) => (
                      <div key={r.id} className="text-xs text-muted-foreground border-l-2 border-border pl-3">
                        <span className="font-medium text-foreground">{fmtDate(r.date)}</span> —{" "}
                        {formatHealthConditions(r.data, language) || txt("Sem condições", "No conditions", "Sin condiciones")}
                        {formatContinuousMedication(r.data, language) && ` • ${formatContinuousMedication(r.data, language)}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {!conditionsText && latest && (
          <p className="text-xs text-muted-foreground">
            {txt("Condições não informadas.", "Conditions not informed.", "Condiciones no informadas.")}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthGeneralCard;
