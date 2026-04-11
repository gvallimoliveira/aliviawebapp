import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Stethoscope, Eye, Loader2, Copy, Check, Link2,
} from "lucide-react";
import DashboardErrorBoundary from "./DashboardErrorBoundary";
import PatientEvolutionDashboard from "./PatientEvolutionDashboard";
import ProAnalyticsCharts from "./ProAnalyticsCharts";
import { generateAssessmentPdf } from "@/utils/generatePdf";
import { useToast } from "@/hooks/use-toast";
import { getPublicOrigin } from "@/lib/getPublicOrigin";

/**
 * Read-only combined view of all clinic therapists' patients/assessments
 * for the secretary role.
 */
const ClinicSecretaryDashboard = () => {
  const { activeClinic } = useClinic();
  const { language } = useLanguage();
  const { toast } = useToast();
  const lang = language as "pt" | "en" | "es";

  const [therapists, setTherapists] = useState<any[]>([]);
  const [allAssessments, setAllAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTherapistId, setSelectedTherapistId] = useState<string>("all");
  const [ownerProfessionalId, setOwnerProfessionalId] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!activeClinic) return;
    loadData();
  }, [activeClinic?.clinic_id]);

  const loadData = async () => {
    if (!activeClinic) return;
    setLoading(true);

    // Get all clinic members who are therapists or owners
    const { data: members } = await supabase
      .from("clinic_members")
      .select("user_id, role")
      .eq("clinic_id", activeClinic.clinic_id)
      .eq("status", "active")
      .in("role", ["owner", "therapist"]);

    if (!members || members.length === 0) {
      setLoading(false);
      return;
    }

    // Get professional profiles for these users
    const userIds = members.map((m) => m.user_id);
    const { data: pros } = await supabase
      .from("professionals")
      .select("id, user_id, full_name, specialties, profile_photo_url")
      .in("user_id", userIds);

    setTherapists(pros || []);

    // Find owner's professional ID for assessment link
    const ownerMember = members.find((m) => m.role === "owner");
    if (ownerMember) {
      const { data: ownerPro } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", ownerMember.user_id)
        .maybeSingle();
      setOwnerProfessionalId(ownerPro?.id || null);
    }

    // Get all assessments linked to the clinic
    const { data: assessData } = await supabase
      .from("assessments")
      .select("*")
      .eq("clinic_id", activeClinic.clinic_id)
      .order("created_at", { ascending: false });

    setAllAssessments(assessData || []);
    setLoading(false);
  };

  const copyAssessmentLink = () => {
    if (!ownerProfessionalId) return;
    const link = `${getPublicOrigin()}/assessment/professional/${ownerProfessionalId}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    toast({ title: lang === "pt" ? "Link copiado!" : "Link copied!" });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleDownloadPdf = async (assessment: any) => {
    if (!assessment.diagnosis) return;
    try {
      const pdfLang = document.documentElement.lang === "en" ? "en" : "pt";
      await generateAssessmentPdf({
        diagnosis: assessment.diagnosis,
        treatmentPlan: assessment.treatment_plan,
        language: pdfLang as "pt" | "en",
        userName: assessment.patient_name || "Paciente",
        anamnesisData: assessment.anamnesis_data,
        painRegions: assessment.pain_regions,
        testResults: assessment.test_results,
        clinicLogoUrl: activeClinic?.logo_url || undefined,
        clinicName: activeClinic?.clinic_name || undefined,
      });
      toast({ title: pdfLang === "pt" ? "PDF gerado!" : "PDF generated!" });
    } catch {
      toast({ title: "Erro ao gerar PDF", variant: "destructive" });
    }
  };

  const filteredAssessments = selectedTherapistId === "all"
    ? allAssessments
    : allAssessments.filter((a) => a.professional_id === selectedTherapistId);

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
      {/* Read-only notice */}
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

      {/* Pre-assessment link */}
      {ownerProfessionalId && (
        <Card>
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">
                {lang === "pt" ? "Link de pré-avaliação" : "Pre-assessment link"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              {lang === "pt"
                ? "Envie este link para pacientes. As avaliações serão integradas ao perfil da clínica e do profissional principal."
                : "Send this link to patients. Assessments will be linked to the clinic and main professional profile."}
            </p>
            <div className="flex gap-2">
              <code className="flex-1 text-xs bg-muted/60 px-3 py-2.5 rounded-lg text-muted-foreground truncate">
                {getPublicOrigin()}/assessment/professional/{ownerProfessionalId}
              </code>
              <Button onClick={copyAssessmentLink} variant="outline" size="sm" className="gap-1.5 shrink-0">
                {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {linkCopied ? (lang === "pt" ? "Copiado" : "Copied") : (lang === "pt" ? "Copiar" : "Copy")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {therapists.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={selectedTherapistId === "all" ? "default" : "outline"}
            className="cursor-pointer px-3 py-1.5 text-xs"
            onClick={() => setSelectedTherapistId("all")}
          >
            <Users className="h-3 w-3 mr-1" />
            {lang === "pt" ? "Todos" : "All"} ({allAssessments.length})
          </Badge>
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
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-foreground">{therapists.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {lang === "pt" ? "Profissionais" : "Therapists"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-foreground">{filteredAssessments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {lang === "pt" ? "Avaliações" : "Assessments"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-primary">
              {new Set(filteredAssessments.map((a) => a.patient_email).filter(Boolean)).size}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {lang === "pt" ? "Pacientes" : "Patients"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics */}
      <ProAnalyticsCharts assessments={filteredAssessments} />

      {/* Patient list — read-only (no edit actions) */}
      {therapists.length > 0 && (
        <DashboardErrorBoundary>
          <PatientEvolutionDashboard
            assessments={filteredAssessments}
            professionalId={selectedTherapistId === "all" ? therapists[0]?.id : selectedTherapistId}
            onDownloadPdf={handleDownloadPdf}
            isDemo={false}
            readOnly
            clinicLogoUrl={activeClinic?.logo_url || undefined}
            clinicName={activeClinic?.clinic_name || undefined}
          />
        </DashboardErrorBoundary>
      )}
    </div>
  );
};

export default ClinicSecretaryDashboard;
