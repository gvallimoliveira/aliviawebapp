import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HeartPulse,
  AlertTriangle,
  Pill,
  ChevronDown,
  ChevronUp,
  Info,
  Pencil,
  Plus,
  Loader2,
  Trash2,
  Stethoscope,
  UserCog,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { normalizeAnamnesis } from "@/lib/anamnesisCompat";
import {
  formatHealthConditions,
  formatContinuousMedication,
  getHealthRiskAssessment,
  healthConditionLabel,
  healthHistoryLabel,
  isHealthHistoryEmpty,
  normalizeHealthHistory,
  otherControlLabel,
  otherOnsetLabel,
  HEALTH_CONDITION_IDS,
  MANAGED_CONTROL_IDS,
  OTHER_CONTROL_OPTIONS,
  OTHER_ONSET_OPTIONS,
  RISK_CONDITION_IDS,
  RISK_CONTROL_IDS,
  type HealthRiskAssessment,
} from "@/lib/healthHistory";


interface HealthGeneralCardProps {
  assessments: any[];
  /** Anchor id used by the "Saúde geral" shortcut in the assessment history. */
  id?: string;
  /** Cadastro do paciente (quando existe) para vincular o registro manual. */
  patientId?: string | null;
  patientEmail?: string | null;
  patientName?: string | null;
  clinicId?: string | null;
  /** Desliga a edição (demo / somente leitura). */
  readOnly?: boolean;
  /** Modo demonstração: usa registros mockados em vez de consultar o banco. */
  isDemo?: boolean;
  /** Notifica o nível de atenção recalculado (usado pelo atalho no histórico). */
  onRiskChange?: (risk: HealthRiskAssessment) => void;
}



const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

