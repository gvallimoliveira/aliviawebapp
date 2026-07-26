import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import AssessmentTimeline from "../AssessmentTimeline";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import { Separator } from "@/components/ui/separator";
import CreateExerciseProgramModal from "../CreateExerciseProgramModal";
import ManualAssessmentModal from "../ManualAssessmentModal";
import ExternalAssessmentUploadModal from "../ExternalAssessmentUploadModal";
import AddPatientModal, { type PatientToEdit } from "../AddPatientModal";
import FinalHypothesisEditor from "../FinalHypothesisEditor";
import PatientFilesSection from "../PatientFilesSection";
import PatientStrengthSection from "./PatientStrengthSection";
import PatientPhotosSection from "../PatientPhotosSection";
import QuestionnaireResultCard from "@/components/assessment/QuestionnaireResultCard";
import RegionPainComparison from "../RegionPainComparison";
import SessionNotesSection from "../SessionNotesSection";
import VoiceNoteCard from "../VoiceNoteCard";
import PainMapView from "@/components/assessment/PainMapView";
import AssessmentSummaryView from "@/components/assessment/AssessmentSummaryView";
import { generateEvolutionPdfBlob, type EvolutionSummary } from "@/utils/generatePdf";
import { mockEvolutionSummary } from "@/data/mockPatientData";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Archive, ArchiveRestore, ArrowLeft, Brain, ChevronRight, ClipboardList, Copy, Dumbbell, ExternalLink, Eye, EyeOff, FileCheck, FilePlus, FileText, FileUp, Loader2, Lock, Mail, MessageCircle, MoreVertical, NotebookPen, Pencil, RefreshCw, RotateCcw, Share2, Sparkles, Stethoscope, Trash2, TrendingUp, UserCog, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { ClinicalImpressionCard, TreatmentPaidRetry, TreatmentUnlockCTA } from "./shared";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";
import { buildReassessmentLink, buildResumeAssessmentLink } from "@/lib/assessmentLinks";
import ReassessmentConfigDialog from "./ReassessmentConfigDialog";
import type { ReassessStepId } from "@/lib/reassessmentSteps";
import { createShortAppLink } from "@/lib/shortLink";
import { openWhatsAppDeferred } from "@/lib/whatsappShare";
import { useCanEditFinalHypothesis as propsUseCanEditFinalHypothesis } from "@/lib/finalHypothesis";
import { useClinicalAgentAccess } from "@/hooks/useClinicalAgentAccess";
import { useClinic } from "@/contexts/ClinicContext";


const SUBSCALE_COLORS = [
  "hsl(210, 70%, 55%)",
  "hsl(150, 60%, 45%)",
  "hsl(35, 80%, 55%)",
];

interface DiagnosticHypothesisBlockProps {
  assessment: any;
  isDemo?: boolean;
}

