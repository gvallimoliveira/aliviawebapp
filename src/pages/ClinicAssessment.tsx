import { useState, useEffect, useMemo } from "react";
import logoAlivia from "@/assets/logo-alivia.png";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Globe, Loader2, ChevronRight, Building2, AlertTriangle, User, CheckCircle2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import RedFlagScreening from "@/components/assessment/RedFlagScreening";
import RedFlagAlert from "@/components/assessment/RedFlagAlert";
import RedFlagContinueScreen from "@/components/assessment/RedFlagContinueScreen";
import AnamnesisForm, { type AnamnesisData } from "@/components/assessment/AnamnesisForm";
import QuestionnaireStep from "@/components/assessment/QuestionnaireStep";
import AssessmentStepper from "@/components/assessment/AssessmentStepper";
import ClinicalThinkingSkeleton from "@/components/assessment/ClinicalThinkingSkeleton";
import WelcomeStep from "@/components/assessment/WelcomeStep";
import ResumeSummary from "@/components/assessment/ResumeSummary";
import { type QuestionnaireResult } from "@/data/questionnaireData";
import {
  parseStepsParam,
  hasAnyAnamnesisSub,
  isStepEnabled,
  mergeAnamnesisWithOriginal,
  buildAnamnesisFromOriginal,
  ANAMNESIS_SUB_IDS,
} from "@/lib/reassessmentSteps";

type ClinicStep = "loading_check" | "inactive" | "welcome" | "patient_info" | "redflags" | "redflag_continue" | "redflag_alert" | "anamnesis" | "questionnaire" | "loading" | "diagnosis_error" | "thank_you" | "resume_summary";

