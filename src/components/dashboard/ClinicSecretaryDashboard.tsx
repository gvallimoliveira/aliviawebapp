import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, Stethoscope, Eye, Loader2, Copy, Check, Link2, UserPlus, MessageCircle,
} from "lucide-react";
import ConversationList from "@/components/chat/ConversationList";

import DashboardErrorBoundary from "./DashboardErrorBoundary";
import CrefitoCompletionBanner from "./CrefitoCompletionBanner";
import PatientEvolutionDashboard from "./PatientEvolutionDashboard";
import { generateAssessmentPdf } from "@/utils/generatePdf";
import { useToast } from "@/hooks/use-toast";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { useAuth } from "@/contexts/AuthContext";
import { markGettingStartedLinkCopied } from "@/lib/gettingStarted";

interface ClinicSecretaryDashboardProps {
  /** When true, hide owner/secretary-only widgets (feedback, reports, analytics, donut). */
  restrictedTherapistView?: boolean;
}

const ClinicSecretaryDashboard = ({ restrictedTherapistView = false }: ClinicSecretaryDashboardProps = {}) => {
  const { user } = useAuth();
  const { activeClinic, canManageClinic, isClinicOwner, isClinicSecretary } = useClinic();
  // Hide privileged widgets either when explicitly restricted OR when the current
  // user is not an owner/secretary of the active clinic (defense in depth).
  const showPrivileged = !restrictedTherapistView && canManageClinic;
  // Owners/admins get full edit access on patient records; secretaries stay read-only
  // on clinical content but can still create/archive patients, send links, take quick
  // notes and start manual assessments.
  const patientDashReadOnly = !isClinicOwner;
  const { language } = useLanguage();
  const { toast } = useToast();
  const lang = language as "pt" | "en" | "es";

  const [therapists, setTherapists] = useState<any[]>([]);
  const [allAssessments, setAllAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>("all");
  const [linkCopied, setLinkCopied] = useState(false);
  // Assignment state
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<string>("");
  useEffect(() => {
    if (!activeClinic) return;
    loadData();
  }, [activeClinic?.clinic_id]);

  const loadData = async () => {
    if (!activeClinic) return;
    setLoading(true);

    const { data: members } = await supabase
      .from("clinic_members")
      .select("user_id, role")
      .eq("clinic_id", activeClinic.clinic_id)
      .eq("status", "active")
      .in("role", ["owner", "therapist", "osteopath", "pilates_instructor", "doctor", "rpg_specialist", "massage_therapist"]);

    if (!members || members.length === 0) {
      setLoading(false);
      return;
    }

    const userIds = members.map((m) => m.user_id);
    const { data: pros } = await supabase
      .from("professionals")
      .select("id, user_id, full_name, specialties, profile_photo_url, crefito")
      .in("user_id", userIds);

    setTherapists(pros || []);

    const { data: assessData } = await supabase
      .from("assessments")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("created_at", { ascending: false });

    setAllAssessments(assessData || []);
    setLoading(false);
  };

  const copyClinicLink = () => {
    if (!activeClinic) return;
    const link = `${getPublicOrigin()}/assessment/clinic/${activeClinic.clinic_id}`;
    void navigator.clipboard.writeText(link).then(() => {
      if (user?.id) markGettingStartedLinkCopied({ userId: user.id, clinicId: activeClinic.clinic_id });
      setLinkCopied(true);
      toast({ title: lang === "pt" ? "Link copiado!" : "Link copied!" });
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => toast({ title: lang === "pt" ? "Não foi possível copiar o link" : "Could not copy the link", variant: "destructive" }));
  };

  const handleAssignProfessional = async (assessmentId: string, professionalId: string) => {
    const { error } = await supabase
      .from("assessments")
      .update({ professional_id: professionalId })
      .eq("id", assessmentId);

    if (error) {
      toast({ title: lang === "pt" ? "Erro ao atribuir" : "Assignment error", variant: "destructive" });
      return;
    }
    toast({ title: lang === "pt" ? "Profissional atribuído!" : "Professional assigned!" });
    setAssigningId(null);
    setAssignTarget("");
    loadData();
  };

  const handleDownloadPdf = async (assessment: any) => {
    if (!assessment.diagnosis) return;
    try {
      const pdfLang = document.documentElement.lang === "en" ? "en" : "pt";
      const { resolveResponsibleProfessional } = await import("@/lib/getResponsibleProfessional");
      const { data: { user } } = await supabase.auth.getUser();
      // If the assessment has an assigned therapist, prefer them; else fall back to current user/owner
      const assignedPro = assessment.professional_id
        ? therapists.find((t) => t.id === assessment.professional_id)
        : null;
      const responsibleProfessional = await resolveResponsibleProfessional({
        userId: user?.id,
        ownProfessional: assignedPro
          ? { full_name: assignedPro.full_name, crefito: (assignedPro as any).crefito }
          : null,
        clinicId: activeClinic?.clinic_id,
      });
      // Clinic logo when the clinic has one; otherwise the assigned
      // professional's own logo, so no report ships unbranded.
      const { resolveAssessmentBranding } = await import("@/lib/resolveAssessmentBranding");
      const logos = await resolveAssessmentBranding({
        clinicId: activeClinic?.clinic_id || null,
        professionalId: assessment.professional_id || null,
      });
      await generateAssessmentPdf({
        diagnosis: assessment.diagnosis,
        treatmentPlan: assessment.treatment_plan,
        language: pdfLang as "pt" | "en",
        userName: assessment.patient_name || "Paciente",
        anamnesisData: assessment.anamnesis_data,
        painRegions: assessment.pain_regions,
        testResults: assessment.test_results,
        redFlags: (assessment.red_flags as any)?.detected,
          redFlagsDismissal: assessment.red_flags_dismissed_at ? { at: assessment.red_flags_dismissed_at, by: assessment.red_flags_dismissed_by_name, reason: assessment.red_flags_dismissed_reason } : null,
        clinicLogoUrl: logos.clinicLogoUrl || activeClinic?.logo_url || undefined,
        clinicName: logos.clinicName || activeClinic?.clinic_name || undefined,
        brandColor: logos.brandColor,
        professionalLogoUrl: logos.professionalLogoUrl,
        responsibleProfessional,

      });
      toast({ title: pdfLang === "pt" ? "PDF gerado!" : "PDF generated!" });
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
  };

  const filteredAssessments = selectedTherapistId === "all"
    ? allAssessments
    : selectedTherapistId === "unassigned"
    ? allAssessments.filter((a) => !a.professional_id)
    : allAssessments.filter((a) => a.professional_id === selectedTherapistId);

  const unassignedCount = allAssessments.filter((a) => !a.professional_id).length;

  const getTherapistName = (proId: string) =>
    therapists.find((t) => t.id === proId)?.full_name || "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {restrictedTherapistView && <CrefitoCompletionBanner />}
      {/* Read-only notice — only for secretaries/therapists, not owners */}
      {patientDashReadOnly && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-3 px-5 flex items-center gap-3">
            <Eye className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold">
                {lang === "pt" ? "Modo visualização." : "View mode."}
              </span>{" "}
              {lang === "pt"
                ? "Você pode visualizar os dados clínicos e gerar PDFs, mas não pode editar avaliações ou dados dos pacientes."
                : "You can view clinical data and generate PDFs, but cannot edit assessments or patient data."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Clinic assessment link */}
      <Card>
        <CardContent className="py-4 px-5">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">
              {lang === "pt" ? "Link de pré-avaliação da clínica" : "Clinic pre-assessment link"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {lang === "pt"
              ? "Envie este link para pacientes. As avaliações serão integradas ao perfil da clínica."
              : "Send this link to patients. Assessments will be linked to the clinic profile."}
          </p>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-muted/60 px-3 py-2.5 rounded-lg text-muted-foreground truncate">
              {getPublicOrigin()}/assessment/clinic/{activeClinic?.clinic_id}
            </code>
            <Button onClick={copyClinicLink} variant="outline" size="sm" className="gap-1.5 shrink-0">
              {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {linkCopied ? (lang === "pt" ? "Copiado" : "Copied") : (lang === "pt" ? "Copiar" : "Copy")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unassigned assessments alert */}
      {unassignedCount > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 px-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <UserPlus className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-amber-700">
                  {unassignedCount} {lang === "pt" ? "avaliação(ões) sem profissional atribuído" : "unassigned assessment(s)"}
                </span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTherapistId("unassigned")}
              className="shrink-0 text-xs"
            >
              {lang === "pt" ? "Ver" : "View"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filter by therapist */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant={selectedTherapistId === "all" ? "default" : "outline"}
          className="cursor-pointer px-3 py-1.5 text-xs"
          onClick={() => setSelectedTherapistId("all")}
        >
          <Users className="h-3 w-3 mr-1" />
          {lang === "pt" ? "Todos" : "All"} ({allAssessments.length})
        </Badge>
        {unassignedCount > 0 && (
          <Badge
            variant={selectedTherapistId === "unassigned" ? "default" : "outline"}
            className="cursor-pointer px-3 py-1.5 text-xs"
            onClick={() => setSelectedTherapistId("unassigned")}
          >
            <UserPlus className="h-3 w-3 mr-1" />
            {lang === "pt" ? "Sem profissional" : "Unassigned"} ({unassignedCount})
          </Badge>
        )}
        {therapists.map((t) => {
          const count = allAssessments.filter((a) => a.professional_id === t.id).length;
          return (
            <Badge
              key={t.id}
              variant={selectedTherapistId === t.id ? "default" : "outline"}
              className="cursor-pointer px-3 py-1.5 text-xs"
              onClick={() => setSelectedTherapistId(t.id)}
            >
              <Stethoscope className="h-3 w-3 mr-1" />
              {t.full_name} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Assignment UI for unassigned assessments */}
      {selectedTherapistId === "unassigned" && filteredAssessments.length > 0 && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <h3 className="text-sm font-semibold">
              {lang === "pt" ? "Atribuir profissional" : "Assign professional"}
            </h3>
            {filteredAssessments.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.patient_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{a.patient_email || "—"}</p>
                </div>
                {assigningId === a.id ? (
                  <div className="flex items-center gap-2">
                    <Select value={assignTarget} onValueChange={setAssignTarget}>
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <SelectValue placeholder={lang === "pt" ? "Selecionar..." : "Select..."} />
                      </SelectTrigger>
                      <SelectContent>
                        {therapists.filter((t) => !!t.id).map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">
                            {t.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      disabled={!assignTarget}
                      onClick={() => handleAssignProfessional(a.id, assignTarget)}
                      className="h-8 text-xs"
                    >
                      {lang === "pt" ? "Atribuir" : "Assign"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { setAssigningId(null); setAssignTarget(""); }}
                      className="h-8 text-xs"
                    >
                      ✕
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAssigningId(a.id)}
                    className="h-8 text-xs gap-1"
                  >
                    <UserPlus className="h-3 w-3" />
                    {lang === "pt" ? "Atribuir" : "Assign"}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Patient list — read-only with ability to add and archive patients */}
      {(filteredAssessments.length > 0 || therapists.length > 0 || activeClinic?.clinic_id) && (
        <DashboardErrorBoundary>
          <PatientEvolutionDashboard
            key={activeClinic?.clinic_id}
            assessments={filteredAssessments}
            professionalId={selectedTherapistId === "all" || selectedTherapistId === "unassigned" ? (therapists[0]?.id || "") : selectedTherapistId}
            onDownloadPdf={handleDownloadPdf}
            isDemo={false}
            readOnly={patientDashReadOnly}
            canAddPatient
            canArchivePatient
            allowManualAssessment
            allowAssessmentLink
            allowQuickNote
            clinicId={activeClinic?.clinic_id}
            clinicLogoUrl={activeClinic?.logo_url || undefined}
            clinicName={activeClinic?.clinic_name || undefined}
            onSelectionChange={(sel) => {
              if (sel) {
                const scrollToAnchor = () => {
                  const el = document.getElementById("patient-detail-anchor");
                  if (!el) return;
                  const y = el.getBoundingClientRect().top + window.scrollY - 80;
                  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
                };
                setTimeout(scrollToAnchor, 120);
                setTimeout(scrollToAnchor, 360);
              }
            }}
          />
        </DashboardErrorBoundary>
      )}

      {/* Patient → clinic-staff inbox moved to the "Mensagens" tab */}
    </div>

  );
};

export default ClinicSecretaryDashboard;
