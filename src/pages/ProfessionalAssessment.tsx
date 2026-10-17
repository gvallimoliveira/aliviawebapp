import { normalizeAssessmentPurpose, isPreventiveAssessment, shouldCollectPainQuestionnaires, shouldCollectPainSelfTests } from "@/lib/assessmentPurpose";
import { useState, useEffect, useMemo, useRef } from "react";
import logoAlivia from "@/assets/logo-alivia.png";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Globe, Loader2, ChevronRight, Stethoscope, AlertTriangle, User, CheckCircle2, ArrowLeft } from "lucide-react";
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
import FunctionalTests, { type TestResult } from "@/components/assessment/FunctionalTests";
import PsychosocialStep, { type PsychosocialStepResult } from "@/components/assessment/PsychosocialStep";
import AssessmentStepper from "@/components/assessment/AssessmentStepper";
import ClinicalThinkingSkeleton from "@/components/assessment/ClinicalThinkingSkeleton";
import WelcomeStep from "@/components/assessment/WelcomeStep";
import ResumeSummary, { type ResumeConflictInfo } from "@/components/assessment/ResumeSummary";
import { type QuestionnaireResult } from "@/data/questionnaireData";
import {
  parseStepsParam,
  hasAnyAnamnesisSub,
  isStepEnabled,
  mergeAnamnesisWithOriginal,
  buildAnamnesisFromOriginal,
  ANAMNESIS_SUB_IDS,
  type ReassessStepId,
} from "@/lib/reassessmentSteps";
import { fetchPatientPrefillExtras } from "@/lib/reassessmentPrefill";
import { normalizeHealthHistory } from "@/lib/healthHistory";
import { normalizeAnamnesisForReassessment } from "@/lib/reassessmentNormalize";
import { painExtentValue } from "@/lib/painExtent";
import { buildMechanismPayload } from "@/components/assessment/PainMechanismLite";
import {
  saveAssessmentProgress,
  getAssessmentProgress,
  clearAssessmentProgress,
  hasMeaningfulProgress,
  reconcileAssessmentProgress,
  saveAssessmentProgressRemote,
  clearAssessmentProgressRemote,
  RESUMABLE_STEPS,
  isSyncableScope,
  identityScopeKey,
  matchesIdentity,
  clearOtherIdentityProgress,
  type ResumableStep,
  type AssessmentProgressSnapshot,
} from "@/lib/assessmentAutoResume";



type ProfStep = "loading_check" | "inactive" | "welcome" | "patient_info" | "redflags" | "redflag_continue" | "redflag_alert" | "anamnesis" | "questionnaire" | "functional_tests" | "psychosocial" | "loading" | "diagnosis_error" | "thank_you" | "resume_summary";