const fmtDay = (day: string) => {
  const [y, m, d] = (day || "").split("-").map(Number);
  if (!y || !m || !d) return day;
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface FormState {
  id: string | null;
  recorded_at: string;
  healthConditions: string[];
  healthConditionsOther: string;
  healthConditionsOtherOnset: string;
  healthConditionsOtherControl: string;
  /** Controle por condição de risco (hipertensão / diabetes / cardiopatia). */
  healthConditionsControl: Record<string, string>;
  usesContinuousMedication: string;
  continuousMedications: string;
  change_summary: string;
  observations: string;
  suggestions: string;
}

const emptyForm = (): FormState => ({
  id: null,
  recorded_at: todayISO(),
  healthConditions: [],
  healthConditionsOther: "",
  healthConditionsOtherOnset: "",
  healthConditionsOtherControl: "",
  healthConditionsControl: {},
  usesContinuousMedication: "",
  continuousMedications: "",
  change_summary: "",
  observations: "",
  suggestions: "",
});

/**
 * Seção fixa "Saúde geral" do prontuário: mostra sempre as comorbidades
 * essenciais (hipertensão / diabetes / cardiopatia / outra) e a medicação de
 * uso contínuo do registro mais recente — vindo da anamnese OU de um registro
 * manual do profissional — sinalizando o nível de atenção (condição controlada
 * pesa menos que condição não manejada) e mantendo o histórico das alterações.
 */
const HealthGeneralCard: React.FC<HealthGeneralCardProps> = ({
  assessments,
  id = "saude-geral",
  patientId,
  patientEmail,
  patientName,
  clinicId,
  readOnly,
  isDemo,
  onRiskChange,
}) => {


  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showHistory, setShowHistory] = useState(false);
  const [manualRecords, setManualRecords] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const txt = (pt: string, en: string, es: string) => (language === "en" ? en : language === "es" ? es : pt);

  const canEdit = !readOnly && !!user;

  const loadManual = useCallback(async () => {
    if (isDemo) {
      // Modo demonstração: registros mockados, sem tocar no banco.
      const { mockHealthRecords } = await import("@/data/mockProDemoExtras");
      setManualRecords((patientEmail && mockHealthRecords[patientEmail]) || []);
      return;
    }
    if (!patientId && !patientEmail) return;
    const sb = supabase as any;
    let q = sb
      .from("patient_health_records")
      .select("*")
      .order("recorded_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (patientId && patientEmail) q = q.or(`patient_id.eq.${patientId},patient_email.eq.${patientEmail}`);
    else if (patientId) q = q.eq("patient_id", patientId);
    else q = q.eq("patient_email", patientEmail);
    q = clinicId ? q.eq("clinic_id", clinicId) : q.is("clinic_id", null);
    const { data, error } = await q;
    if (!error) setManualRecords(data || []);
  }, [patientId, patientEmail, clinicId, isDemo]);


  useEffect(() => {
    loadManual();
  }, [loadManual]);

  const records = useMemo(() => {
    const fromAssessments = (assessments || [])
      .map((a: any) => ({
        key: `a-${a.id}`,
        date: a.created_at,
        source: "assessment" as const,
        data: normalizeHealthHistory(normalizeAnamnesis(a.anamnesis_data)),
        raw: a,
      }))
      .filter((r) => !isHealthHistoryEmpty(r.data));

    const fromManual = (manualRecords || []).map((r: any) => ({
      key: `m-${r.id}`,
      date: `${r.recorded_at}T12:00:00`,
      // Desempate entre registros do mesmo dia: vale o salvo/editado mais recente.
      tie: new Date(r.updated_at || r.created_at || `${r.recorded_at}T12:00:00`).getTime(),
      source: "manual" as const,
      data: normalizeHealthHistory({
        healthConditions: r.health_conditions,
        healthConditionsOther: r.health_conditions_other,
        healthConditionsOtherOnset: r.health_conditions_other_onset,
        healthConditionsOtherControl: r.health_conditions_other_control,
        healthConditionsControl: r.health_conditions_control,
        usesContinuousMedication: r.uses_continuous_medication,
        continuousMedications: r.continuous_medications,
      }),
      raw: r,
    }));

    return [...fromAssessments, ...fromManual].sort((a: any, b: any) => {
      const dayA = new Date(a.date).setHours(0, 0, 0, 0);
      const dayB = new Date(b.date).setHours(0, 0, 0, 0);
      if (dayA !== dayB) return dayB - dayA;
      // Mesmo dia: registro manual do profissional prevalece sobre a anamnese...
      if (a.source !== b.source) return a.source === "manual" ? -1 : 1;
      // ...e entre manuais vale o salvo/editado mais recentemente.
      return (b.tie ?? new Date(b.date).getTime()) - (a.tie ?? new Date(a.date).getTime());
    });

  }, [assessments, manualRecords]);


  const latest = records[0];
  const previous = records.slice(1);
  const risk = useMemo<HealthRiskAssessment>(
    () =>
      latest
        ? getHealthRiskAssessment(latest.data)
        : {
            level: "none",
            riskConditions: [],
            managed: [],
            unmanaged: [],
            unknownControl: [],
            uncontrolledOther: false,
            hasRisk: false,
          },
    [latest],
  );

  // Recalcula o nível de atenção sempre que o registro mais recente muda
  // (inclusive imediatamente após o profissional salvar uma alteração).
  useEffect(() => {
    onRiskChange?.(risk);
  }, [risk, onRiskChange]);

  const attention = risk.level === "attention";
  const managedOnly = risk.level === "managed";
  const conditionsText = latest ? formatHealthConditions(latest.data, language) : "";
  const medicationText = latest ? formatContinuousMedication(latest.data, language) : "";

  const openNew = () => {
    const base = emptyForm();
    if (latest) {
      // Pré-preenche com o quadro atual para o profissional só registrar o que mudou.
      base.healthConditions = [...(latest.data.healthConditions || [])];
      base.healthConditionsOther = latest.data.healthConditionsOther || "";
      base.healthConditionsOtherOnset = latest.data.healthConditionsOtherOnset || "";
      base.healthConditionsOtherControl = latest.data.healthConditionsOtherControl || "";
      base.healthConditionsControl = { ...(latest.data.healthConditionsControl || {}) };
      base.usesContinuousMedication = latest.data.usesContinuousMedication || "";
      base.continuousMedications = latest.data.continuousMedications || "";
    }
    setForm(base);
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setForm({
      id: r.id,
      recorded_at: r.recorded_at || todayISO(),
      healthConditions: r.health_conditions || [],
      healthConditionsOther: r.health_conditions_other || "",
      healthConditionsOtherOnset: r.health_conditions_other_onset || "",
      healthConditionsOtherControl: r.health_conditions_other_control || "",
      healthConditionsControl: r.health_conditions_control || {},
      usesContinuousMedication: r.uses_continuous_medication || "",
      continuousMedications: r.continuous_medications || "",
      change_summary: r.change_summary || "",
      observations: r.observations || "",
      suggestions: r.suggestions || "",
    });
    setDialogOpen(true);
  };


  const toggleCondition = (cid: string) => {
    setForm((f) => {
      let list = f.healthConditions || [];
      if (cid === "none") list = list.includes("none") ? [] : ["none"];
      else {
        list = list.filter((x) => x !== "none");
        list = list.includes(cid) ? list.filter((x) => x !== cid) : [...list, cid];
      }
      return { ...f, healthConditions: list };
    });
  };

  const handleSave = async () => {
    if (!user) return;
    if ((form.healthConditions || []).length === 0 && !form.usesContinuousMedication && !form.observations.trim()) {
      toast({
        title: txt("Preencha ao menos uma informação", "Fill at least one field", "Complete al menos un dato"),
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        patient_id: patientId || null,
        patient_email: patientEmail || null,
        patient_name: patientName || null,
        clinic_id: clinicId || null,
        author_name: (user.user_metadata as any)?.full_name || user.email || null,
        recorded_at: form.recorded_at || todayISO(),
        health_conditions: form.healthConditions || [],
        health_conditions_other: form.healthConditions.includes("other") ? form.healthConditionsOther || null : null,
        health_conditions_other_onset: form.healthConditions.includes("other")
          ? form.healthConditionsOtherOnset || null
          : null,
        health_conditions_other_control: form.healthConditions.includes("other")
          ? form.healthConditionsOtherControl || null
          : null,
        health_conditions_control: Object.fromEntries(
          Object.entries(form.healthConditionsControl || {}).filter(
            ([cid, v]) => !!v && form.healthConditions.includes(cid),
          ),
        ),
        uses_continuous_medication: form.usesContinuousMedication || null,

        continuous_medications: form.continuousMedications || null,
        change_summary: form.change_summary || null,
        observations: form.observations || null,
        suggestions: form.suggestions || null,
      };
      const sb = supabase as any;
      const { error } = form.id
        ? await sb.from("patient_health_records").update(payload).eq("id", form.id)
        : await sb.from("patient_health_records").insert({ ...payload, created_by: user.id });
      if (error) throw error;
      toast({ title: txt("Saúde geral atualizada", "General health updated", "Salud general actualizada") });
      setDialogOpen(false);
      await loadManual();
    } catch (e: any) {
      toast({
        title: txt("Não foi possível salvar", "Could not save", "No se pudo guardar"),
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rid: string) => {
    setDeletingId(rid);
    try {
      const { error } = await (supabase as any).from("patient_health_records").delete().eq("id", rid);
      if (error) throw error;
      await loadManual();
    } catch (e: any) {
      toast({
        title: txt("Não foi possível excluir", "Could not delete", "No se pudo eliminar"),
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const sourceBadge = (source: "manual" | "assessment", raw: any) => (
    <Badge variant="outline" className="text-[10px] gap-1 font-normal">
      {source === "manual" ? <UserCog className="h-3 w-3" /> : <Stethoscope className="h-3 w-3" />}
      {source === "manual"
        ? `${txt("Registro do profissional", "Professional entry", "Registro del profesional")}${raw?.author_name ? ` • ${raw.author_name}` : ""}`
        : txt("Anamnese", "Anamnesis", "Anamnesis")}
    </Badge>
  );

  return (
    <Card
      id={id}
      className={`scroll-mt-24 ${
        attention
          ? "border-destructive/40 bg-destructive/[0.03]"
          : managedOnly
            ? "border-amber-300/60 bg-amber-50/40"
            : ""
      }`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <HeartPulse
            className={`h-4 w-4 ${attention ? "text-destructive" : managedOnly ? "text-amber-600" : "text-primary"}`}
          />
          {txt("Saúde geral", "General health", "Salud general")}
          {attention && (
            <Badge variant="outline" className="gap-1 border-destructive/40 bg-destructive/10 text-destructive text-[10px]">
              <AlertTriangle className="h-3 w-3" />
              {risk.unmanaged.length > 0
                ? txt("Condição não manejada", "Unmanaged condition", "Condición no manejada")
                : txt("Controle não informado", "Control not informed", "Control no informado")}
            </Badge>
          )}
          {managedOnly && (
            <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-700 text-[10px]">
              <HeartPulse className="h-3 w-3" />
              {txt("Condição controlada", "Controlled condition", "Condición controlada")}
            </Badge>
          )}

          {latest && (
            <span className="text-[11px] font-normal text-muted-foreground">
              {txt("Registrado em", "Recorded on", "Registrado el")} {fmtDate(latest.date)}
            </span>
          )}
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 ml-auto text-xs gap-1.5"
              onClick={openNew}
            >
              {latest ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {latest
                ? txt("Atualizar", "Update", "Actualizar")
                : txt("Preencher", "Fill in", "Completar")}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!latest ? (
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            {txt(
              "Sem triagem de saúde geral registrada. Você pode preencher agora mesmo pelo botão acima, sem precisar gerar uma nova avaliação.",
              "No general health screening recorded yet. You can fill it in right now with the button above, without creating a new assessment.",
              "Sin cribado de salud general registrado. Puede completarlo ahora con el botón de arriba, sin generar una nueva evaluación.",
            )}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {(latest.data.healthConditions || []).map((cid) => {
                const isRisk = RISK_CONDITION_IDS.includes(cid as any);
                const ctrl =
                  cid === "other"
                    ? latest.data.healthConditionsOtherControl || ""
                    : (latest.data.healthConditionsControl || {})[cid] || "";
                const isManaged = MANAGED_CONTROL_IDS.includes(ctrl);
                const isUnmanaged = RISK_CONTROL_IDS.includes(ctrl);
                const tone =
                  cid === "none"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : isUnmanaged || (isRisk && !isManaged)
                      ? "border-destructive/40 bg-destructive/10 text-destructive"
                      : isManaged
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "";
                return (
                  <Badge key={cid} variant="outline" className={tone}>
                    {(isUnmanaged || (isRisk && !isManaged)) && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {healthConditionLabel(cid, language)}
                    {ctrl && cid !== "other" && (
                      <span className="ml-1 font-normal opacity-80">• {otherControlLabel(ctrl, language)}</span>
                    )}
                  </Badge>
                );
              })}
              {sourceBadge(latest.source, latest.raw)}
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

            {latest.source === "manual" && (
              <div className="space-y-1.5 text-sm">
                {latest.raw.change_summary && (
                  <p>
                    <span className="text-muted-foreground">
                      {txt("O que mudou", "What changed", "Qué cambió")}:{" "}
                    </span>
                    {latest.raw.change_summary}
                  </p>
                )}
                {latest.raw.observations && (
                  <p>
                    <span className="text-muted-foreground">
                      {txt("Observações", "Observations", "Observaciones")}:{" "}
                    </span>
                    {latest.raw.observations}
                  </p>
                )}
                {latest.raw.suggestions && (
                  <p>
                    <span className="text-muted-foreground">
                      {txt("Sugestões", "Suggestions", "Sugerencias")}:{" "}
                    </span>
                    {latest.raw.suggestions}
                  </p>
                )}
                {canEdit && (
                  <div className="flex items-center gap-1 pt-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1.5 text-muted-foreground"
                      onClick={() => openEdit(latest.raw)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {txt("Editar este registro", "Edit this entry", "Editar este registro")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1.5 text-destructive hover:text-destructive"
                      disabled={deletingId === latest.raw.id}
                      onClick={() => handleDelete(latest.raw.id)}
                    >
                      {deletingId === latest.raw.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      {txt("Excluir", "Delete", "Eliminar")}
                    </Button>
                  </div>
                )}
              </div>
            )}

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
                    `Histórico de alterações (${previous.length})`,
                    `Change history (${previous.length})`,
                    `Historial de cambios (${previous.length})`,
                  )}
                </Button>
                {showHistory && (
                  <div className="mt-2 space-y-2">
                    {previous.map((r) => (
                      <div key={r.key} className="text-xs text-muted-foreground border-l-2 border-border pl-3 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">{fmtDate(r.date)}</span>
                          {sourceBadge(r.source, r.raw)}
                        </div>
                        <div>
                          {formatHealthConditions(r.data, language) ||
                            txt("Sem condições", "No conditions", "Sin condiciones")}
                          {formatContinuousMedication(r.data, language) &&
                            ` • ${formatContinuousMedication(r.data, language)}`}
                        </div>
                        {r.source === "manual" && r.raw.change_summary && (
                          <div>
                            {txt("O que mudou", "What changed", "Qué cambió")}: {r.raw.change_summary}
                          </div>
                        )}
                        {r.source === "manual" && r.raw.observations && <div>{r.raw.observations}</div>}
                        {r.source === "manual" && canEdit && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[11px] gap-1"
                              onClick={() => openEdit(r.raw)}
                            >
                              <Pencil className="h-3 w-3" />
                              {txt("Editar", "Edit", "Editar")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-1.5 text-[11px] gap-1 text-destructive hover:text-destructive"
                              disabled={deletingId === r.raw.id}
                              onClick={() => handleDelete(r.raw.id)}
                            >
                              {deletingId === r.raw.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              {txt("Excluir", "Delete", "Eliminar")}
                            </Button>
                          </div>
                        )}
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

      <Dialog open={dialogOpen} onOpenChange={(o) => !saving && setDialogOpen(o)}>
        <DialogContent
          className="max-w-lg max-h-[85vh] overflow-y-auto"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >

          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-primary" />
              {form.id
                ? txt("Editar registro de saúde geral", "Edit general health entry", "Editar registro de salud general")
                : txt("Atualizar saúde geral", "Update general health", "Actualizar salud general")}
            </DialogTitle>
            <DialogDescription>
              {txt(
                "Registre condições, medicação e o que mudou. O histórico anterior é preservado.",
                "Record conditions, medication and what changed. Previous history is preserved.",
                "Registre condiciones, medicación y qué cambió. El historial anterior se conserva.",
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{txt("Data do registro", "Entry date", "Fecha del registro")}</Label>
              <Input
                type="date"
                value={form.recorded_at}
                onChange={(e) => setForm((f) => ({ ...f, recorded_at: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{healthHistoryLabel("conditions", language)}</Label>
              <div className="flex flex-wrap gap-2">
                {HEALTH_CONDITION_IDS.map((cid) => {
                  const active = form.healthConditions.includes(cid);
                  return (
                    <Button
                      key={cid}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className="h-8 text-xs"
                      onClick={() => toggleCondition(cid)}
                    >
                      {healthConditionLabel(cid, language)}
                    </Button>
                  );
                })}
              </div>
            </div>

            {RISK_CONDITION_IDS.filter((cid) => form.healthConditions.includes(cid)).map((cid) => (
              <div key={cid} className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                <Label className="text-xs">
                  {healthConditionLabel(cid, language)} —{" "}
                  {txt("como está o controle hoje?", "how is it controlled today?", "¿cómo está el control hoy?")}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {OTHER_CONTROL_OPTIONS.map((o) => {
                    const active = (form.healthConditionsControl || {})[cid] === o.id;
                    return (
                      <Button
                        key={o.id}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        className="h-8 text-xs"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            healthConditionsControl: {
                              ...(f.healthConditionsControl || {}),
                              [cid]: active ? "" : o.id,
                            },
                          }))
                        }
                      >
                        {otherControlLabel(o.id, language)}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {txt(
                    "Condição controlada gera atenção moderada; não controlada ou sem acompanhamento eleva o nível de atenção.",
                    "A controlled condition raises moderate attention; uncontrolled or without follow-up raises the attention level.",
                    "Una condición controlada genera atención moderada; no controlada o sin seguimiento eleva el nivel de atención.",
                  )}
                </p>
              </div>
            ))}

            {form.healthConditions.includes("other") && (
              <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-3">

                <div className="space-y-1.5">
                  <Label className="text-xs">{txt("Qual condição?", "Which condition?", "¿Cuál condición?")}</Label>
                  <Input
                    value={form.healthConditionsOther}
                    onChange={(e) => setForm((f) => ({ ...f, healthConditionsOther: e.target.value }))}
                    placeholder={txt("Ex.: asma", "e.g. asthma", "Ej.: asma")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{txt("Desde quando?", "Since when?", "¿Desde cuándo?")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {OTHER_ONSET_OPTIONS.map((o) => (
                      <Button
                        key={o.id}
                        type="button"
                        size="sm"
                        variant={form.healthConditionsOtherOnset === o.id ? "default" : "outline"}
                        className="h-8 text-xs"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            healthConditionsOtherOnset: f.healthConditionsOtherOnset === o.id ? "" : o.id,
                          }))
                        }
                      >
                        {otherOnsetLabel(o.id, language)}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{txt("Controle atual", "Current control", "Control actual")}</Label>
                  <div className="flex flex-wrap gap-2">
                    {OTHER_CONTROL_OPTIONS.map((o) => (
                      <Button
                        key={o.id}
                        type="button"
                        size="sm"
                        variant={form.healthConditionsOtherControl === o.id ? "default" : "outline"}
                        className="h-8 text-xs"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            healthConditionsOtherControl: f.healthConditionsOtherControl === o.id ? "" : o.id,
                          }))
                        }
                      >
                        {otherControlLabel(o.id, language)}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">{healthHistoryLabel("medication", language)}</Label>
              <div className="flex gap-2">
                {[
                  { id: "yes", label: txt("Sim", "Yes", "Sí") },
                  { id: "no", label: txt("Não", "No", "No") },
                ].map((o) => (
                  <Button
                    key={o.id}
                    type="button"
                    size="sm"
                    variant={form.usesContinuousMedication === o.id ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        usesContinuousMedication: f.usesContinuousMedication === o.id ? "" : o.id,
                      }))
                    }
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
              {form.usesContinuousMedication === "yes" && (
                <Textarea
                  className="mt-2"
                  rows={2}
                  value={form.continuousMedications}
                  onChange={(e) => setForm((f) => ({ ...f, continuousMedications: e.target.value }))}
                  placeholder={txt(
                    "Quais medicamentos e doses",
                    "Which medications and doses",
                    "Qué medicamentos y dosis",
                  )}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{txt("O que mudou", "What changed", "Qué cambió")}</Label>
              <Textarea
                rows={2}
                value={form.change_summary}
                onChange={(e) => setForm((f) => ({ ...f, change_summary: e.target.value }))}
                placeholder={txt(
                  "Ex.: iniciou losartana 50mg; pressão controlada",
                  "e.g. started losartan 50mg; blood pressure controlled",
                  "Ej.: inició losartán 50mg; presión controlada",
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{txt("Observações", "Observations", "Observaciones")}</Label>
              <Textarea
                rows={2}
                value={form.observations}
                onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{txt("Sugestões / condutas", "Suggestions / plan", "Sugerencias / conductas")}</Label>
              <Textarea
                rows={2}
                value={form.suggestions}
                onChange={(e) => setForm((f) => ({ ...f, suggestions: e.target.value }))}
                placeholder={txt(
                  "Ex.: solicitar liberação médica antes de alta intensidade",
                  "e.g. request medical clearance before high intensity",
                  "Ej.: solicitar autorización médica antes de alta intensidad",
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              {txt("Cancelar", "Cancel", "Cancelar")}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {txt("Salvar", "Save", "Guardar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default HealthGeneralCard;