const DiagnosticHypothesisBlock = ({ assessment, isDemo }: DiagnosticHypothesisBlockProps) => {
  const canEdit = propsUseCanEditFinalHypothesis(assessment);
  const [localFinal, setLocalFinal] = React.useState<string | null>(assessment.final_hypothesis ?? null);
  const [localFinalAt, setLocalFinalAt] = React.useState<string | null>(assessment.final_hypothesis_at ?? null);

  React.useEffect(() => {
    setLocalFinal(assessment.final_hypothesis ?? null);
    setLocalFinalAt(assessment.final_hypothesis_at ?? null);
  }, [assessment.id, assessment.final_hypothesis, assessment.final_hypothesis_at]);

  const aiHypothesis: string | undefined = assessment.diagnosis?.hypothesis;
  const displayed = (localFinal && localFinal.trim()) || aiHypothesis;
  const hasOverride = !!(localFinal && localFinal.trim());
  const formattedDate = localFinalAt ? new Date(localFinalAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : null;

  const assessmentDate = assessment?.created_at
    ? new Date(assessment.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : null;

  return (
    <>
      <Card className="border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            Hipótese Diagnóstica
            {hasOverride && <Badge variant="secondary" className="text-[10px] ml-1">Revisada pelo fisioterapeuta</Badge>}
          </CardTitle>
          {assessmentDate && (
            <CardDescription className="text-xs">Caso atual — avaliação de {assessmentDate}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-semibold text-foreground leading-relaxed">{displayed}</p>
          {hasOverride && formattedDate && <p className="text-[11px] text-muted-foreground">Atualizada em {formattedDate}</p>}
          {!hasOverride && assessment.diagnosis?.confidence === "high" && <Badge variant="outline" className="text-[10px] capitalize">Confiança: {assessment.diagnosis.confidence}</Badge>}
          {assessment.diagnosis?.reasoning && <p className="text-xs text-muted-foreground leading-relaxed mt-1">{assessment.diagnosis.reasoning}</p>}
          {hasOverride && aiHypothesis && (
            <div className="mt-2 pt-2 border-t border-border/60">
              <p className="text-[11px] text-muted-foreground"><Sparkles className="inline h-3 w-3 mr-1 -mt-0.5" />Sugestão original da IA: <span className="italic">{aiHypothesis}</span></p>
            </div>
          )}
        </CardContent>
      </Card>
      {canEdit && !isDemo && (
        <FinalHypothesisEditor
          assessmentId={assessment.id}
          aiHypothesis={aiHypothesis}
          finalHypothesis={localFinal}
          finalHypothesisAt={localFinalAt}
          onSaved={(newValue) => {
            setLocalFinal(newValue);
            setLocalFinalAt(newValue ? new Date().toISOString() : null);
          }}
        />
      )}
    </>
  );
};

interface GenerateHypothesisCardProps {
  assessment: any;
  isDemo?: boolean;
  onGenerated: (diagnosis: any) => void;
}

const GenerateHypothesisCard = ({ assessment, isDemo, onGenerated }: GenerateHypothesisCardProps) => {
  const [loading, setLoading] = React.useState(false);
  const handleGenerate = async () => {
    setLoading(true);
    try {
      if (isDemo) {
        const demoDx = { hypothesis: "Hipótese diagnóstica simulada (demo)", summary: "Resumo demo.", confidence: "medium", manual: true };
        onGenerated(demoDx);
        return;
      }
      const { data, error } = await supabase.functions.invoke("generate-diagnosis", {
        body: {
          anamnesisData: {
            ...(assessment.anamnesis_data || {}),
            painRegions: assessment.pain_regions,
            painScore: assessment.pain_score,
          },
          questionnaireResults: Array.isArray(assessment.test_results) ? assessment.test_results : [],
          mode: "professional",
          language: document.documentElement.lang === "en" ? "en" : "pt",
        },
      });
      if (error) throw error;
      const dx = data?.diagnosis || data;
      if (!dx || typeof dx !== "object" || (!dx.hypothesis && !dx.summary)) {
        throw new Error("Resposta inválida da IA");
      }
      const merged = { ...(assessment.diagnosis || {}), ...dx };
      await supabase.from("assessments").update({ diagnosis: merged as any }).eq("id", assessment.id);
      onGenerated(merged);
    } catch (err: any) {
      console.error("Generate hypothesis error:", err);
      alert("Não foi possível gerar a hipótese: " + (err?.message || ""));
    } finally {
      setLoading(false);
    }
  };
  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-primary" />
          Hipótese Diagnóstica
        </CardTitle>
        <CardDescription className="text-xs">
          Esta avaliação foi salva sem hipótese. Gere agora com IA usando os dados de anamnese, dor e questionários.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleGenerate} disabled={loading} size="sm" className="gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? "Gerando..." : "Gerar hipótese com IA"}
        </Button>
      </CardContent>
    </Card>
  );
};



export default function PatientDetailView(props: any) {
  const navigate = useNavigate();
  const { hasAccess: hasAgentAccess } = useClinicalAgentAccess();
  const { isClinicMode, canManageClinic } = useClinic();
  // Regra de permissão para Dados Cadastrais:
  // - Modo profissional (solo): sem restrição → pode editar.
  // - Modo clínica: somente owner/admin/secretary podem editar (canManageClinic).
  const canEditRegistration = isClinicMode ? canManageClinic : true;

  const {
    t,
    language,
    patient,
    deletingPatient,
    setDeleteConfirmPatient,
    latestWithDiagnosis,
    professionalId,
    clinicId,
    buildAssessmentViewUrl,
    toast,
    setEditingHepId,
    setHepModalOpen,
    evolutionLoading,
    setEvolutionLoading,
    isDemo,
    professionalLogoUrl,
    clinicLogoUrl,
    clinicName,
    clinicTherapists,
    readOnly,
    allowManualAssessment,
    reassignOpen,
    setReassignOpen,
    reassignTargetId,
    setReassignTargetId,
    reassigning,
    handleReassignPatient,
    hepModalOpen,
    editingHepId,
    hepHistory,
    handleEditHep,
    handleSendHepViaChat,
    deletingHepId,
    handleDeleteHep,
    treatmentSectionRef,
    treatmentHighlight,
    lifetimeTreatment,
    setNotes,
    getPendingTreatmentAssessments,
    latestAnamnesisFields,
    latestAssessment,
    painData,
    selectedEmail,
    questionnaireEvolution,
    assessmentRefreshTick,
    showArchivedAssessments,
    setShowArchivedAssessments,
    getQuestionnaireResults,
    onShareWhatsApp,
    onDownloadPdf,
    archivingAssessmentId,
    handleRestoreAssessment,
    handleArchiveAssessment,
    deleteAssessmentTarget,
    setDeleteAssessmentTarget,
    deletingAssessmentId,
    handleDeleteAssessment,
    noteSaving,
    notes,
    saveNote,
    noteIncludeInPdf,
    toggleNoteInPdf,
    treatmentPicker,
    setTreatmentPicker,
    deleteConfirmPatient,
    handleDeletePatient,
    handleAcquireBadgeClick,
  } = props;

  const [manualAssessmentOpen, setManualAssessmentOpen] = React.useState(false);
  // Avaliação incompleta/em andamento que o profissional decidiu retomar:
  // abre o ManualAssessmentModal em modo edição (não o link público de autoavaliação).
  const [resumeAssessment, setResumeAssessment] = React.useState<any | null>(null);
  const [externalUploadOpen, setExternalUploadOpen] = React.useState(false);
  // Payload entregue pelo modal de upload externo, usado para abrir o
  // ManualAssessmentModal pré-preenchido com a interpretação da IA.
  const [externalPrefill, setExternalPrefill] = React.useState<{ markerId: string; row: any; externalSourceFileId?: string | null } | null>(null);
  const [summaryDialogOpen, setSummaryDialogOpen] = React.useState(false);
  const [reassessDialog, setReassessDialog] = React.useState<{ open: boolean; loading: boolean; link: string; error: string | null }>({ open: false, loading: false, link: "", error: null });
  const [reassessConfigOpen, setReassessConfigOpen] = React.useState(false);
  const [registrationModalOpen, setRegistrationModalOpen] = React.useState(false);
  const [registrationPatient, setRegistrationPatient] = React.useState<PatientToEdit | null>(null);
  const [registrationLoading, setRegistrationLoading] = React.useState(false);

  const fetchPatientRow = React.useCallback(async (id?: string | null) => {
    const sb = supabase as any;
    if (id) {
      const { data } = await sb
        .from("patients")
        .select("id, full_name, email, cpf, birth_date, phone, address, sex, occupation")
        .eq("id", id)
        .maybeSingle();
      if (data) return data;
    }
    let lookup = sb
      .from("patients")
      .select("id, full_name, email, cpf, birth_date, phone, address, sex, occupation")
      .limit(1);
    if (patient?.email) lookup = lookup.eq("email", patient.email);
    else lookup = lookup.eq("full_name", patient.name);
    if (clinicId) lookup = lookup.eq("clinic_id", clinicId);
    else if (professionalId) lookup = lookup.eq("professional_id", professionalId);
    const { data } = await lookup.maybeSingle();
    return data || null;
  }, [patient?.email, patient?.name, clinicId, professionalId]);

  const mapRowToPatient = React.useCallback((row: any): PatientToEdit => ({
    id: row.id,
    full_name: row.full_name || patient?.name || "",
    email: row.email ?? patient?.email ?? null,
    cpf: row.cpf ?? null,
    birth_date: row.birth_date ?? null,
    phone: row.phone ?? null,
    address: row.address ?? null,
    sex: row.sex ?? null,
    occupation: row.occupation ?? null,
  }), [patient?.name, patient?.email]);

  const openRegistrationModal = React.useCallback(async () => {
    if (registrationLoading) return;
    setRegistrationLoading(true);
    try {
      const sb = supabase as any;
      // Sempre busca a versão mais recente do banco (sem cache)
      let row: any = await fetchPatientRow(patient?.patientRecord?.id);

      if (!row?.id && (patient?.name || patient?.email)) {
        const payload: Record<string, any> = { full_name: patient.name || patient.email || "Paciente" };
        if (patient?.email) payload.email = patient.email;
        if (clinicId) payload.clinic_id = clinicId;
        else if (professionalId) payload.professional_id = professionalId;
        const { data: created, error } = await sb
          .from("patients")
          .insert(payload)
          .select("id, full_name, email, cpf, birth_date, phone, address, sex, occupation")
          .single();
        if (error) throw error;
        row = created;
      }

      if (!row?.id) {
        toast({
          title: language === "pt" ? "Não foi possível abrir o cadastro" : language === "es" ? "No se pudo abrir el registro" : "Could not open patient details",
          variant: "destructive",
        });
        return;
      }

      setRegistrationPatient(mapRowToPatient(row));
      setRegistrationModalOpen(true);
    } catch (err: any) {
      console.error("[registration modal] failed", err);
      toast({
        title: language === "pt" ? "Erro ao carregar cadastro" : language === "es" ? "Error al cargar el registro" : "Failed to load patient details",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setRegistrationLoading(false);
    }
  }, [registrationLoading, patient, clinicId, professionalId, toast, language, fetchPatientRow, mapRowToPatient]);

  // Após salvar dentro do modal, sincroniza estado com o banco para refletir imediatamente no próximo open
  const handleRegistrationSaved = React.useCallback(async () => {
    try {
      const row = await fetchPatientRow(registrationPatient?.id);
      if (row?.id) setRegistrationPatient(mapRowToPatient(row));
    } catch (err) {
      console.error("[registration modal] refresh after save failed", err);
    }
    window.dispatchEvent(new CustomEvent("reload-pro-patients"));
  }, [fetchPatientRow, mapRowToPatient, registrationPatient?.id]);


  const openReassessmentLinkDialog = React.useCallback(() => {
    if (!latestWithDiagnosis) return;
    if (isDemo) {
      toast({
        title: "Isto é uma simulação 🎬",
        description: "No modo demonstração não geramos links reais de reavaliação. Assine o plano PRO para enviar reavaliações de verdade aos seus pacientes.",
      });
      return;
    }
    if (!professionalId && !clinicId) {
      toast({ title: "Não foi possível gerar o link", description: "Contexto profissional/clínica ausente.", variant: "destructive" });
      return;
    }
    setReassessConfigOpen(true);
  }, [latestWithDiagnosis, professionalId, clinicId, toast, isDemo]);

  const buildReassessLinkWithSteps = React.useCallback(async (steps: ReassessStepId[]) => {
    if (!latestWithDiagnosis) return;
    setReassessConfigOpen(false);
    setReassessDialog({ open: true, loading: true, link: "", error: null });
    try {
      const longLink = buildReassessmentLink({ professionalId, clinicId }, latestWithDiagnosis.id, steps);
      const short = await createShortAppLink(longLink);
      setReassessDialog({ open: true, loading: false, link: short || longLink, error: null });
    } catch (err: any) {
      console.error("[reassessment] failed to build link", err);
      setReassessDialog({ open: true, loading: false, link: "", error: err?.message || "Erro ao gerar o link de reavaliação." });
    }
  }, [latestWithDiagnosis, professionalId, clinicId]);

  const copyReassessLink = async () => {
    if (!reassessDialog.link) return;
    try {
      await navigator.clipboard.writeText(reassessDialog.link);
      toast({ title: "Link copiado!" });
    } catch {
      toast({ title: "Não foi possível copiar automaticamente", description: "Selecione e copie o link manualmente.", variant: "destructive" });
    }
  };

  const shareReassessWhatsApp = () => {
    if (!reassessDialog.link) return;
    const wa = openWhatsAppDeferred();
    wa.send(`Olá ${patient?.name || ""}! Segue o link da sua reavaliação: ${reassessDialog.link}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => props.setSelectedEmail(null)} className="gap-2 rounded-full bg-primary/5 px-4 py-2 text-primary border border-primary/20 hover:bg-primary/10 hover:border-primary/30 hover:shadow-sm transition-all shadow-sm">
          <ArrowLeft className="h-4 w-4" />
          <span className="font-medium">{t("pro.back_to_patients")}</span>
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" disabled={!!deletingPatient} onClick={() => setDeleteConfirmPatient({ groupKey: patient.groupKey, name: patient.name, assessmentIds: patient.assessments.map((a: any) => a.id) })}>
          {deletingPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Excluir paciente
        </Button>
      </div>

      <div id="patient-detail-anchor" data-patient-detail-anchor className="flex items-start justify-between gap-3 flex-wrap scroll-mt-20">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-foreground">{patient.name}</h3>
            {patient.assessments.some((a: any) => a.treatment_plan) ? (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1"><FileCheck className="h-3 w-3" /> Tratamento Liberado</Badge>
            ) : patient.assessments.some((a: any) => a.diagnosis) ? (
              <Badge variant="outline" role="button" tabIndex={0} title={language === "pt" ? "Clique para ir ao card de compra do plano" : language === "es" ? "Clic para ir al card de compra del plan" : "Click to jump to the purchase card"} className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-200 gap-1 cursor-pointer hover:bg-amber-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400" onClick={(e) => { e.stopPropagation(); handleAcquireBadgeClick({ name: patient.name, email: patient.email, assessments: patient.assessments }); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); handleAcquireBadgeClick({ name: patient.name, email: patient.email, assessments: patient.assessments }); } }}><Lock className="h-3 w-3" /> {language === "pt" ? "Adquirir Tratamento" : language === "es" ? "Adquirir Tratamiento" : "Unlock Treatment"}</Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {patient.email}<span className="mx-1">•</span>{patient.assessments.length} {t("pro.assessments_count")}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(latestWithDiagnosis || latestAssessment) && <Button variant="ghost" size="sm" className="gap-1.5 shrink-0 text-primary hover:text-primary hover:bg-primary/10" onClick={() => setSummaryDialogOpen(true)}><Sparkles className="h-4 w-4" /> {language === "pt" ? "Resumo" : language === "es" ? "Resumen" : "Summary"}</Button>}
          {latestWithDiagnosis && <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate(buildAssessmentViewUrl(latestWithDiagnosis.id, patient.email))}><FileText className="h-4 w-4" /> {t("pro.view_full_assessment")}</Button>}
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => { setEditingHepId(null); setHepModalOpen(true); }}><Dumbbell className="h-4 w-4" /> Exercícios</Button>
          {((!readOnly || allowManualAssessment) || isDemo) && <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setManualAssessmentOpen(true)}><FilePlus className="h-4 w-4" /> {language === "pt" ? "Avaliação manual" : language === "es" ? "Evaluación manual" : "Manual assessment"}</Button>}
          {(latestWithDiagnosis || patient.assessments.filter((a: any) => a.diagnosis).length >= 2 || (hasAgentAccess && !isDemo) || !isDemo) && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 shrink-0" aria-label={language === "pt" ? "Mais ações" : "More actions"}>
                  <MoreVertical className="h-4 w-4" />
                  <span className="hidden sm:inline">{language === "pt" ? "Mais" : "More"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4} collisionPadding={8} className="w-56 z-[60]">
                <DropdownMenuLabel className="text-[11px] text-muted-foreground">{language === "pt" ? "Outras ações" : "Other actions"}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {!isDemo && (
                  <DropdownMenuItem disabled={registrationLoading} onSelect={(e) => { e.preventDefault(); openRegistrationModal(); }}>
                    {registrationLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserCog className="h-4 w-4 mr-2" />}
                    {language === "pt" ? "Dados cadastrais" : language === "es" ? "Datos del paciente" : "Patient details"}
                  </DropdownMenuItem>
                )}
                {hasAgentAccess && !isDemo && (
                  <DropdownMenuItem onSelect={async () => {
                    let patientDbId: string | null = null;
                    try {
                      const sb = supabase as any;
                      patientDbId = patient?.patientRecord?.id || null;

                      if (!patientDbId) {
                        let lookup = sb.from("patients").select("id").limit(1);
                        if (patient.email) {
                          lookup = lookup.eq("email", patient.email);
                        } else {
                          lookup = lookup.eq("full_name", patient.name);
                        }
                        if (clinicId) lookup = lookup.eq("clinic_id", clinicId);
                        else if (professionalId) lookup = lookup.eq("professional_id", professionalId);

                        const { data } = await lookup.maybeSingle();
                        patientDbId = data?.id || null;
                      }

                      if (!patientDbId && (patient.name || patient.email)) {
                        const payload: Record<string, string> = {
                          full_name: patient.name || patient.email || "Paciente",
                        };

                        if (patient.email) payload.email = patient.email;
                        if (clinicId) payload.clinic_id = clinicId;
                        else if (professionalId) payload.professional_id = professionalId;

                        const { data: created } = await sb.from("patients")
                          .insert(payload)
                          .select("id")
                          .single();

                        patientDbId = created?.id || null;
                      }
                    } catch {}
                    if (!patientDbId) {
                      toast({ title: language === "pt" ? "Paciente ainda não vinculado ao agente" : language === "es" ? "Paciente aún no vinculado al agente" : "Patient not yet linked to the agent" });
                    }
                    navigate(patientDbId ? `/agente?patient=${patientDbId}` : "/agente");
                  }}>
                    <Brain className="h-4 w-4 mr-2" /> {language === "pt" ? "Falar com o Agente Clínico" : language === "es" ? "Hablar con el Agente Clínico" : "Talk to Clinical Agent"}
                  </DropdownMenuItem>
                )}

                {((!readOnly || allowManualAssessment) || isDemo) && (
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setExternalUploadOpen(true); }}>
                    <FileUp className="h-4 w-4 mr-2" />
                    {language === "pt" ? "Upload de avaliação externa" : language === "es" ? "Subir evaluación externa" : "Upload external assessment"}
                  </DropdownMenuItem>
                )}

                {latestWithDiagnosis && (
                  <DropdownMenuItem onSelect={(e) => { e.preventDefault(); openReassessmentLinkDialog(); }}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Reavaliação
                  </DropdownMenuItem>
                )}
                {patient.assessments.filter((a: any) => a.diagnosis).length >= 2 && (
                  <DropdownMenuItem disabled={evolutionLoading} onSelect={async () => {
                    setEvolutionLoading(true);
                    try {
                      const withDiagnosis = patient.assessments.filter((a: any) => a.diagnosis).sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                      const firstA = withDiagnosis[0];
                      const lastA = withDiagnosis[withDiagnosis.length - 1];
                      let summary: any;
                      if (isDemo) {
                        await new Promise((r) => setTimeout(r, 1500));
                        summary = mockEvolutionSummary;
                      } else {
                        const normalizeQ = (tr: any) => Array.isArray(tr) ? tr.filter((t: any) => t.questionnaireId && t.percentageScore != null).map((t: any) => ({ id: t.questionnaireId, name: t.questionnaireName || t.questionnaireId, score: Math.round(t.percentageScore) })) : [];
                        const payload = { assessments: [{ date: firstA.created_at, pain_score: firstA.pain_score, hypothesis: firstA.diagnosis?.hypothesis, pain_regions: firstA.pain_regions || [], questionnaires: normalizeQ(firstA.test_results) }, { date: lastA.created_at, pain_score: lastA.pain_score, hypothesis: lastA.diagnosis?.hypothesis, pain_regions: lastA.pain_regions || [], questionnaires: normalizeQ(lastA.test_results) }], language };
                        const { data: summaryData, error } = await supabase.functions.invoke("generate-evolution-summary", { body: payload });
                        if (error) throw new Error(error?.message || "Erro ao conectar com o servidor de IA");
                        if (!summaryData || summaryData?.error) throw new Error(summaryData?.error || "Resposta inválida da IA");
                        if (!summaryData.narrative || !summaryData.conclusion || !summaryData.recommendation) throw new Error("Resumo incompleto gerado pela IA. Tente novamente.");
                        summary = summaryData;
                      }
                      const { resolveAssessmentBranding } = await import("@/lib/resolveAssessmentBranding");
                      const _branding = await resolveAssessmentBranding({ clinicId: clinicId || null, professionalId: professionalId || null, userId: null });
                      const blob = await generateEvolutionPdfBlob({ patientName: patient.name, firstAssessment: { date: firstA.created_at, pain_score: firstA.pain_score, pain_regions: firstA.pain_regions || [], test_results: firstA.test_results, hypothesis: firstA.diagnosis?.hypothesis }, lastAssessment: { date: lastA.created_at, pain_score: lastA.pain_score, pain_regions: lastA.pain_regions || [], test_results: lastA.test_results, hypothesis: lastA.diagnosis?.hypothesis }, totalAssessments: withDiagnosis.length, summary: summary as EvolutionSummary, language, professionalLogoUrl: _branding.professionalLogoUrl ?? professionalLogoUrl, clinicLogoUrl: _branding.clinicLogoUrl ?? clinicLogoUrl, clinicName: _branding.clinicName ?? clinicName, responsibleProfessional: _branding.responsibleProfessional });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `AliviA_Evolucao_${patient.name.replace(/\s/g, "_")}.pdf`;
                      a.click();
                      URL.revokeObjectURL(url);
                      if (!isDemo) {
                        const { sharePdfFile, shareTextOrOpenWhatsApp } = await import("@/lib/whatsappShare");
                        const nativeShareResult = await sharePdfFile({ blob, fileName: `AliviA_Evolucao_${patient.name.replace(/\s+/g, "_")}.pdf`, title: "Aliv.iA", text: `${t("evolution.title")} - ${patient.name}` });
                        if (nativeShareResult === "shared" || nativeShareResult === "cancelled") { toast({ title: t("evolution.success") }); return; }
                        const { data: { user: _authUser } } = await supabase.auth.getUser();
                        const fileName = _authUser ? `${_authUser.id}/evolution_${patient.name.replace(/\s/g, "_")}_${Date.now()}.pdf` : `evolution_${patient.name.replace(/\s/g, "_")}_${Date.now()}.pdf`;
                        const { error: uploadError } = _authUser
                          ? await supabase.storage.from("assessment-reports").upload(fileName, blob, { contentType: "application/pdf", upsert: true })
                          : { error: new Error("anonymous_upload_blocked") } as any;
                        if (!uploadError) {
                          const { data: publicUrl } = supabase.storage.from("assessment-reports").getPublicUrl(fileName);
                          if (publicUrl?.publicUrl) await shareTextOrOpenWhatsApp(`${t("evolution.title")} - ${patient.name}\n${publicUrl.publicUrl}`, "Aliv.iA");
                          else toast({ title: t("evolution.success"), description: language === "pt" ? "O PDF foi baixado para envio manual, pois o anexo direto não ficou disponível neste dispositivo." : "The PDF was downloaded for manual sharing because direct attachment was not available on this device." });
                        } else {
                          toast({ title: t("evolution.success"), description: language === "pt" ? "O PDF foi baixado para envio manual, pois o anexo direto não ficou disponível neste dispositivo." : "The PDF was downloaded for manual sharing because direct attachment was not available on this device." });
                        }
                      }
                      toast({ title: t("evolution.success") });
                    } catch (err: any) {
                      console.error("Evolution report error:", err);
                      toast({ title: t("evolution.error"), description: err?.message, variant: "destructive" });
                    } finally {
                      setEvolutionLoading(false);
                    }
                  }}>
                    {evolutionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
                    {t("evolution.title")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
      </div>
      </div>



      {(() => {
        const summaryTarget = latestWithDiagnosis || latestAssessment;
        if (!summaryTarget) return null;
        return (
          <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {language === "pt" ? "Resumo da última avaliação" : language === "es" ? "Resumen de la última evaluación" : "Latest assessment summary"}
                </DialogTitle>
                <DialogDescription>
                  {patient.name} · {new Date(summaryTarget.created_at).toLocaleDateString(language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US", { day: "2-digit", month: "long", year: "numeric" })}
                </DialogDescription>
              </DialogHeader>
              <AssessmentSummaryView
                assessment={summaryTarget}
                embedded
                onDownloadPdf={() => onDownloadPdf?.(summaryTarget)}
                onShareWhatsApp={() => onShareWhatsApp?.(summaryTarget)}
              />
            </DialogContent>
          </Dialog>
        );
      })()}



      {clinicId && !isDemo && (() => {
        const assignedProIds = Array.from(new Set(patient.assessments.map((a: any) => a.professional_id).filter((id: any) => !!id))) as string[];
        const assignedPros = clinicTherapists.filter((p: any) => assignedProIds.includes(p.id));
        const unassignedCount = patient.assessments.filter((a: any) => !a.professional_id).length;
        const canManage = !readOnly;
        return (
          <Card className="border-sky-200 bg-sky-50/40 dark:bg-sky-950/10">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><UserCog className="h-4 w-4 text-sky-600" />Fisioterapeuta(s) responsável(eis)</CardTitle><CardDescription className="text-xs">{assignedPros.length === 0 && unassignedCount > 0 ? `${unassignedCount} avaliação(ões) sem fisio designado` : `${assignedPros.length} fisio(s) atualmente vinculado(s) — você pode reatribuir a qualquer momento`}</CardDescription></CardHeader>
            <CardContent className="space-y-3"><div className="flex flex-wrap gap-2">{assignedPros.length === 0 ? <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300">Nenhum fisio designado</Badge> : assignedPros.map((p: any) => { const count = patient.assessments.filter((a: any) => a.professional_id === p.id).length; return <Badge key={p.id} variant="secondary" className="gap-1"><Users className="h-3 w-3" />{p.full_name}<span className="ml-1 text-[10px] opacity-70">({count})</span></Badge>; })}</div>{canManage && clinicTherapists.length > 0 && <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setReassignTargetId(""); setReassignOpen(true); }}><UserCog className="h-4 w-4" />Alterar / atribuir fisioterapeuta</Button>}</CardContent>
          </Card>
        );
      })()}

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Atribuir fisioterapeuta</DialogTitle><DialogDescription>Todas as avaliações deste paciente passarão a ser do fisio escolhido. O paciente pode atender com mais de um — basta repetir o processo quando trocar de profissional.</DialogDescription></DialogHeader><div className="space-y-2 max-h-[50vh] overflow-y-auto">{clinicTherapists.map((p: any) => <button key={p.id} type="button" onClick={() => setReassignTargetId(p.id)} className={`w-full text-left p-3 rounded-md border transition-colors ${reassignTargetId === p.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}><div className="flex items-center gap-2"><UserCog className="h-4 w-4 text-muted-foreground" /><span className="font-medium text-sm">{p.full_name}</span></div></button>)}{clinicTherapists.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum fisioterapeuta ativo na clínica.</p>}</div><DialogFooter><Button variant="outline" onClick={() => setReassignOpen(false)} disabled={reassigning}>Cancelar</Button><Button onClick={() => patient && handleReassignPatient(patient.assessments.map((a: any) => a.id), reassignTargetId)} disabled={!reassignTargetId || reassigning}>{reassigning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}</Button></DialogFooter></DialogContent></Dialog>

      <CreateExerciseProgramModal open={hepModalOpen} onOpenChange={(open) => { setHepModalOpen(open); if (!open) setEditingHepId(null); }} professionalId={professionalId} patientName={patient.name} assessmentId={latestWithDiagnosis?.id} editProgramId={editingHepId} clinicId={clinicId} demoMode={isDemo} />

      <ReassessmentConfigDialog
        open={reassessConfigOpen}
        onOpenChange={setReassessConfigOpen}
        onConfirm={buildReassessLinkWithSteps}
        patientName={patient?.name}
      />

      <Dialog open={reassessDialog.open} onOpenChange={(open) => setReassessDialog((s) => ({ ...s, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-primary" /> Link de reavaliação</DialogTitle>
            <DialogDescription>
              {patient?.name ? `Para ${patient.name}. ` : ""}Compartilhe com o paciente para que ele responda uma nova avaliação reaproveitando os dados anteriores.
            </DialogDescription>
          </DialogHeader>
          {reassessDialog.loading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Gerando link…</div>
          ) : reassessDialog.error ? (
            <div className="text-sm text-destructive py-2">{reassessDialog.error}</div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs break-all font-mono select-all">{reassessDialog.link}</div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" className="gap-1.5" onClick={copyReassessLink}><Copy className="h-3.5 w-3.5" /> Copiar</Button>
                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={shareReassessWhatsApp}><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Button>
                <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => window.open(reassessDialog.link, "_blank", "noopener,noreferrer")}><ExternalLink className="h-3.5 w-3.5" /> Abrir</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {resumeAssessment && (
        <ManualAssessmentModal
          open={!!resumeAssessment}
          onOpenChange={(open) => { if (!open) setResumeAssessment(null); }}
          professionalId={professionalId}
          clinicId={clinicId}
          patientName={patient.name}
          patientEmail={patient.email}
          editAssessment={resumeAssessment}
          demoMode={isDemo}
        />
      )}

      {manualAssessmentOpen && (
        <ManualAssessmentModal
          open={manualAssessmentOpen}
          onOpenChange={(open) => {
            setManualAssessmentOpen(open);
            if (!open) setExternalPrefill(null);
          }}
          professionalId={professionalId}
          clinicId={clinicId}
          patientName={patient.name}
          patientEmail={patient.email}
          prefillData={externalPrefill}
          demoMode={isDemo}
        />
      )}

      {externalUploadOpen && (
        <ExternalAssessmentUploadModal
          open={externalUploadOpen}
          onOpenChange={setExternalUploadOpen}
          professionalId={professionalId}
          clinicId={clinicId}
          patientName={patient.name}
          patientEmail={patient.email}
          demoMode={isDemo}
          onInterpreted={({ interpretation, sourceFile, sourceFiles }) => {
            // Constrói uma "linha de avaliação" no mesmo shape que o editAssessment
            // espera, mas sem id — o save flow insere uma linha nova.
            const row = {
              patient_name: patient.name,
              patient_email: patient.email,
              pain_score: interpretation.painScore ?? 5,
              pain_regions: interpretation.painRegions || [],
              red_flags: interpretation.redFlags?.length ? { detected: interpretation.redFlags } : null,
              test_results: (interpretation.questionnaireResults || []).map((q: any) => ({
                questionnaireId: `external_${(q.name || "q").toLowerCase().replace(/\s+/g, "_")}`,
                questionnaireName: q.name,
                totalScore: typeof q.score === "number" ? q.score : undefined,
                interpretation_pt: q.interpretation,
                interpretation_en: q.interpretation,
                external: true,
              })),
              diagnosis: interpretation.diagnosis
                ? {
                    ...interpretation.diagnosis,
                    clinicalImpression: interpretation.clinicalImpression || undefined,
                    manual: true,
                  }
                : null,
              treatment_plan: null,
              anamnesis_data: {
                manualEntry: true,
                source: "external_upload",
                externalSourceFileId: sourceFile?.id || null,
                externalSourceFileIds: (sourceFiles || []).map((f) => f.id),
                aiInterpretedFields: interpretation.aiInterpretedFields || [],
                additionalExternalInfo: interpretation.additionalExternalInfo || "",
                chiefComplaint: interpretation.chiefComplaint,
                additionalComplaint: interpretation.additionalComplaint,
                history: interpretation.history,
                duration: interpretation.duration,
                onset: interpretation.onset,
                aggravatingFactors: interpretation.aggravatingFactors,
                relievingFactors: interpretation.relievingFactors,
                medications: interpretation.medications,
                previousSurgeries: interpretation.previousSurgeries,
                comorbidities: interpretation.comorbidities,
                occupation: interpretation.occupation,
                complementaryExams: interpretation.complementaryExams,
                painType: interpretation.painType,
                painScoresPerRegion: interpretation.painScoresPerRegion,
                painRegionRefinements: interpretation.painRegionRefinements,
                additionalClinicalNotes: interpretation.additionalClinicalNotes,
                romTable: interpretation.romTable,
                strengthTable: interpretation.strengthTable,
                functionalTests: interpretation.functionalTests,
              },
            };
            setExternalPrefill({
              markerId: `ext_${Date.now()}`,
              row,
              externalSourceFileId: sourceFile?.id || null,
            });
            setExternalUploadOpen(false);
            setManualAssessmentOpen(true);
          }}
        />
      )}

      {registrationModalOpen && registrationPatient && (professionalId || clinicId) && (
        <AddPatientModal
          open={registrationModalOpen}
          onOpenChange={setRegistrationModalOpen}
          professionalId={professionalId || ""}
          clinicId={clinicId || null}
          editPatient={registrationPatient}
          readOnly
          canEdit={canEditRegistration}
          onAdded={handleRegistrationSaved}
        />
      )}

      {(() => {
        const target = latestWithDiagnosis || latestAssessment;
        if (!target) return null;
        const hasHypothesis = !!target.diagnosis?.hypothesis;
        return (
          <>
            {hasHypothesis ? (
              <DiagnosticHypothesisBlock assessment={target} isDemo={isDemo} />
            ) : (
              <GenerateHypothesisCard
                assessment={target}
                isDemo={isDemo}
                onGenerated={(dx) => {
                  target.diagnosis = dx;
                  setNotes?.((prev: any) => ({ ...prev }));
                }}
              />
            )}
            <ClinicalImpressionCard
              assessment={target}
              existingImpression={target.diagnosis?.clinicalImpression}
              allAssessments={patient?.assessments}
              isDemo={isDemo}
            />
          </>
        );
      })()}

      <div ref={treatmentSectionRef} id="treatment-unlock-section" className={`scroll-mt-24 transition-shadow rounded-xl ${treatmentHighlight ? "ring-2 ring-primary ring-offset-2 ring-offset-background animate-pulse" : ""}`}>
        {latestWithDiagnosis && (() => {
          const a = latestWithDiagnosis;
          const hasTreatment = a.treatment_plan;
          const isPaidPending = !a.treatment_plan && (a.payment_status === "treatment_paid" || a.payment_status === "treatment_generating");
          const needsUnlock = a.diagnosis && !a.treatment_plan && !isPaidPending;
          if (hasTreatment) return <Card className="border-emerald-200 bg-emerald-500/5"><CardContent className="py-4 px-5"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><FileCheck className="h-5 w-5 text-emerald-600" /><div><p className="text-sm font-semibold text-emerald-700">{t("pro.treatment_unlocked")}</p><p className="text-xs text-muted-foreground">Plano de tratamento disponível para este paciente.</p></div></div><Button variant="outline" size="sm" className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => navigate(buildAssessmentViewUrl(a.id, props.selectedEmail))}>{t("pro.view_treatment")}<ChevronRight className="h-3 w-3" /></Button></div></CardContent></Card>;
          if (isPaidPending) return <TreatmentPaidRetry assessmentId={a.id} onGenerated={(treatmentPlan) => { a.treatment_plan = treatmentPlan; setNotes((prev: any) => ({ ...prev })); }} />;
          if (needsUnlock) return <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"><CardContent className="py-5 px-5 space-y-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0"><Sparkles className="h-5 w-5 text-primary" /></div><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-foreground">Plano de Tratamento Personalizado</p><p className="text-xs text-muted-foreground">Programa completo em 3 fases com exercícios progressivos, metas semanais e critérios de alta.</p></div></div><TreatmentUnlockCTA assessmentId={a.id} lifetimeTreatment={lifetimeTreatment} clinicMode={!!clinicId} onUnlocked={(treatmentPlan) => { a.treatment_plan = treatmentPlan; a.payment_status = "treatment_paid"; setNotes((prev: any) => ({ ...prev })); }} /></CardContent></Card>;
          return null;
        })()}

        {(() => {
          const allPending = getPendingTreatmentAssessments(patient.assessments);
          const rawOthers = latestWithDiagnosis ? allPending.filter((a: any) => a.id !== latestWithDiagnosis.id) : allPending;
          // Only suggest treatment unlock for the MOST RECENT pending assessment per body region.
          // If the latest (already shown above) covers a region, hide any older pending assessment
          // that shares any of those regions — the current clinical picture supersedes them.
          const normRegions = (a: any): string[] => Array.isArray(a.pain_regions) ? [...a.pain_regions].map((r: any) => String(r).toLowerCase().trim()).filter(Boolean).sort() : [];
          const latestRegions = new Set(latestWithDiagnosis ? normRegions(latestWithDiagnosis) : []);
          const sortedDesc = [...rawOthers].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const seenRegionKeys = new Set<string>();
          const others: any[] = [];
          for (const a of sortedDesc) {
            const regions = normRegions(a);
            // Skip if any region overlaps with the latest assessment's regions
            if (latestRegions.size > 0 && regions.some((r) => latestRegions.has(r))) continue;
            // Group key: sorted joined regions (or "__no_region__" if empty)
            const key = regions.length > 0 ? regions.join("|") : "__no_region__";
            if (seenRegionKeys.has(key)) continue;
            seenRegionKeys.add(key);
            others.push(a);
          }
          if (others.length === 0) return null;
          const isClinic = !!clinicId;
          const headerColor = isClinic ? "text-primary" : "text-amber-700";
          const cardBorder = isClinic ? "border-primary/20 bg-primary/5" : "border-amber-200 bg-amber-500/5";
          const itemBorder = isClinic ? "border-primary/20" : "border-amber-200/70";
          const headerLabel = isClinic
            ? (language === "pt" ? "Outras avaliações sem plano gerado" : language === "es" ? "Otras evaluaciones sin plan generado" : "Other assessments without a generated plan")
            : (language === "pt" ? "Outras avaliações sem plano de tratamento" : language === "es" ? "Otras evaluaciones sin plan de tratamiento" : "Other assessments without treatment plan");
          return <Card className={`mt-3 ${cardBorder}`}><CardHeader className="pb-2"><CardTitle className={`text-sm flex items-center gap-2 ${headerColor}`}>{isClinic ? <Sparkles className="h-4 w-4" /> : <Lock className="h-4 w-4" />}{headerLabel}</CardTitle></CardHeader><CardContent className="space-y-3 pt-0">{others.map((a: any) => { const dateStr = new Date(a.created_at).toLocaleDateString(language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US", { day: "2-digit", month: "short", year: "numeric" }); const hypothesis = a.final_hypothesis || a.diagnosis?.hypothesis || a.diagnosis?.title || "—"; const region = Array.isArray(a.pain_regions) && a.pain_regions.length > 0 ? a.pain_regions.join(", ") : null; return <div key={a.id} className={`rounded-xl border ${itemBorder} bg-background p-3 space-y-2`}><div className="flex items-start justify-between gap-2 flex-wrap"><div className="flex-1 min-w-0"><p className="text-xs font-semibold text-foreground">{dateStr}</p><p className="text-xs text-muted-foreground line-clamp-2">{hypothesis}</p>{region && <p className="text-[10px] text-muted-foreground mt-0.5">{language === "pt" ? "Região: " : language === "es" ? "Región: " : "Region: "}{region}</p>}</div>{a.pain_score != null && <Badge variant="outline" className="text-[10px] shrink-0">{language === "pt" ? "Dor " : language === "es" ? "Dolor " : "Pain "}{a.pain_score}/10</Badge>}</div><TreatmentUnlockCTA assessmentId={a.id} lifetimeTreatment={lifetimeTreatment} clinicMode={isClinic} onUnlocked={(treatmentPlan) => { a.treatment_plan = treatmentPlan; a.payment_status = "treatment_paid"; setNotes((prev: any) => ({ ...prev })); }} /></div>; })}</CardContent></Card>;
        })()}
      </div>

      {/* Anamnese resumida da última avaliação — colapsável (Extra C: atalho ver completa) */}
      {latestAnamnesisFields.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <CollapsibleSection
              storageKey={`patient:${patient.groupKey || patient.email}:anamnese`}
              defaultOpen
              header={
                <div className="flex items-start justify-between gap-2 pr-2">
                  <div>
                    <div className="text-base font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" />Anamnese — Última Avaliação</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{new Date(latestAssessment.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</div>
                  </div>
                  {latestWithDiagnosis && (
                    <Button variant="ghost" size="sm" className="gap-1.5 -mt-1 -mr-2 text-xs shrink-0" onClick={(e) => { e.stopPropagation(); navigate(buildAssessmentViewUrl(latestWithDiagnosis.id, patient.email)); }}>
                      <FileText className="h-3.5 w-3.5" />
                      {language === "pt" ? "Ver completa" : language === "es" ? "Ver completa" : "View full"}
                    </Button>
                  )}
                </div>
              }
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs pt-2">{latestAnamnesisFields.map((f: any, i: number) => <div key={i} className="space-y-0.5"><span className="text-muted-foreground font-medium">{f.label}</span><p className="text-foreground">{f.value}</p></div>)}</div>
            </CollapsibleSection>
          </CardContent>
        </Card>
      )}

      <Separator className="opacity-40" />

      {/* Linha do tempo das avaliações (visão longitudinal sobe acima dos gráficos detalhados) */}
      <AssessmentTimeline assessments={patient.assessments} onSelect={(id) => navigate(buildAssessmentViewUrl(id, props.selectedEmail))} />

      {/* Gráfico de evolução de dor */}
      {painData.length > 1 ? <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />{t("pro.pain_evolution")}</CardTitle></CardHeader><CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={painData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" /><YAxis domain={[0, 10]} tick={{ fontSize: 11 }} className="fill-muted-foreground" /><Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} /><Area type="monotone" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} dot={{ r: 4 }} name="Dor" /></AreaChart></ResponsiveContainer></div></CardContent></Card> : painData.length === 1 ? <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />{t("pro.pain_evolution")}</CardTitle></CardHeader><CardContent><div className="h-32"><ResponsiveContainer width="100%" height="100%"><BarChart data={painData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" /><YAxis domain={[0, 10]} tick={{ fontSize: 11 }} className="fill-muted-foreground" /><Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} /><Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Dor" /></BarChart></ResponsiveContainer></div></CardContent></Card> : null}

      {/* Mapa de Dor comparativo (agrupa logo após a linha do tempo) */}
      {patient.assessments.some((a: any) => a.pain_regions?.length > 0) && <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" />Mapa de Dor — Comparativo</CardTitle></CardHeader><CardContent><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{patient.assessments.filter((a: any) => a.pain_regions?.length > 0).map((a: any) => <div key={a.id} className="text-center space-y-2"><p className="text-xs font-medium text-muted-foreground">{new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}{a.pain_score != null && <span className="ml-1.5 text-foreground font-semibold">• Dor: {a.pain_score}/10</span>}</p><PainMapView painRegions={a.pain_regions} compact /></div>)}</div></CardContent></Card>}

      {/* Comparação detalhada por região */}
      <RegionPainComparison assessments={patient.assessments} />

      {/* Evolução de questionários funcionais */}
      {questionnaireEvolution.length > 0 ? questionnaireEvolution.map((chart: any) => <Card key={chart.displayTitle}><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" />{t("pro.questionnaire_evolution")} — {chart.displayTitle}</CardTitle><CardDescription className="text-xs">Pontuação total + 3 maiores limitações funcionais (%)</CardDescription></CardHeader><CardContent>{chart.data.length > 1 ? <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart.data}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" /><YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit="%" domain={[0, 100]} /><Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={(value: any, name: string) => [`${value}%`, name]} /><Legend /><Line type="monotone" dataKey={chart.totalKey} stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} connectNulls />{chart.subscaleKeys.map((sub: any, i: number) => <Line key={sub.key} type="monotone" dataKey={sub.key} stroke={SUBSCALE_COLORS[i % SUBSCALE_COLORS.length]} strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 3 }} connectNulls />)}</LineChart></ResponsiveContainer></div> : <div className="h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={chart.data}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" /><YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit="%" domain={[0, 100]} /><Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={(value: any, name: string) => [`${value}%`, name]} /><Legend /><Bar dataKey={chart.totalKey} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />{chart.subscaleKeys.map((sub: any, i: number) => <Bar key={sub.key} dataKey={sub.key} fill={SUBSCALE_COLORS[i % SUBSCALE_COLORS.length]} radius={[4, 4, 0, 0]} />)}</BarChart></ResponsiveContainer></div>}</CardContent></Card>) : <Card className="border-dashed"><CardContent className="py-6 text-center"><ClipboardList className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" /><p className="text-sm text-muted-foreground">Nenhum questionário funcional foi aplicado nessas avaliações.</p><p className="text-xs text-muted-foreground/60 mt-1">Questionários são aplicados automaticamente quando o paciente preenche o mapa de dor.</p></CardContent></Card>}

      {/* Voice notes (insumos brutos sobem antes das notas escritas) */}
      {!isDemo && patient?.assessments?.length > 0 && (
        <VoiceNoteCard assessmentIds={patient.assessments.map((a: any) => a.id)} />
      )}

      {/* Notas de sessão */}
      {selectedEmail && <SessionNotesSection professionalId={professionalId} patientEmail={selectedEmail} isDemo={isDemo} />}

      {/* Dinamometria — sempre disponível no prontuário (upload PDF/foto ou registro manual) */}
      <PatientStrengthSection patient={patient} readOnly={readOnly} isDemo={isDemo} />


      {/* Arquivos e fotos (bloco documental) */}
      {selectedEmail && <PatientFilesSection patientEmail={selectedEmail} patientName={patient?.name} clinicId={clinicId} professionalId={professionalId} readOnly={readOnly} isDemo={isDemo} />}
      {selectedEmail && !isDemo && <PatientPhotosSection patientEmail={selectedEmail} patientName={patient?.name} clinicId={clinicId} professionalId={professionalId} readOnly={readOnly} />}

      {/* Programas de exercícios enviados (ferramenta — desce após o bloco clínico) */}
      {(() => {
        const patientHeps = hepHistory.filter((h: any) => (h.patient_name || "").toLowerCase().trim() === (patient.name || "").toLowerCase().trim());
        if (patientHeps.length === 0) return null;
        const origin = window.location.origin;
        return <Card><CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Dumbbell className="h-4 w-4 text-primary" /> Programas de Exercícios Enviados</CardTitle><CardDescription className="text-xs">{patientHeps.length} programa(s) criado(s)</CardDescription></CardHeader><CardContent className="space-y-2">{patientHeps.map((hep: any) => { const link = `${origin}/hep/${hep.token}`; const isExpired = new Date(hep.expires_at) < new Date(); return <div key={hep.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border bg-muted/30"><div className="min-w-0 flex-1"><p className="text-xs font-medium text-foreground truncate">{new Date(hep.created_at).toLocaleDateString("pt-BR")}{hep.notes && <span className="text-muted-foreground ml-2">— {hep.notes}</span>}</p><p className="text-[10px] text-muted-foreground truncate">{link}</p></div><div className="flex items-center gap-1 shrink-0">{isExpired && <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">Expirado</Badge>}<Button variant="ghost" size="icon" className="h-7 w-7" title="Editar programa" onClick={() => handleEditHep(hep.id)}><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7" title="Copiar link" onClick={() => { navigator.clipboard.writeText(link); toast({ title: "Link copiado!" }); }}><Copy className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7" title="Abrir link" onClick={() => window.open(link, "_blank")}><ExternalLink className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7" title="Enviar via WhatsApp" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Seu programa de exercícios: ${link}`)}`, "_blank")}><Share2 className="h-3.5 w-3.5" /></Button>{!readOnly && patient.email && <Button variant="ghost" size="icon" className="h-7 w-7" title={language === "pt" ? "Enviar via chat interno" : "Send via internal chat"} onClick={() => handleSendHepViaChat(link, patient.email)}><MessageCircle className="h-3.5 w-3.5" /></Button>}<Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Excluir programa" disabled={deletingHepId === hep.id} onClick={() => { if (confirm("Tem certeza que deseja excluir este programa de exercícios?")) handleDeleteHep(hep.id); }}>{deletingHepId === hep.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</Button></div></div>; })}</CardContent></Card>;
      })()}

      {/* Histórico detalhado — notas privadas por avaliação (Extra A: título renomeado) — colapsável (fechado por padrão para reduzir muro de texto) */}
      <Separator className="opacity-40" />
      <div data-refresh-tick={assessmentRefreshTick}>
        <CollapsibleSection
          storageKey={`patient:${patient.groupKey || patient.email}:historico`}
          defaultOpen={false}
          header={
            <div className="flex items-center justify-between gap-2 pr-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><NotebookPen className="h-4 w-4 text-primary" />{language === "pt" ? "Histórico detalhado — notas privadas por avaliação" : language === "es" ? "Historial detallado — notas privadas por evaluación" : "Detailed history — private notes per assessment"}<Badge variant="outline" className="text-[10px] font-normal">{patient.assessments.filter((a: any) => showArchivedAssessments ? true : !a.archived_at).length}</Badge></h4>
              {patient.assessments.some((a: any) => a.archived_at) && <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground" onClick={(e) => { e.stopPropagation(); setShowArchivedAssessments((v: boolean) => !v); }}>{showArchivedAssessments ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}{showArchivedAssessments ? (language === "pt" ? "Ocultar arquivadas" : "Hide archived") : (language === "pt" ? `Mostrar arquivadas (${patient.assessments.filter((a: any) => a.archived_at).length})` : `Show archived (${patient.assessments.filter((a: any) => a.archived_at).length})`)}</Button>}
            </div>
          }
        >
          <div className="space-y-3 pt-2">{patient.assessments.filter((a: any) => showArchivedAssessments ? true : !a.archived_at).map((a: any) => { const qResults = getQuestionnaireResults(a); const isInProgress = a.status === "in_progress"; const isArchived = !!a.archived_at; const isIncomplete = !a.diagnosis && !isInProgress && !isArchived; const resumeCtx = clinicId ? { clinicId } : professionalId ? { professionalId } : null; const resumeLink = (isInProgress || isIncomplete) && resumeCtx ? buildResumeAssessmentLink(resumeCtx, a.id) : null; return <Card key={a.id} className={`overflow-hidden ${isInProgress ? "border-blue-300/60 bg-blue-50/30" : ""} ${isArchived ? "opacity-60 border-dashed" : ""}`}><CardContent className="py-3 px-4 space-y-3"><div className="flex items-center justify-between gap-2"><div className={`space-y-0.5 min-w-0 rounded-md -mx-1 px-1 py-0.5 transition-colors ${!!a.diagnosis && !isArchived ? "cursor-pointer hover:bg-muted/40 active:bg-muted/60" : ""}`} role={!!a.diagnosis && !isArchived ? "button" : undefined} tabIndex={!!a.diagnosis && !isArchived ? 0 : undefined} onClick={!!a.diagnosis && !isArchived ? () => navigate(buildAssessmentViewUrl(a.id, selectedEmail)) : undefined} onKeyDown={!!a.diagnosis && !isArchived ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(buildAssessmentViewUrl(a.id, selectedEmail)); } } : undefined} title={!!a.diagnosis && !isArchived ? t("pro.view_full_assessment") : undefined}><div className="flex items-center gap-2 flex-wrap"><p className="text-sm font-semibold text-foreground">{new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</p>{isInProgress && <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-blue-300 text-blue-700 bg-blue-50"><Loader2 className="h-3 w-3 mr-1 animate-spin" />{language === "pt" ? "Em andamento" : "In progress"}</Badge>}{isIncomplete && <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-amber-300 text-amber-700 bg-amber-50">{language === "pt" ? "Incompleta — sem diagnóstico" : language === "es" ? "Incompleta — sin diagnóstico" : "Incomplete — no diagnosis"}</Badge>}{isArchived && <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-muted-foreground/30 text-muted-foreground bg-muted/30"><Archive className="h-3 w-3 mr-1" />{language === "pt" ? "Arquivada" : "Archived"}</Badge>}</div><div className="flex items-center gap-2 text-xs text-muted-foreground">{a.pain_score != null && <span>Dor: {a.pain_score}/10</span>}{a.diagnosis?.hypothesis && <span className="line-clamp-1">• {a.diagnosis.hypothesis}</span>}</div></div><div className="flex items-center gap-1 shrink-0">{(isInProgress || isIncomplete) && resumeLink && !readOnly && !isArchived && <Button variant="default" size="sm" className="h-8 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white" title={language === "pt" ? (isIncomplete ? "Retomar e concluir esta avaliação incompleta" : "Continuar avaliação de onde parou") : "Continue assessment from where it stopped"} onClick={() => setResumeAssessment(a)}><RotateCcw className="h-3.5 w-3.5" />{language === "pt" ? (isIncomplete ? "Retomar" : "Continuar") : "Continue"}</Button>}{a.diagnosis && onShareWhatsApp && !isArchived && <Button variant="ghost" size="icon" className="h-8 w-8" title="WhatsApp" onClick={() => onShareWhatsApp(a)}><Share2 className="h-4 w-4 text-emerald-600" /></Button>}{a.diagnosis && onDownloadPdf && !isArchived && <Button variant="ghost" size="icon" className="h-8 w-8" title="PDF" onClick={() => onDownloadPdf(a)}><FileText className="h-4 w-4 text-primary" /></Button>}{a.diagnosis && !isArchived && <Button variant="ghost" size="icon" className="h-8 w-8" title={t("pro.view_full_assessment")} onClick={() => navigate(buildAssessmentViewUrl(a.id, selectedEmail))}><ChevronRight className="h-4 w-4 text-muted-foreground" /></Button>}{!readOnly && (isArchived ? <Button variant="ghost" size="icon" className="h-8 w-8" title={language === "pt" ? "Restaurar avaliação" : "Restore assessment"} disabled={archivingAssessmentId === a.id} onClick={(e) => handleRestoreAssessment(a.id, e)}>{archivingAssessmentId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4 text-emerald-600" />}</Button> : <Button variant="ghost" size="icon" className="h-8 w-8" title={language === "pt" ? "Arquivar avaliação" : "Archive assessment"} disabled={archivingAssessmentId === a.id} onClick={(e) => handleArchiveAssessment(a.id, e)}>{archivingAssessmentId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4 text-muted-foreground" />}</Button>)}{!readOnly && <Button variant="ghost" size="icon" className="h-8 w-8" title={language === "pt" ? "Excluir avaliação" : "Delete assessment"} onClick={(e) => { e.stopPropagation(); setDeleteAssessmentTarget({ id: a.id, date: new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) }); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div></div>{qResults.length > 0 && <div className="space-y-2 border-t border-border pt-3"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"><ClipboardList className="h-3 w-3" /> Questionários</p>{qResults.map((r: any, idx: number) => <QuestionnaireResultCard key={idx} result={r} language={language} compact />)}</div>}<div className="border-t border-border pt-3"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1.5"><NotebookPen className="h-3 w-3" />{t("pro.private_notes")}{noteSaving[a.id] && <Loader2 className="h-3 w-3 animate-spin text-primary" />}{notes[a.id] && !noteSaving[a.id] && <Badge variant="outline" className="text-[9px] py-0 px-1.5">{t("pro.notes_saved")}</Badge>}</p><Textarea placeholder={t("pro.private_notes_placeholder")} value={notes[a.id] || ""} onChange={(e) => saveNote(a.id, e.target.value)} className="text-xs min-h-[60px] resize-y" /><label className="flex items-center gap-2 mt-2 cursor-pointer group"><Checkbox checked={!!noteIncludeInPdf[a.id]} onCheckedChange={(checked) => toggleNoteInPdf(a.id, !!checked)} /><span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">{t("pro.include_notes_in_pdf")}</span>{noteIncludeInPdf[a.id] && <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-amber-300 text-amber-600 bg-amber-50">{t("pro.notes_will_appear_in_pdf")}</Badge>}</label></div></CardContent></Card>; })}</div>
        </CollapsibleSection>
      </div>


      <AlertDialog open={!!deleteConfirmPatient} onOpenChange={(open) => { if (!open) setDeleteConfirmPatient(null); }}><AlertDialogContent onClick={(e) => e.stopPropagation()}><AlertDialogHeader><AlertDialogTitle>Confirmar exclusão permanente</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir <span className="font-semibold">{deleteConfirmPatient?.name}</span> e todas as suas {deleteConfirmPatient?.assessmentIds.length} avaliação(ões)?<br /><br /><span className="text-destructive font-medium">Esta ação é irreversível. Todos os dados de avaliações, planos de tratamento, exercícios e notas serão permanentemente apagados.</span></AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={!!deletingPatient} onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5" disabled={!!deletingPatient} onClick={(e) => { e.stopPropagation(); if (deleteConfirmPatient) handleDeletePatient(deleteConfirmPatient.groupKey, deleteConfirmPatient.assessmentIds); }}>{deletingPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Excluir permanentemente</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!deleteAssessmentTarget} onOpenChange={(open) => !open && setDeleteAssessmentTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{language === "pt" ? "Excluir avaliação?" : "Delete assessment?"}</AlertDialogTitle><AlertDialogDescription>{language === "pt" ? `A avaliação de ${deleteAssessmentTarget?.date} será removida permanentemente, junto com notas e programas de exercícios vinculados. Esta ação não pode ser desfeita.` : `The assessment from ${deleteAssessmentTarget?.date} will be permanently removed, along with linked notes and exercise programs. This cannot be undone.`}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{language === "pt" ? "Cancelar" : "Cancel"}</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2" disabled={!!deletingAssessmentId} onClick={(e) => { e.preventDefault(); if (deleteAssessmentTarget) handleDeleteAssessment(deleteAssessmentTarget.id); }}>{deletingAssessmentId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{language === "pt" ? "Excluir permanentemente" : "Delete permanently"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Dialog open={!!treatmentPicker} onOpenChange={(open) => { if (!open) setTreatmentPicker(null); }}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{language === "pt" ? "Selecione a avaliação a desbloquear" : language === "es" ? "Seleccione la evaluación a desbloquear" : "Select the assessment to unlock"}</DialogTitle><DialogDescription>{language === "pt" ? `${treatmentPicker?.patientName ?? ""} possui mais de uma avaliação sem plano de tratamento. Escolha de qual avaliação deseja adquirir o plano.` : language === "es" ? `${treatmentPicker?.patientName ?? ""} tiene más de una evaluación sin plan de tratamiento. Elija de cuál desea adquirir el plan.` : `${treatmentPicker?.patientName ?? ""} has more than one assessment without a treatment plan. Choose which one to unlock.`}</DialogDescription></DialogHeader><div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">{treatmentPicker?.assessments.map((a: any) => { const dateStr = new Date(a.created_at).toLocaleDateString(language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US", { day: "2-digit", month: "short", year: "numeric" }); const hypothesis = a.final_hypothesis || a.diagnosis?.hypothesis || a.diagnosis?.title || "—"; const region = Array.isArray(a.pain_regions) && a.pain_regions.length > 0 ? a.pain_regions.join(", ") : null; return <div key={a.id} className="rounded-xl border border-border bg-card p-3 space-y-2"><div className="flex items-start justify-between gap-2"><div className="space-y-1 min-w-0"><p className="text-xs font-semibold text-foreground">{dateStr}</p><p className="text-xs text-muted-foreground line-clamp-2">{hypothesis}</p>{region && <p className="text-[10px] text-muted-foreground mt-0.5">{language === "pt" ? "Região: " : language === "es" ? "Región: " : "Region: "}{region}</p>}</div>{a.pain_score != null && <Badge variant="outline" className="text-[10px] shrink-0">{language === "pt" ? "Dor " : language === "es" ? "Dolor " : "Pain "}{a.pain_score}/10</Badge>}</div><TreatmentUnlockCTA assessmentId={a.id} lifetimeTreatment={lifetimeTreatment} clinicMode={!!clinicId} onUnlocked={(treatmentPlan) => { a.treatment_plan = treatmentPlan; a.payment_status = "treatment_paid"; setNotes((prev: any) => ({ ...prev })); setTreatmentPicker(null); }} /></div>; })}</div><DialogFooter><Button variant="ghost" onClick={() => setTreatmentPicker(null)}>{language === "pt" ? "Fechar" : language === "es" ? "Cerrar" : "Close"}</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}