const ProfessionalAssessment = () => {
  const { professionalId } = useParams<{ professionalId: string }>();
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
  // Psychosocial (FABQ) is opt-in only: never part of the default full flow.
  const extraQuestionnaireIds = enabledSteps
    ? [...(enabledSteps.has("psychosocial") ? ["fabq_brasil"] : []), ...(enabledSteps.has("spine") ? ["srs22r"] : [])]
    : [];
  const reassessHasPsychosocial = extraQuestionnaireIds.length > 0;
  const reassessHasRedflags = isStepEnabled(enabledSteps, "redflags");
  // Testes funcionais autoaplicados: fazem parte do fluxo completo do link
  // (opcionais/puláveis) e são opt-in nos links de reavaliação.
  const hasFunctionalTests = enabledSteps ? enabledSteps.has("functionaltests") : true;

  const [step, setStep] = useState<ProfStep>("loading_check");
  const [professional, setProfessional] = useState<any>(null);
  const [anamnesisData, setAnamnesisData] = useState<AnamnesisData | null>(null);
  const [questionnaireResults, setQuestionnaireResults] = useState<QuestionnaireResult[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [resumeNextStep, setResumeNextStep] = useState<ProfStep | null>(null);
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
  const [previousPainScore, setPreviousPainScore] = useState<number | undefined>(undefined);
  const [previousQuestionnaireAnswers, setPreviousQuestionnaireAnswers] = useState<Record<string, Record<string, number>> | undefined>(undefined);

  // ---------- Retomada automática (backup local + nuvem, validade de 24h) ----------
  // Link personalizado / reavaliação => escopo único por paciente (com nuvem).
  // Link genérico (público) => escopo só local e SEMPRE amarrado à identidade
  // informada (e-mail/nome), nunca ao dispositivo.
  const baseScopeKey = `pro:${professionalId}:${patientToken || reassessmentId || "anon"}:${stepsParam || "full"}`;
  const isGenericLink = !isSyncableScope(baseScopeKey);
  const [identityScope, setIdentityScope] = useState<string | null>(null);
  const progressScopeKey = isGenericLink ? identityScope || baseScopeKey : baseScopeKey;
  const canPersistProgress = !isGenericLink || !!identityScope;
  const autoResumedRef = useRef(false);
  const [resumeConflict, setResumeConflict] = useState<ResumeConflictInfo | null>(null);
  const [genericResume, setGenericResume] = useState(false);
  /** Paciente já confirmou a retomada → restaurar rascunho sem pedir de novo. */
  const [resumeConfirmed, setResumeConfirmed] = useState(false);

  const applyProgressSnapshot = (snap: AssessmentProgressSnapshot) => {
    setAssessmentId(snap.assessmentId || null);
    setPatientName(snap.patientName || "");
    setPatientEmail(snap.patientEmail || "");
    setRedFlagData(snap.redFlagData || null);
    if (snap.anamnesisData) {
      setAnamnesisData(snap.anamnesisData as AnamnesisData);
      if (snap.anamnesisData.painRegions?.length) setPrefilledRegions(snap.anamnesisData.painRegions);
    } else {
      setAnamnesisData(null);
    }
    setQuestionnaireResults(snap.questionnaireResults || []);
    setTestResults((snap.testResults as TestResult[]) || []);
    setResumeNextStep(snap.step as ProfStep);
  };

  /**
   * Link genérico: procura um rascunho DESTA pessoa (e-mail/nome informados).
   * Retorna true quando encontrou e abriu a tela de retomada.
   */
  const tryIdentityResume = (name: string, email: string) => {
    const scoped = identityScopeKey(baseScopeKey, name, email);
    setIdentityScope(scoped);
    clearOtherIdentityProgress(baseScopeKey, scoped);
    const snap = getAssessmentProgress(scoped);
    if (!snap || !hasMeaningfulProgress(snap) || !matchesIdentity(snap, name, email)) return false;
    autoResumedRef.current = true;
    applyProgressSnapshot(snap);
    setResumeConflict(null);
    setGenericResume(true);
    setStep("resume_summary");
    return true;
  };

  // Restaura o progresso salvo, conciliando local x nuvem (prioriza o mais recente).
  // Só para links com token/reavaliação — o link genérico nunca retoma no welcome.
  useEffect(() => {
    if (isGenericLink) return;
    if (step !== "welcome" || resumeId || autoResumedRef.current || !professionalId) return;
    let cancelled = false;
    (async () => {
      const rec = await reconcileAssessmentProgress(progressScopeKey);
      if (cancelled || !rec || autoResumedRef.current) return;
      autoResumedRef.current = true;
      applyProgressSnapshot(rec.chosen);
      setResumeConflict({
        fromOtherDevice: rec.fromOtherDevice,
        otherDeviceLabel: rec.otherDeviceLabel,
        chosenSavedAt: rec.chosenSavedAt,
        alternativeSavedAt: rec.alternativeSavedAt,
        onUseAlternative: rec.alternative
          ? () => {
              applyProgressSnapshot(rec.alternative!);
              setResumeConflict((c) =>
                c
                  ? {
                      ...c,
                      chosenSavedAt: rec.alternativeSavedAt || c.chosenSavedAt,
                      alternativeSavedAt: rec.chosenSavedAt,
                      fromOtherDevice: !rec.fromOtherDevice,
                      onUseAlternative: undefined,
                    }
                  : c,
              );
            }
          : undefined,
      });
      setStep("resume_summary");
    })();
    return () => {
      cancelled = true;
    };
  }, [step, resumeId, professionalId, progressScopeKey, isGenericLink]);

  // Salva o progresso a cada avanço de etapa (local + nuvem)
  useEffect(() => {
    if (!professionalId || !canPersistProgress) return;
    if (!RESUMABLE_STEPS.includes(step as ResumableStep)) return;
    const snapshot = {
      step: step as ResumableStep,
      assessmentId,
      patientName,
      patientEmail,
      anamnesisData,
      questionnaireResults,
      testResults,
      redFlagData,
    };
    saveAssessmentProgress(progressScopeKey, snapshot);
    void saveAssessmentProgressRemote(progressScopeKey, snapshot);
  }, [step, assessmentId, patientName, patientEmail, anamnesisData, questionnaireResults, testResults, redFlagData, professionalId, progressScopeKey, canPersistProgress]);

  // Limpa o backup quando a avaliação chega ao fim
  useEffect(() => {
    if (step === "thank_you" || step === "redflag_alert") {
      clearAssessmentProgress(progressScopeKey);
      void clearAssessmentProgressRemote(progressScopeKey);
    }
  }, [step, progressScopeKey]);




  // Validate professional exists and has active subscription
  useEffect(() => {
    if (!professionalId) return;
    const checkProfessional = async () => {
      const { data, error } = await (supabase.rpc("get_public_professional_assessment_link" as any, {
        _professional_id: professionalId,
      }) as any);

      const professionalData = Array.isArray(data) ? data[0] : data;

      // Access is gated server-side via `has_access` (covers approved pros, students,
      // partners, admins, lifetime, premium_granted, active subs). The client only
      // needs to confirm the professional is active and has access. The "sob ressalva"
      // disclaimer is shown downstream in the report/PDF for non-approved cases.
      if (error || !professionalData || !professionalData.active || !professionalData.has_access) {
        setStep("inactive");
        return;
      }
      setProfessional(professionalData);

      // If reassessment, load original assessment data
      if (reassessmentId) {
        const { data: orig } = await supabase
          .from("assessments")
          .select("patient_name, patient_email, pain_regions, pain_score, anamnesis_data, test_results")
          .eq("id", reassessmentId)
          .eq("professional_id", professionalId)
          .maybeSingle();

        if (orig) {
          setOriginalAssessment(orig);
          setPatientName(orig.patient_name || "");
          setPatientEmail(orig.patient_email || "");
          if (orig.pain_regions?.length) {
            setPrefilledRegions(orig.pain_regions);
          }
          const anam = orig.anamnesis_data as any;
          // Normalize manual-assessment raw values ("gradual", "local", free-text
          // chiefComplaint) into the i18n-keyed format the patient form expects.
          const normalized = normalizeAnamnesisForReassessment(anam, orig.pain_regions);
          if (normalized.chiefComplaints?.length) setPrefilledComplaints(normalized.chiefComplaints);
          if (normalized.onset) setPrefilledOnset(normalized.onset);
          if (anam?.hasPriorSurgery) setPrefilledSurgery(anam.hasPriorSurgery);
          if (anam?.surgeryDetails) setPrefilledSurgeryDetails(anam.surgeryDetails);
          if (normalized.activityLevel) setPrefilledActivityLevel(normalized.activityLevel);
          if (anam?.hasGymAccess) setPrefilledGymAccess(anam.hasGymAccess);
          if (typeof orig.pain_score === "number") setPreviousPainScore(orig.pain_score);
          else if (typeof anam?.painScore === "number") setPreviousPainScore(anam.painScore);
          // Stable demographics + clinical history pre-fill
          // Fallback: pull demographics from `patients` row when older assessments
          // didn't store sex/ageRange/birthDate/cpf inside anamnesis_data.
          const patientFallback = await fetchPatientPrefillExtras({
            professionalId,
            patientName: orig.patient_name,
            patientEmail: orig.patient_email,
          });
          setPrefilledExtras({
            assessmentPurpose: anam?.assessmentPurpose,
            preventionGoals: anam?.preventionGoals,
            preventionGoalDetails: anam?.preventionGoalDetails,
            historyRegions: anam?.historyRegions,
            sex: anam?.sex || patientFallback.sex,
            ageRange: anam?.ageRange || patientFallback.ageRange,
            birthDate: anam?.birthDate || patientFallback.birthDate,
            cpf: anam?.cpf || patientFallback.cpf,
            // Pain characterization (normalized to i18n keys when needed)
            painType: normalized.painType,
            painTypes: normalized.painTypes,
            painDuration: anam?.painDuration,
            painPattern: anam?.painPattern,
            painWeeklyFrequency: anam?.painWeeklyFrequency,
            painNightWaking: anam?.painNightWaking,
            evolution: anam?.evolution,
            aggravatingFactors: anam?.aggravatingFactors,
            relievingFactors: anam?.relievingFactors,
            // Histórico estável
            hadTwist: anam?.hadTwist,
            hadSprain: anam?.hadSprain,
            hadDislocation: anam?.hadDislocation,
            ottawaPositive: anam?.ottawaPositive,
            hasScapulaPain: anam?.hasScapulaPain,
            hasLocalSwelling: anam?.hasLocalSwelling,
            // Cefaleia
            hasPhotophobia: anam?.hasPhotophobia,
            hasVisualAura: anam?.hasVisualAura,
            hasNausea: anam?.hasNausea,
            headacheCrisisFrequency: anam?.headacheCrisisFrequency,
            // Refinamento do mapa de dor
            painSubArea: anam?.painSubArea,
            // Saúde geral (comorbidades + medicação contínua)
            ...normalizeHealthHistory(anam),
          });

          // Extract previous questionnaire answers for highlighting
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
    checkProfessional();
  }, [professionalId, reassessmentId]);

  // Load patient by token (personalized link)
  useEffect(() => {
    if (!patientToken) return;
    const loadPatient = async () => {
      const { data } = await (supabase.rpc("get_patient_assessment_link_context" as any, {
        _token: patientToken,
        _professional_id: professionalId,
      }) as any);
      const linkedPatientData = Array.isArray(data) ? data[0] : data;
      if (linkedPatientData) {
        setLinkedPatient(linkedPatientData);
        setPatientName(linkedPatientData.full_name || "");
        if (linkedPatientData.email) setPatientEmail(linkedPatientData.email);
      }
    };
    loadPatient();
  }, [patientToken, professionalId]);

  // Resume in-progress assessment
  useEffect(() => {
    if (!resumeId || !professionalId) return;
    const loadResume = async () => {
      const { data: existing, error } = await supabase
        .from("assessments")
        .select("id, status, patient_name, patient_email, pain_regions, pain_score, anamnesis_data, test_results, red_flags")
        .eq("id", resumeId)
        .eq("professional_id", professionalId)
        .maybeSingle();

      if (error || !existing) {
        toast({
          title: language === "pt" ? "Não foi possível retomar a avaliação" : "Could not resume assessment",
          variant: "destructive",
        });
        return;
      }

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

      let nextStep: ProfStep;
      if (hasAnamnesis) {
        setAnamnesisData(anam as AnamnesisData);
        const tests = existing.test_results as any;
        if (Array.isArray(tests) && tests.length > 0) {
          setQuestionnaireResults(tests);
        }
        nextStep = "questionnaire";
      } else {
        nextStep = existing.patient_email || existing.patient_name ? "anamnesis" : "patient_info";
      }
      setResumeNextStep(nextStep);
      setStep("resume_summary");
    };
    loadResume();
  }, [resumeId, professionalId, language, toast]);

  const createAssessment = async () => {
    if (assessmentId) return assessmentId;
    try {
      const { data, error } = await supabase
        .from("assessments")
        .insert({
          type: "professional",
          status: "in_progress",
          user_id: null,
          professional_id: professionalId,
          payment_status: "covered",
          patient_name: patientName || null,
          patient_email: patientEmail || null,
          original_assessment_id: reassessmentId || null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      setAssessmentId(data.id);
      return data.id;
    } catch (err) {
      console.error("Error creating assessment:", err);
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

  // Send push notification to professional
  const notifyProfessional = async () => {
    if (!professional?.user_id) return;
    try {
      await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: professional.user_id,
          title: language === "en" ? "Assessment completed" : "Avaliação concluída",
          body: language === "en"
            ? `Patient ${patientName || "Unknown"} completed the assessment`
            : `O paciente ${patientName || "Sem nome"} completou a avaliação`,
          url: "/dashboard",
          category: "assessments",
        },
      });
    } catch (err) {
      console.error("Push notification error:", err);
    }
  };

  const handleRedFlagged = async (flaggedItems: Record<string, boolean>) => {
    setRedFlagData(flaggedItems);
    const id = await createAssessment();
    if (id) {
      // Save red flags but DO NOT mark assessment as red_flagged — flow continues.
      await updateAssessment(id, { red_flags: flaggedItems as any });
    }
    if (professional?.user_id) {
      try {
        await supabase.functions.invoke("send-push-notification", {
          body: {
            user_id: professional.user_id,
            title: "🚨 Red flag detectada",
            body: `${patientName || "Paciente"} ativou sinais de alerta. Revise imediatamente.`,
            url: id ? `/assessment/view/${id}` : "/dashboard?tab=professional",
            tag: `redflag-${id || "x"}`,
            category: "red_flags",
          },
        });
      } catch (err) {
        console.warn("Red flag push failed:", err);
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

  const handleAnamnesisComplete = async (rawData: AnamnesisData, safetyConfirmed = false) => {
    // For reassessment, merge skipped sub-sections from the original assessment.
    const data = (reassessmentId && originalAssessment)
      ? (mergeAnamnesisWithOriginal(rawData, originalAssessment, enabledSteps) as AnamnesisData)
      : normalizeAssessmentPurpose(rawData);
    setAnamnesisData(data);
    if (isPreventiveAssessment(data) && redFlagData === null && !safetyConfirmed) { setStep("redflags"); return; }
    const id = await createAssessment();
    if (id) {
      await updateAssessment(id, {
        anamnesis_data: data as any,
        pain_regions: isPreventiveAssessment(data) ? [] : data.painRegions,
        pain_extent: isPreventiveAssessment(data) ? null : painExtentValue(data.painRegions),
        pain_score: isPreventiveAssessment(data) ? null : data.painScore,
        ...buildMechanismPayload(data),
      });
    }
    if (shouldCollectPainQuestionnaires(data, reassessHasQuestionnaire)) {
      setStep("questionnaire");
    } else if (shouldCollectPainSelfTests(data, hasFunctionalTests)) {
      setQuestionnaireResults((originalAssessment?.test_results as any) || []);
      setStep("functional_tests");
    } else if (reassessHasPsychosocial) {
      // Questionários desligados, mas FABQ marcado: vai direto ao psicossocial.
      setQuestionnaireResults((originalAssessment?.test_results as any) || []);
      setStep("psychosocial");
    } else {
      // Skip questionnaire: reuse original test_results if any
      const origTests = (originalAssessment?.test_results as any) || [];
      generateDiagnosis(data, origTests, id);
    }
  };


  /** Continua o fluxo depois dos questionários: testes funcionais (se
   *  habilitados) → perfil psicossocial (se habilitado) → hipótese. */
  const continueAfterQuestionnaire = (results: QuestionnaireResult[]) => {
    if (shouldCollectPainSelfTests(anamnesisData, hasFunctionalTests)) {
      setStep("functional_tests");
      return;
    }
    if (reassessHasPsychosocial) {
      setStep("psychosocial");
      return;
    }
    generateDiagnosis(anamnesisData!, results, assessmentId, []);
  };

  const handleQuestionnaireComplete = async (results: QuestionnaireResult[]) => {
    setQuestionnaireResults(results);
    if (assessmentId && results.length > 0) {
      await updateAssessment(assessmentId, { test_results: results as any });
    }
    continueAfterQuestionnaire(results);
  };

  const handleQuestionnaireSkip = () => {
    const fallback = reassessmentId ? ((originalAssessment?.test_results as any) || []) : [];
    setQuestionnaireResults(fallback);
    continueAfterQuestionnaire(fallback);
  };

  /** Testes funcionais autoaplicados (opcionais). Os resultados são salvos
   *  junto dos questionários em `test_results` e enviados à IA. */
  const handleFunctionalTestsDone = async (results: TestResult[]) => {
    setTestResults(results);
    if (assessmentId && (results.length > 0 || questionnaireResults.length > 0)) {
      await updateAssessment(assessmentId, {
        test_results: [...questionnaireResults, ...results] as any,
      });
    }
    if (reassessHasPsychosocial) {
      setStep("psychosocial");
      return;
    }
    generateDiagnosis(anamnesisData!, questionnaireResults, assessmentId, results);
  };

  // ── Optional psychosocial step (FABQ / yellow flags) ──
  const finishAfterPsychosocial = async (results: PsychosocialStepResult[] = []) => {
    const base = (anamnesisData || {}) as any;
    let data = base as AnamnesisData;
    if (results.length) {
      const ids = new Set(results.map((r) => r.questionnaireId));
      const prev = Array.isArray(base.specialtyResults) ? base.specialtyResults : [];
      data = {
        ...base,
        specialtyResults: [...prev.filter((r: any) => !ids.has(r.questionnaireId)), ...results],
      } as AnamnesisData;
      setAnamnesisData(data);
      if (assessmentId) {
        await updateAssessment(assessmentId, { anamnesis_data: data as any });
      }
    }
    generateDiagnosis(data, questionnaireResults, assessmentId, testResults);
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

  const persistPatientRecord = async (data: AnamnesisData) => {
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
          professional_id: professionalId,
        });
      }
    } catch (e) {
      console.warn("Patient record save skipped:", e);
    }
  };

  const generateDiagnosis = async (
    data: AnamnesisData,
    qResults: QuestionnaireResult[],
    currentId?: string | null,
    fnTests?: TestResult[],
  ) => {
    setStep("loading");
    try {
      const bodyData: any = { anamnesisData: data, testResults: fnTests ?? testResults, questionnaireResults: qResults, mode: "professional", language, assessmentId: currentId || assessmentId };
      // Passo D1 — mecanismo/extensão de dor como contexto clínico para a IA.
      const mechPayload = buildMechanismPayload(data as any);
      if (mechPayload.pain_mechanism) bodyData.painMechanism = mechPayload.pain_mechanism;
      bodyData.painExtent = painExtentValue((data as any).painRegions);
      const result = await invokeDiagnosisWithRetry(bodyData);

      const id = currentId || assessmentId;
      if (id) {
        await updateAssessment(id, { diagnosis: result.diagnosis as any, status: "completed" });
      }

      await persistPatientRecord(data);

      // Push notification is sent server-side by the assessments trigger.

      setStep("thank_you");
    } catch (err: any) {
      console.error("Diagnosis error:", err);
      const id = currentId || assessmentId;
      if (id) {
        await updateAssessment(id, { status: "completed" });
      }
      await persistPatientRecord(data);
      setStep("diagnosis_error");
    }
  };

  const retryDiagnosis = () => {
    if (anamnesisData) {
      generateDiagnosis(anamnesisData, questionnaireResults, assessmentId, testResults);
    }
  };

  // For reassessment, skip red flags. Route based on which steps the professional enabled.
  const handlePatientInfoContinue = async () => {
    // Link genérico: só agora sabemos quem está preenchendo. Se houver rascunho
    // desta MESMA pessoa (mesmo e-mail/nome), oferecemos a retomada; caso
    // contrário segue uma avaliação nova, sem herdar nada de outro paciente.
    if (isGenericLink && !identityScope) {
      if (tryIdentityResume(patientName, patientEmail)) return;
    }
    if (reassessmentId && originalAssessment) {
      if (isPreventiveAssessment(originalAssessment.anamnesis_data) && redFlagData === null) { if (!reassessHasAnamnesis) setAnamnesisData(buildAnamnesisFromOriginal(originalAssessment)); setStep("redflags"); return; }
      if (reassessHasAnamnesis) {
        setStep("anamnesis");
      } else {
        // No anamnesis sub-steps enabled — reuse the original anamnesis entirely
        const data = buildAnamnesisFromOriginal(originalAssessment) as AnamnesisData;
        setAnamnesisData(data);
        const id = await createAssessment();
        if (id) {
          await updateAssessment(id, {
            anamnesis_data: data as any,
            pain_regions: isPreventiveAssessment(data) ? [] : data.painRegions,
            pain_extent: isPreventiveAssessment(data) ? null : painExtentValue(data.painRegions),
            pain_score: isPreventiveAssessment(data) ? null : data.painScore,
          });
        }
        if (shouldCollectPainQuestionnaires(data, reassessHasQuestionnaire)) {
          setStep("questionnaire");
        } else if (reassessHasPsychosocial) {
          setQuestionnaireResults((originalAssessment?.test_results as any) || []);
          setStep("psychosocial");
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
            <span className="text-xl font-bold text-foreground">Aliv.iA</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {reassessmentId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-1.5 rounded-full"
                title={language === "pt" ? "Voltar ao painel" : language === "es" ? "Volver al panel" : "Back to dashboard"}
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {language === "pt" ? "Painel" : language === "es" ? "Panel" : "Dashboard"}
                </span>
              </Button>
            )}
            {/* Professional logo (white-label) */}
            {professional?.logo_url && (
              <img
                src={professional.logo_url}
                alt={professional.full_name}
                className="h-9 w-9 rounded-full object-cover border border-border"
              />
            )}
            <span className="hidden sm:inline-flex text-xs font-medium px-3 py-1 rounded-full bg-blue-500/10 text-blue-600">
              <Stethoscope className="h-3 w-3 inline mr-1" />
              {t("pro.badge_professional")}
            </span>
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{t("nav.language")}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-8 px-4">
        {(professional as any)?.active_profile_mode === "student" && (
          <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold">
              {language === "pt" ? "Alivia Acadêmico" : language === "es" ? "Alivia Académico" : "Alivia Academic"}
            </p>
            <p className="text-xs opacity-90 mt-0.5">
              {language === "pt"
                ? `Avaliação conduzida por ${professional.full_name}, estudante de fisioterapia${professional.student_institution ? ` (${professional.student_institution}` + (professional.student_period ? ` · ${professional.student_period})` : ")") : ""}.`
                : language === "es"
                ? `Evaluación realizada por ${professional.full_name}, estudiante de fisioterapia${professional.student_institution ? ` (${professional.student_institution})` : ""}.`
                : `Assessment conducted by ${professional.full_name}, physiotherapy student${professional.student_institution ? ` (${professional.student_institution})` : ""}.`}
            </p>
            <p className="text-xs font-medium mt-2 border-t border-amber-500/20 pt-2">
              {language === "pt"
                ? "Documento de caráter acadêmico — sem valor profissional. Se necessário, busque orientação de um fisioterapeuta formado e habilitado."
                : language === "es"
                ? "Documento de carácter académico — sin valor profesional. Si es necesario, busque orientación de un fisioterapeuta formado y habilitado."
                : "Academic document — no professional value. If needed, seek guidance from a qualified physiotherapist."}
            </p>
          </div>
        )}
        {step !== "welcome" && step !== "patient_info" && step !== "resume_summary" && (
          <AssessmentStepper
            currentStep={step}
            mode="professional"
            enabledStepIds={reassessmentId ? [
              ...(reassessHasRedflags ? ["redflags"] : []),
              ...(reassessHasAnamnesis ? ["anamnesis"] : []),
              ...(reassessHasQuestionnaire ? ["questionnaire"] : []),
              ...(hasFunctionalTests ? ["functional_tests"] : []),
              ...(reassessHasPsychosocial ? ["psychosocial"] : []),
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
            conflict={resumeConflict}
            onContinue={() => {
              setResumeConfirmed(true);
              setStep(resumeNextStep || "anamnesis");
            }}
            onRestart={() => {
              setResumeConfirmed(false);
              clearAssessmentProgress(progressScopeKey);
              void clearAssessmentProgressRemote(progressScopeKey);
              setResumeConflict(null);
              setAnamnesisData(null);

              setQuestionnaireResults([]);
              setAssessmentId(null);
              setRedFlagData(null);
              setResumeNextStep(null);
              setGenericResume(false);
              setStep(genericResume ? "patient_info" : "welcome");
            }}
            onNotMe={
              genericResume
                ? () => {
                    clearAssessmentProgress(progressScopeKey);
                    setResumeConflict(null);
                    setAnamnesisData(null);
                    setQuestionnaireResults([]);
                    setAssessmentId(null);
                    setRedFlagData(null);
                    setResumeNextStep(null);
                    setPatientName("");
                    setPatientEmail("");
                    setIdentityScope(null);
                    autoResumedRef.current = false;
                    setGenericResume(false);
                    setStep("patient_info");
                  }
                : undefined
            }
          />
        )}


        {step === "welcome" && professional && (
          <WelcomeStep
            mode="professional"
            professionalName={professional.full_name}
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

        {step === "patient_info" && professional && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto">
                <User className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {t("patient_info.title")}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {t("patient_info.desc").replace("{name}", professional.full_name)}
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

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("welcome")}
                className="rounded-xl gap-2 h-12 w-full sm:w-auto"
                size="lg"
              >
                <ArrowLeft className="h-4 w-4" />
                {language === "es" ? "Atrás" : language === "en" ? "Back" : "Voltar"}
              </Button>
              <Button
                onClick={handlePatientInfoContinue}
                disabled={!patientName.trim()}
                className="flex-1 rounded-xl gap-2 h-12 text-base font-semibold"
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
            onPass={() => { setRedFlagData({}); if (isPreventiveAssessment(anamnesisData) && anamnesisData) { void handleAnamnesisComplete(anamnesisData, true); } else setStep("anamnesis"); }}
            onFlagged={() => setStep("redflag_continue")}
            onFlaggedWithData={handleRedFlagged}
            onBack={() => setStep("patient_info")}
          />
        )}
        {step === "redflag_continue" && redFlagData && (
          <RedFlagContinueScreen
            flaggedItems={redFlagData}
            professionalName={professional?.full_name}
            onContinue={() => { if (isPreventiveAssessment(anamnesisData) && anamnesisData) void handleAnamnesisComplete(anamnesisData, true); else setStep("anamnesis"); }}
            onEnd={handleRedFlagEnd}
          />
        )}
        {step === "redflag_alert" && (
          <RedFlagAlert
            mode="professional"
            flaggedItems={redFlagData || undefined}
            professionalName={professional?.full_name}
          />
        )}

        {step === "anamnesis" && (
          <AnamnesisForm
            mode="professional"
            onComplete={handleAnamnesisComplete}
            onBack={() => reassessmentId ? setStep("patient_info") : setStep("redflags")}
            draftScopeKey={progressScopeKey}
            autoRestoreDraft={resumeConfirmed}
            initialPainRegions={prefilledRegions}
            initialChiefComplaints={prefilledComplaints}
            initialOnset={prefilledOnset}
            initialHasPriorSurgery={prefilledSurgery}
            initialSurgeryDetails={prefilledSurgeryDetails}
            initialActivityLevel={prefilledActivityLevel}
            initialHasGymAccess={prefilledGymAccess}
            initialExtras={prefilledExtras}
            previousPainScore={previousPainScore}
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
            painScoresPerRegion={(anamnesisData as any).painScoresPerRegion}
            generalPainScore={anamnesisData.painScore}
          />
        )}

        {step === "functional_tests" && anamnesisData && (
          <FunctionalTests
            painRegions={anamnesisData.painRegions}
            onComplete={handleFunctionalTestsDone}
            onBack={() => setStep(shouldCollectPainQuestionnaires(anamnesisData, reassessHasQuestionnaire) ? "questionnaire" : "anamnesis")}
            hasQuestionnaires={questionnaireResults.length > 0}
            optional
            onSkip={() => handleFunctionalTestsDone([])}
          />
        )}

        {step === "psychosocial" && (
          <PsychosocialStep
            questionnaireIds={extraQuestionnaireIds}
            onComplete={(r) => finishAfterPsychosocial(r)}
            onBack={() => setStep(shouldCollectPainSelfTests(anamnesisData, hasFunctionalTests) ? "functional_tests" : shouldCollectPainQuestionnaires(anamnesisData, reassessHasQuestionnaire) ? "questionnaire" : "anamnesis")}
          />
        )}

        {step === "loading" && (
          <ClinicalThinkingSkeleton phase="diagnosis" lang={language} />
        )}

        {step === "diagnosis_error" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {language === "pt" ? "Obrigado! Avaliação enviada" : "Thank you! Assessment sent"}
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {language === "pt"
                ? "Suas respostas foram registradas com segurança. O profissional já recebeu sua avaliação no sistema e irá analisá-la."
                : "Your answers were safely recorded. The professional has received your assessment and will review it."}
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-4">
              <Button onClick={() => navigate("/")} variant="outline" className="rounded-xl">
                {t("redflag_alert.back")}
              </Button>
            </div>
          </motion.div>
        )}


        {step === "thank_you" && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">{t("pro.thankyou_title")}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {t("pro.thankyou_desc").replace("{name}", professional?.full_name || "")}
            </p>

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

export default ProfessionalAssessment;