const ClinicAssessment = () => {
  const { clinicId } = useParams<{ clinicId: string }>();
  const { t, language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const reassessmentId = searchParams.get("reassessment");
  const patientToken = searchParams.get("patient");
  const resumeId = searchParams.get("resume");
  const stepsParam = searchParams.get("steps");
  const enabledSteps = useMemo(() => parseStepsParam(stepsParam), [stepsParam]);
  const reassessAnamSubs = useMemo(
    () => (enabledSteps ? ANAMNESIS_SUB_IDS.filter((id) => enabledSteps.has(id)) : null),
    [enabledSteps],
  );
  const reassessHasAnamnesis = hasAnyAnamnesisSub(enabledSteps);
  const reassessHasQuestionnaire = isStepEnabled(enabledSteps, "questionnaire");
  const reassessHasRedflags = isStepEnabled(enabledSteps, "redflags");

  const [step, setStep] = useState<ClinicStep>("loading_check");
  const [clinic, setClinic] = useState<{ id: string; name: string; logo_url: string | null; brand_color: string | null } | null>(null);
  const [anamnesisData, setAnamnesisData] = useState<AnamnesisData | null>(null);
  const [questionnaireResults, setQuestionnaireResults] = useState<QuestionnaireResult[]>([]);
  const [resumeNextStep, setResumeNextStep] = useState<ClinicStep | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [redFlagData, setRedFlagData] = useState<Record<string, boolean> | null>(null);
  const [originalAssessment, setOriginalAssessment] = useState<any>(null);
  const [linkedPatient, setLinkedPatient] = useState<any>(null);
  const [prefilledRegions, setPrefilledRegions] = useState<string[] | undefined>(undefined);
  const [prefilledComplaints, setPrefilledComplaints] = useState<string[] | undefined>(undefined);
  const [prefilledOnset, setPrefilledOnset] = useState<string | undefined>(undefined);
  const [prefilledSurgery, setPrefilledSurgery] = useState<string | undefined>(undefined);
  const [prefilledSurgeryDetails, setPrefilledSurgeryDetails] = useState<string | undefined>(undefined);
  const [prefilledActivityLevel, setPrefilledActivityLevel] = useState<string | undefined>(undefined);
  const [prefilledGymAccess, setPrefilledGymAccess] = useState<string | undefined>(undefined);
  const [prefilledExtras, setPrefilledExtras] = useState<Record<string, any> | undefined>(undefined);
  const [previousQuestionnaireAnswers, setPreviousQuestionnaireAnswers] = useState<Record<string, Record<string, number>> | undefined>(undefined);

  useEffect(() => {
    if (!clinicId) return;
    const checkClinic = async () => {
      const { data, error } = await (supabase.rpc("get_public_clinic_assessment_link" as any, {
        _clinic_id: clinicId,
      }) as any);

      const clinicData = Array.isArray(data) ? data[0] : data;

      if (error || !clinicData || !clinicData.has_access) {
        setStep("inactive");
        return;
      }
      setClinic({
        id: clinicData.id,
        name: clinicData.name,
        logo_url: clinicData.logo_url,
        brand_color: clinicData.brand_color,
      });

      // If reassessment, load original assessment data
      if (reassessmentId) {
        const { data: orig } = await supabase
          .from("assessments")
          .select("patient_name, patient_email, pain_regions, anamnesis_data, test_results")
          .eq("id", reassessmentId)
          .eq("clinic_id", clinicId)
          .maybeSingle();

        if (orig) {
          setOriginalAssessment(orig);
          setPatientName(orig.patient_name || "");
          setPatientEmail(orig.patient_email || "");
          if (orig.pain_regions?.length) setPrefilledRegions(orig.pain_regions);
          const anam = orig.anamnesis_data as any;
          const complaints = anam?.chiefComplaints || (anam?.chiefComplaint ? [anam.chiefComplaint] : []);
          if (complaints.length > 0) setPrefilledComplaints(complaints);
          if (anam?.onset) setPrefilledOnset(anam.onset);
          if (anam?.hasPriorSurgery) setPrefilledSurgery(anam.hasPriorSurgery);
          if (anam?.surgeryDetails) setPrefilledSurgeryDetails(anam.surgeryDetails);
          if (anam?.activityLevel) setPrefilledActivityLevel(anam.activityLevel);
          if (anam?.hasGymAccess) setPrefilledGymAccess(anam.hasGymAccess);
          // Stable demographics + clinical history pre-fill
          setPrefilledExtras({
            sex: anam?.sex,
            ageRange: anam?.ageRange,
            birthDate: anam?.birthDate,
            cpf: anam?.cpf,
            hadTwist: anam?.hadTwist,
            hadSprain: anam?.hadSprain,
            hadDislocation: anam?.hadDislocation,
            hasScapulaPain: anam?.hasScapulaPain,
            hasLocalSwelling: anam?.hasLocalSwelling,
            hasPhotophobia: anam?.hasPhotophobia,
            hasVisualAura: anam?.hasVisualAura,
            hasNausea: anam?.hasNausea,
            headacheCrisisFrequency: anam?.headacheCrisisFrequency,
            painSubArea: anam?.painSubArea,
          });

          const testResults = orig.test_results as any;
          if (Array.isArray(testResults) && testResults.length > 0) {
            const prevAnswers: Record<string, Record<string, number>> = {};
            for (const r of testResults) {
              if (r.questionnaireId && r.answers) {
                prevAnswers[r.questionnaireId] = r.answers;
              }
            }
            if (Object.keys(prevAnswers).length > 0) {
              setPreviousQuestionnaireAnswers(prevAnswers);
            }
          }
        }
      }

      setStep("welcome");
    };
    checkClinic();
  }, [clinicId, reassessmentId]);

  // Load patient by token (personalized link)
  useEffect(() => {
    if (!patientToken || !clinicId) return;
    const loadPatient = async () => {
      const { data } = await (supabase.rpc("get_patient_assessment_link_context" as any, {
        _token: patientToken,
        _clinic_id: clinicId,
      }) as any);
      const linkedPatientData = Array.isArray(data) ? data[0] : data;
      if (linkedPatientData) {
        setLinkedPatient(linkedPatientData);
        setPatientName(linkedPatientData.full_name || "");
        if (linkedPatientData.email) setPatientEmail(linkedPatientData.email);
      }
    };
    loadPatient();
  }, [patientToken, clinicId]);

  // Resume in-progress assessment
  useEffect(() => {
    if (!resumeId || !clinicId) return;
    const loadResume = async () => {
      const { data: existing, error } = await supabase
        .from("assessments")
        .select("id, status, patient_name, patient_email, pain_regions, pain_score, anamnesis_data, test_results, red_flags")
        .eq("id", resumeId)
        .eq("clinic_id", clinicId)
        .maybeSingle();

      if (error || !existing) {
        toast({
          title: language === "pt" ? "Não foi possível retomar a avaliação" : "Could not resume assessment",
          variant: "destructive",
        });
        return;
      }

      // Only resume if still in progress
      if (existing.status !== "in_progress") {
        toast({
          title: language === "pt" ? "Esta avaliação já foi finalizada" : "This assessment is already complete",
        });
        return;
      }

      setAssessmentId(existing.id);
      if (existing.patient_name) setPatientName(existing.patient_name);
      if (existing.patient_email) setPatientEmail(existing.patient_email);
      if (existing.pain_regions?.length) setPrefilledRegions(existing.pain_regions);

      const anam = existing.anamnesis_data as any;
      const hasAnamnesis = anam && typeof anam === "object" && Object.keys(anam).length > 0;

      let nextStep: ClinicStep;
      if (hasAnamnesis) {
        // Restore anamnesis state and skip directly to questionnaire step
        setAnamnesisData(anam as AnamnesisData);
        const tests = existing.test_results as any;
        if (Array.isArray(tests) && tests.length > 0) {
          setQuestionnaireResults(tests);
        }
        nextStep = "questionnaire";
      } else {
        // Anamnesis not started yet — go to patient_info / anamnesis
        nextStep = existing.patient_email || existing.patient_name ? "anamnesis" : "patient_info";
      }
      setResumeNextStep(nextStep);
      setStep("resume_summary");
    };
    loadResume();
  }, [resumeId, clinicId, language, toast]);

  const logClinicAction = async (action: string, assessmentId?: string, meta?: Record<string, any>) => {
    try {
      await supabase.from("clinic_assessment_logs" as any).insert({
        clinic_id: clinicId,
        assessment_id: assessmentId || null,
        action,
        metadata: meta || {},
      } as any);
    } catch (e) {
      console.warn("Audit log failed:", e);
    }
  };

  const createAssessment = async () => {
    // Reuse existing assessment if resuming or already created in this session
    if (assessmentId) return assessmentId;
    try {
      const { data, error } = await supabase
        .from("assessments")
        .insert({
          type: "professional",
          status: "in_progress",
          user_id: null,
          professional_id: null,
          clinic_id: clinicId,
          payment_status: "covered",
          patient_name: patientName || null,
          patient_email: patientEmail || null,
          original_assessment_id: reassessmentId || null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      setAssessmentId(data.id);
      await logClinicAction("assessment_created", data.id, {
        patient_name: patientName || null,
        is_reassessment: !!reassessmentId,
      });
      return data.id;
    } catch (err: any) {
      console.error("Error creating clinic assessment:", err);
      toast({
        title: language === "pt" ? "Erro ao salvar avaliação" : "Error saving assessment",
        description: err?.message || (language === "pt" ? "Tente novamente em instantes." : "Please try again."),
        variant: "destructive",
      });
      return null;
    }
  };

  const updateAssessment = async (id: string, updates: Record<string, any>) => {
    try {
      const { error } = await supabase.from("assessments").update(updates).eq("id", id);
      if (error) console.error("Update error:", error);
    } catch (err) {
      console.error("Error updating assessment:", err);
    }
  };

  const handleRedFlagged = async (flaggedItems: Record<string, boolean>) => {
    setRedFlagData(flaggedItems);
    const id = await createAssessment();
    if (id) {
      // Save red flags but DO NOT mark assessment as red_flagged — flow continues.
      await updateAssessment(id, { red_flags: flaggedItems as any });
    }
    if (clinicId) {
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            clinic_id: clinicId,
            title: "🚨 Red flag detectada",
            body: `${patientName || "Paciente"} ativou sinais de alerta na avaliação.`,
            url: id ? `/assessment/view/${id}` : "/dashboard?tab=clinic",
            tag: `redflag-${id || "x"}`,
          },
        });
      } catch (err) {
        console.warn("Red flag push (clinic) failed:", err);
      }
    }
    setStep("redflag_continue");
  };

  const handleRedFlagEnd = async () => {
    if (assessmentId) {
      await updateAssessment(assessmentId, { status: "red_flagged" });
    }
    setStep("redflag_alert");
  };

  const handleAnamnesisComplete = async (rawData: AnamnesisData) => {
    const data = (reassessmentId && originalAssessment)
      ? (mergeAnamnesisWithOriginal(rawData, originalAssessment, enabledSteps) as AnamnesisData)
      : rawData;
    setAnamnesisData(data);
    const id = await createAssessment();
    if (id) {
      await updateAssessment(id, {
        anamnesis_data: data as any,
        pain_regions: data.painRegions,
        pain_score: data.painScore,
      });
    }
    if (reassessHasQuestionnaire) {
      setStep("questionnaire");
    } else {
      const origTests = (originalAssessment?.test_results as any) || [];
      generateDiagnosis(data, origTests, id);
    }
  };

  const handleQuestionnaireComplete = async (results: QuestionnaireResult[]) => {
    setQuestionnaireResults(results);
    if (assessmentId && results.length > 0) {
      await updateAssessment(assessmentId, { test_results: results as any });
    }
    generateDiagnosis(anamnesisData!, results, assessmentId);
  };

  const handleQuestionnaireSkip = () => {
    const fallback = reassessmentId ? ((originalAssessment?.test_results as any) || []) : [];
    generateDiagnosis(anamnesisData!, fallback, assessmentId);
  };

  const invokeDiagnosisWithRetry = async (bodyData: any, attempts = 3): Promise<any> => {
    let lastErr: any = null;
    for (let i = 0; i < attempts; i++) {
      try {
        const { data: result, error } = await supabase.functions.invoke("generate-diagnosis", { body: bodyData });
        if (error) throw error;
        if (!result?.diagnosis) throw new Error("Empty diagnosis");
        return result;
      } catch (err) {
        lastErr = err;
        console.warn(`Diagnosis attempt ${i + 1} failed:`, err);
        if (i < attempts - 1) {
          await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
        }
      }
    }
    throw lastErr;
  };

  const generateDiagnosis = async (data: AnamnesisData, qResults: QuestionnaireResult[], currentId?: string | null) => {
    setStep("loading");
    try {
      const bodyData: any = { anamnesisData: data, testResults: [], questionnaireResults: qResults, mode: "professional", language };
      const result = await invokeDiagnosisWithRetry(bodyData);

      const id = currentId || assessmentId;
      if (id) {
        await updateAssessment(id, { diagnosis: result.diagnosis as any, status: "completed" });
        await logClinicAction("assessment_completed", id);
      }
      // Save/update patient: if linked via personalized token, update existing record
      try {
        const cpfClean = data.cpf?.replace(/\D/g, "") || null;
        if (linkedPatient?.id) {
          const updates: any = {};
          if (patientEmail && !linkedPatient.email) updates.email = patientEmail;
          if (cpfClean) updates.cpf = cpfClean;
          if (data.birthDate) updates.birth_date = data.birthDate;
          if (Object.keys(updates).length > 0) {
            await (supabase.from("patients" as any) as any)
              .update(updates)
              .eq("id", linkedPatient.id);
          }
        } else {
          await (supabase.from("patients" as any) as any).insert({
            full_name: patientName || "Paciente",
            email: patientEmail || null,
            cpf: cpfClean,
            birth_date: data.birthDate || null,
            clinic_id: clinicId,
          });
        }
      } catch (e) {
        console.warn("Patient record save skipped:", e);
      }
      setStep("thank_you");
    } catch (err: any) {
      console.error("Diagnosis error:", err);
      // Mark assessment as completed-without-diagnosis so clinic can still review the data
      const id = currentId || assessmentId;
      if (id) {
        await updateAssessment(id, { status: "completed" });
        await logClinicAction("assessment_completed_no_ai", id, { error: err?.message || String(err) });
      }
      // Still save patient record so it appears for the clinic
      try {
        const cpfClean = data.cpf?.replace(/\D/g, "") || null;
        if (linkedPatient?.id) {
          const updates: any = {};
          if (patientEmail && !linkedPatient.email) updates.email = patientEmail;
          if (cpfClean) updates.cpf = cpfClean;
          if (data.birthDate) updates.birth_date = data.birthDate;
          if (Object.keys(updates).length > 0) {
            await (supabase.from("patients" as any) as any).update(updates).eq("id", linkedPatient.id);
          }
        } else {
          await (supabase.from("patients" as any) as any).insert({
            full_name: patientName || "Paciente",
            email: patientEmail || null,
            cpf: cpfClean,
            birth_date: data.birthDate || null,
            clinic_id: clinicId,
          });
        }
      } catch (e) {
        console.warn("Patient record save skipped:", e);
      }
      setStep("diagnosis_error");
    }
  };

  const retryDiagnosis = () => {
    if (anamnesisData) {
      generateDiagnosis(anamnesisData, questionnaireResults, assessmentId);
    }
  };

  const handlePatientInfoContinue = async () => {
    if (reassessmentId && originalAssessment) {
      if (reassessHasAnamnesis) {
        setStep("anamnesis");
      } else {
        const data = buildAnamnesisFromOriginal(originalAssessment) as AnamnesisData;
        setAnamnesisData(data);
        const id = await createAssessment();
        if (id) {
          await updateAssessment(id, {
            anamnesis_data: data as any,
            pain_regions: data.painRegions,
            pain_score: data.painScore,
          });
        }
        if (reassessHasQuestionnaire) {
          setStep("questionnaire");
        } else {
          const origTests = (originalAssessment?.test_results as any) || [];
          generateDiagnosis(data, origTests, id);
        }
      }
    } else {
      setStep("redflags");
    }
  };

  if (step === "loading_check") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === "inactive") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold text-foreground">{t("pro.link_inactive_title")}</h2>
            <p className="text-sm text-muted-foreground">{t("pro.link_inactive_desc")}</p>
            <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
              {t("redflag_alert.back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background"
      style={clinic?.brand_color ? { "--brand-accent": clinic.brand_color } as React.CSSProperties : undefined}
    >
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
            <span className="text-xl font-bold text-foreground">Aliv.iA</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Clinic branding */}
            {clinic?.logo_url && (
              <img
                src={clinic.logo_url}
                alt={clinic.name}
                className="h-9 w-9 rounded-full object-cover border border-border"
              />
            )}
            <span
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={clinic?.brand_color
                ? { backgroundColor: `${clinic.brand_color}18`, color: clinic.brand_color }
                : undefined
              }
            >
              <Building2 className="h-3 w-3 inline mr-1" />
              {clinic?.name || "Clínica"}
            </span>
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
              <Globe className="h-4 w-4" />
              {t("nav.language")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-8 px-4">
        {step !== "welcome" && step !== "patient_info" && step !== "resume_summary" && (
          <AssessmentStepper
            currentStep={step}
            mode="professional"
            enabledStepIds={reassessmentId ? [
              ...(reassessHasRedflags ? ["redflags"] : []),
              ...(reassessHasAnamnesis ? ["anamnesis"] : []),
              ...(reassessHasQuestionnaire ? ["questionnaire"] : []),
              "result",
            ] : undefined}
          />
        )}

        {step === "resume_summary" && (
          <ResumeSummary
            patientName={patientName}
            patientEmail={patientEmail}
            anamnesisData={anamnesisData}
            questionnaireResults={questionnaireResults}
            onContinue={() => setStep(resumeNextStep || "anamnesis")}
          />
        )}

        {step === "welcome" && clinic && (
          <WelcomeStep
            mode="professional"
            professionalName={clinic.name}
            onContinue={() => setStep("patient_info")}
            onRestart={() => {
              setAnamnesisData(null);
              setQuestionnaireResults([]);
              setAssessmentId(null);
              setPatientName(linkedPatient?.name || "");
              setPatientEmail(linkedPatient?.email || "");
              setRedFlagData(null);
              setStep("welcome");
            }}
          />
        )}

        {step === "patient_info" && clinic && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto">
                <User className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {t("patient_info.title")}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {t("patient_info.desc").replace("{name}", clinic.name)}
              </p>
              {reassessmentId && (
                <p className="text-xs text-primary font-medium">
                  Reavaliação — dados pré-preenchidos da avaliação anterior
                </p>
              )}
              {linkedPatient && (
                <p className="text-xs text-primary font-medium">
                  {language === "pt"
                    ? "Link personalizado — esta avaliação será vinculada ao seu cadastro existente"
                    : "Personalized link — this assessment will be linked to your existing record"}
                </p>
              )}
            </div>

            <Card className="rounded-xl">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patient-name">{t("patient_info.name_label")}</Label>
                  <Input
                    id="patient-name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value.slice(0, 100))}
                    placeholder={t("patient_info.name_placeholder")}
                    maxLength={100}
                    autoFocus={!linkedPatient}
                    disabled={!!linkedPatient}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="patient-email">{t("patient_info.email_label")}</Label>
                  <Input
                    id="patient-email"
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value.slice(0, 150))}
                    placeholder={t("patient_info.email_placeholder")}
                    maxLength={150}
                  />
                  <p className="text-xs text-muted-foreground">{t("patient_info.email_hint")}</p>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">{t("patient_info.steps_info")}</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("welcome")}
                className="rounded-xl gap-2 sm:w-auto"
                size="lg"
              >
                <ArrowLeft className="h-4 w-4" />
                {language === "es" ? "Atrás" : language === "en" ? "Back" : "Voltar"}
              </Button>
              <Button
                onClick={handlePatientInfoContinue}
                disabled={!patientName.trim()}
                className="flex-1 rounded-xl gap-2"
                size="lg"
              >
                {t("patient_info.continue")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === "redflags" && (
          <RedFlagScreening
            onPass={() => setStep("anamnesis")}
            onFlagged={() => setStep("redflag_continue")}
            onFlaggedWithData={handleRedFlagged}
            onBack={() => setStep("patient_info")}
          />
        )}
        {step === "redflag_continue" && redFlagData && (
          <RedFlagContinueScreen
            flaggedItems={redFlagData}
            professionalName={clinic?.name}
            onContinue={() => setStep("anamnesis")}
            onEnd={handleRedFlagEnd}
          />
        )}
        {step === "redflag_alert" && (
          <RedFlagAlert
            mode="professional"
            flaggedItems={redFlagData || undefined}
            professionalName={clinic?.name}
          />
        )}

        {step === "anamnesis" && (
          <AnamnesisForm
            mode="professional"
            onComplete={handleAnamnesisComplete}
            onBack={() => reassessmentId ? setStep("patient_info") : setStep("redflags")}
            draftScopeKey={`clinic:${clinicId}:${patientToken || reassessmentId || "anon"}:${stepsParam || "full"}`}
            initialPainRegions={prefilledRegions}
            initialChiefComplaints={prefilledComplaints}
            initialOnset={prefilledOnset}
            initialHasPriorSurgery={prefilledSurgery}
            initialSurgeryDetails={prefilledSurgeryDetails}
            initialActivityLevel={prefilledActivityLevel}
            initialHasGymAccess={prefilledGymAccess}
            initialExtras={prefilledExtras}
            enabledSubs={reassessAnamSubs || undefined}
          />
        )}

        {step === "questionnaire" && anamnesisData && (
          <QuestionnaireStep
            painRegions={anamnesisData.painRegions}
            onComplete={handleQuestionnaireComplete}
            onBack={() => reassessHasAnamnesis ? setStep("anamnesis") : setStep("patient_info")}
            onSkip={handleQuestionnaireSkip}
            previousAnswers={previousQuestionnaireAnswers}
          />
        )}

        {step === "loading" && (
          <ClinicalThinkingSkeleton phase="diagnosis" lang={language} />
        )}

        {step === "diagnosis_error" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mx-auto">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {language === "pt" ? "Avaliação salva com sucesso" : "Assessment saved successfully"}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {language === "pt"
                ? "Não conseguimos gerar o diagnóstico automático agora, mas todos os seus dados foram salvos. A clínica já pode visualizar sua avaliação e um profissional irá revisar seus dados."
                : "We couldn't generate the automatic diagnosis right now, but all your data was saved. The clinic can already view your assessment and a professional will review your data."}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-4">
              <Button onClick={retryDiagnosis} className="rounded-xl">
                {language === "pt" ? "Tentar gerar diagnóstico novamente" : "Retry diagnosis"}
              </Button>
              <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
                {t("redflag_alert.back")}
              </Button>
            </div>
          </motion.div>
        )}

        {step === "thank_you" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">{t("pro.thankyou_title")}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t("pro.thankyou_desc").replace("{name}", clinic?.name || "")}
            </p>

            {/* Post-assessment onboarding */}
            <Card className="text-left max-w-md mx-auto border-primary/20">
              <CardContent className="py-5 space-y-4">
                <h3 className="font-semibold text-foreground text-sm">
                  {language === "pt" ? "O que acontece agora?" : "What happens next?"}
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      icon: "📋",
                      title: language === "pt" ? "Avaliação enviada" : "Assessment submitted",
                      desc: language === "pt"
                        ? "Sua avaliação já está disponível para a equipe da clínica."
                        : "Your assessment is now available to the clinic team.",
                    },
                    {
                      icon: "🩺",
                      title: language === "pt" ? "Análise profissional" : "Professional analysis",
                      desc: language === "pt"
                        ? "Um fisioterapeuta vai revisar seus dados e gerar um diagnóstico personalizado."
                        : "A physiotherapist will review your data and generate a personalized diagnosis.",
                    },
                    {
                      icon: "📞",
                      title: language === "pt" ? "Contato da clínica" : "Clinic contact",
                      desc: language === "pt"
                        ? "A clínica entrará em contato para agendar seu atendimento ou enviar orientações."
                        : "The clinic will contact you to schedule your appointment or send instructions.",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <span className="text-lg shrink-0 mt-0.5">{item.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="pt-4">
              <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
                {t("redflag_alert.back")}
              </Button>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default ClinicAssessment;
