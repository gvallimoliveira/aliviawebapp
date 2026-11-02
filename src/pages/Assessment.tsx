import { isPreventiveAssessment, shouldCollectFunctionalQuestionnaires } from "@/lib/assessmentPurpose";
import { useState, useEffect, useRef, useCallback } from "react";
import logoAlivia from "@/assets/logo-alivia.png";
import { PREMIUM_PRICE, PREMIUM_PRICE_FORMATTED, PREMIUM_SINGLE_PRICE, PREMIUM_SINGLE_PRICE_FORMATTED } from "@/constants/pricing";
import { useParams, useNavigate } from "react-router-dom";
import { Globe, ArrowLeft, Loader2, CreditCard, Shield, Sparkles, MessageCircle, Send, ChevronRight, Calendar, Zap, Check, CheckCircle, Star, Activity, FileText, TrendingUp, ClipboardList, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import RedFlagScreening from "@/components/assessment/RedFlagScreening";
import RedFlagAlert from "@/components/assessment/RedFlagAlert";
import AnamnesisForm, { type AnamnesisData } from "@/components/assessment/AnamnesisForm";
import FunctionalTests, { type TestResult } from "@/components/assessment/FunctionalTests";
import DiagnosisResult from "@/components/assessment/DiagnosisResult";
import TreatmentPlan from "@/components/assessment/TreatmentPlan";
import QuestionnaireStep from "@/components/assessment/QuestionnaireStep";
import AssessmentStepper from "@/components/assessment/AssessmentStepper";
import ClinicalThinkingSkeleton from "@/components/assessment/ClinicalThinkingSkeleton";
import WelcomeStep from "@/components/assessment/WelcomeStep";
import { type QuestionnaireResult } from "@/data/questionnaireData";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import OfflineBanner from "@/components/assessment/OfflineBanner";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { saveDraft, getDraft, clearDraft } from "@/lib/sessionPersistence";
import { buildRedFlagPayload, type RedFlagPayload } from "@/lib/redFlags";
import { painExtentValue } from "@/lib/painExtent";
import { buildMechanismPayload } from "@/components/assessment/PainMechanismLite";

type AssessmentStep = "payment_check" | "welcome" | "redflags" | "redflag_alert" | "anamnesis" | "questionnaire" | "functional_tests" | "final_notes" | "loading" | "low_confidence" | "result" | "loading_treatment" | "treatment";

const UPGRADE_KEY = "alivia-basic-upgrade-data";
const UPGRADE_EXPIRY_KEY = "alivia-basic-upgrade-expiry";

// Steps that are NOT safe to restore (transient/loading or terminal flows that
// would re-trigger network calls or skip user confirmation).
const NON_RESUMABLE_STEPS: AssessmentStep[] = [
  "payment_check",
  "loading",
  "loading_treatment",
];

interface AssessmentDraft {
  kind: "assessment";
  mode: "basic" | "premium";
  step: AssessmentStep;
  anamnesisData: AnamnesisData | null;
  testResults: TestResult[];
  questionnaireResults: QuestionnaireResult[];
  diagnosis: any;
  treatmentPlan: any;
  assessmentId: string | null;
  additionalInfo: string;
  hasRetried: boolean;
  capturedEmail: string | null;
  capturedName: string | null;
  isUpgradeFlow: boolean;
  /** Probatory red-flag screening carried across resumes so it never gets lost. */
  redFlagAnswers?: Record<string, boolean>;
  redFlagPayload?: any;
}

const getUpgradeData = () => {
  // Try sessionStorage first, then localStorage with TTL
  let raw = sessionStorage.getItem(UPGRADE_KEY);
  if (!raw) {
    const expiry = localStorage.getItem(UPGRADE_EXPIRY_KEY);
    if (expiry && Date.now() < Number(expiry)) {
      raw = localStorage.getItem(UPGRADE_KEY);
    } else {
      localStorage.removeItem(UPGRADE_KEY);
      localStorage.removeItem(UPGRADE_EXPIRY_KEY);
    }
  }
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

const clearUpgradeData = () => {
  sessionStorage.removeItem(UPGRADE_KEY);
  localStorage.removeItem(UPGRADE_KEY);
  localStorage.removeItem(UPGRADE_EXPIRY_KEY);
};

const Assessment = () => {
  const { type } = useParams<{ type: string }>();
  const mode = type === "premium" ? "premium" : "basic";
  const { t, language, toggleLanguage } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<AssessmentStep>(mode === "premium" ? "payment_check" : "welcome");
  const [anamnesisData, setAnamnesisData] = useState<AnamnesisData | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [questionnaireResults, setQuestionnaireResults] = useState<QuestionnaireResult[]>([]);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [treatmentPlan, setTreatmentPlan] = useState<any>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [hasRetried, setHasRetried] = useState(false);
  const [isMonthly, setIsMonthly] = useState(true);
  const [capturedEmail, setCapturedEmail] = useState<string | null>(null);
  const [capturedName, setCapturedName] = useState<string | null>(null);
  const [isUpgradeFlow, setIsUpgradeFlow] = useState(false);
  const [premiumAccess, setPremiumAccess] = useState<{ has_access: boolean; can_redo: boolean; assessments_used?: number; max_assessments?: number; payment_id?: string; available_discount?: { discount_percent: number } | null } | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  // Premium pre-payment red-flag screening. "screening" gates the paywall; "blocked" shows guidance; "passed" unlocks the normal premium flow.
  const [premiumPreScreen, setPremiumPreScreen] = useState<"screening" | "blocked" | "passed">(
    mode === "premium" ? "screening" : "passed",
  );
  // Probatory record of what the user answered on the red-flag screening (persisted on assessments.red_flags).
  const [redFlagAnswers, setRedFlagAnswers] = useState<Record<string, boolean>>({});
  const [redFlagPayload, setRedFlagPayload] = useState<RedFlagPayload | null>(null);
  // Hypothesis generated by the free/basic assessment, carried into the premium flow
  // so the AI keeps the same diagnostic line (or explains why it changed).
  const [previousBasicDiagnosis, setPreviousBasicDiagnosis] = useState<any>(null);
  // Offline mode: track network and queue AI calls that need to wait.
  const online = useOnlineStatus();
  // "diagnosis" = run generateDiagnosis once back online (uses last anamnesis+tests)
  // "treatment" = run generateTreatmentPlan once back online
  const [pendingAIAction, setPendingAIAction] = useState<null | "diagnosis" | "treatment">(null);
  const [extraQuestionnaireRegions, setExtraQuestionnaireRegions] = useState<string[]>([]);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const inFlightDiagnosisRef = useRef(false);

  // ----- Auto-save / resume draft (6h TTL via sessionPersistence) -----
  // Restore on first mount: if there's a draft for this same mode and the
  // step is resumable, hydrate the React state and jump straight back to it.
  useEffect(() => {
    if (draftRestored) return;
    try {
      const draft = getDraft<AssessmentDraft>();
      if (!draft || draft.kind !== "assessment" || draft.mode !== mode) {
        setDraftRestored(true);
        return;
      }
      if (NON_RESUMABLE_STEPS.includes(draft.step)) {
        setDraftRestored(true);
        return;
      }
      if (draft.anamnesisData) setAnamnesisData(draft.anamnesisData);
      if (draft.testResults?.length) setTestResults(draft.testResults);
      if (draft.questionnaireResults?.length) setQuestionnaireResults(draft.questionnaireResults);
      if (draft.diagnosis) setDiagnosis(draft.diagnosis);
      if (draft.treatmentPlan) setTreatmentPlan(draft.treatmentPlan);
      if (draft.assessmentId) setAssessmentId(draft.assessmentId);
      if (draft.additionalInfo) setAdditionalInfo(draft.additionalInfo);
      if (draft.hasRetried) setHasRetried(draft.hasRetried);
      if (draft.capturedEmail) setCapturedEmail(draft.capturedEmail);
      if (draft.capturedName) setCapturedName(draft.capturedName);
      if (draft.isUpgradeFlow) setIsUpgradeFlow(draft.isUpgradeFlow);
      if (draft.redFlagAnswers && Object.keys(draft.redFlagAnswers).length) setRedFlagAnswers(draft.redFlagAnswers);
      if (draft.redFlagPayload) setRedFlagPayload(draft.redFlagPayload);
      setStep(draft.step);
      toast({
        title: language === "pt" ? "Avaliação retomada" : language === "es" ? "Evaluación reanudada" : "Assessment resumed",
        description:
          language === "pt"
            ? "Continuamos de onde você parou."
            : language === "es"
            ? "Continuamos donde lo dejaste."
            : "We picked up where you left off.",
      });
    } catch {
      /* ignore */
    } finally {
      setDraftRestored(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save: persist whenever meaningful assessment state changes. Skipped
  // until the initial restore pass is done so we don't overwrite a valid
  // draft with the empty initial state.
  //
  // Strategy (max safety, min jank):
  //  1. Debounce normal state changes by 800ms (≈ "pause typing / blur").
  //  2. Flush IMMEDIATELY on step transitions — never lose a completed step.
  //  3. Flush IMMEDIATELY on global blur / pagehide / visibilitychange so
  //     iOS/Android killing the PWA in the background still keeps the draft.
  const draftRef = useRef<AssessmentDraft | null>(null);
  const prevStepRef = useRef<AssessmentStep>(step);

  const flushDraft = useCallback(() => {
    const draft = draftRef.current;
    if (!draft) return;
    if (NON_RESUMABLE_STEPS.includes(draft.step)) return;
    if (draft.step === "welcome" || draft.step === "treatment") return;
    saveDraft(draft);
  }, []);

  useEffect(() => {
    if (!draftRestored) return;
    if (NON_RESUMABLE_STEPS.includes(step)) return;
    if (step === "welcome") return;
    if (step === "treatment") {
      clearDraft();
      draftRef.current = null;
      prevStepRef.current = step;
      return;
    }
    const draft: AssessmentDraft = {
      kind: "assessment",
      mode: mode as "basic" | "premium",
      step,
      anamnesisData,
      testResults,
      questionnaireResults,
      diagnosis,
      treatmentPlan,
      assessmentId,
      additionalInfo,
      hasRetried,
      capturedEmail,
      capturedName,
      isUpgradeFlow,
      redFlagAnswers,
      redFlagPayload,
    };
    draftRef.current = draft;

    // Step changed → flush immediately, no debounce.
    if (prevStepRef.current !== step) {
      prevStepRef.current = step;
      saveDraft(draft);
      return;
    }

    // Otherwise debounce field-level changes.
    const timer = setTimeout(() => saveDraft(draft), 800);
    return () => clearTimeout(timer);
  }, [
    draftRestored,
    mode,
    step,
    anamnesisData,
    testResults,
    questionnaireResults,
    diagnosis,
    treatmentPlan,
    assessmentId,
    additionalInfo,
    hasRetried,
    capturedEmail,
    capturedName,
    isUpgradeFlow,
    redFlagAnswers,
    redFlagPayload,
  ]);

  // Global flush triggers: any input blur, tab hidden, page hide, or unload.
  useEffect(() => {
    if (!draftRestored) return;
    const onBlur = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t as HTMLElement).isContentEditable) {
        flushDraft();
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flushDraft();
    };
    const onPageHide = () => flushDraft();

    document.addEventListener("focusout", onBlur, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("beforeunload", onPageHide);
    return () => {
      document.removeEventListener("focusout", onBlur, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("beforeunload", onPageHide);
    };
  }, [draftRestored, flushDraft]);

  // Auto-resume queued AI step when connection comes back.
  useEffect(() => {
    if (!online || !pendingAIAction) return;
    if (pendingAIAction === "diagnosis" && anamnesisData) {
      generateDiagnosis(anamnesisData, testResults, assessmentId);
    } else if (pendingAIAction === "treatment" && diagnosis) {
      generateTreatmentPlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, pendingAIAction]);

  // Redirect premium users to auth if not logged in
  useEffect(() => {
    if (!authLoading && mode === "premium" && !user) {
      toast({
        title: t("auth.required_title") || "Login necessário",
        description: t("auth.required_desc") || "Faça login para acessar a avaliação premium.",
        variant: "destructive",
      });
      navigate("/auth", { state: { redirectTo: `/assessment/premium` } });
    }
  }, [authLoading, mode, user, navigate]);

  // ----- Basic → Premium continuity -----
  // The basic flow already answered the red-flag screening and produced a first
  // hypothesis. Reuse both instead of asking the patient the same questions twice.
  useEffect(() => {
    if (mode !== "premium") return;
    const upgradeData = getUpgradeData();
    if (!upgradeData) return;

    if (upgradeData.basicDiagnosis?.hypothesis && !previousBasicDiagnosis) {
      setPreviousBasicDiagnosis(upgradeData.basicDiagnosis);
    }

    const carried = upgradeData.redFlagPayload as RedFlagPayload | undefined;
    if (!carried?.answers?.length) return;
    // Only reuse a recent, negative screening. Positive answers must keep the
    // existing block/reservation behaviour, so they are not auto-skipped.
    const answeredAt = new Date(carried.answered_at || 0).getTime();
    const fresh = Number.isFinite(answeredAt) && Date.now() - answeredAt < 6 * 60 * 60 * 1000;
    if (!fresh || carried.any_positive || carried.outcome !== "passed") return;

    const answers: Record<string, boolean> = {};
    carried.answers.forEach((a) => { answers[a.key] = a.answer === "yes"; });
    setRedFlagAnswers(answers);
    setRedFlagPayload({ ...carried, carried_from_basic: true } as any);
    setPremiumPreScreen("passed");
  }, [mode]);

  // Check premium payment status — only AFTER the red-flag pre-screening passes.
  useEffect(() => {
    if (mode === "premium" && user && step === "payment_check" && premiumPreScreen === "passed") {
      const exitIntentPending = sessionStorage.getItem("exit-intent-discount-pending");
      if (exitIntentPending) {
        sessionStorage.removeItem("exit-intent-discount-pending");
        handleExitIntentPayment();
      } else {
        checkPremiumAccess();
      }
    }
  }, [mode, user, step, premiumPreScreen]);

  const getBasicUpgradePayload = () => {
    const upgradeData = getUpgradeData();
    if (!upgradeData) return null;
    return {
      anamnesisData: upgradeData.anamnesisData || null,
      painRegions: upgradeData.painRegions || [],
      painScore: upgradeData.painScore ?? null,
      capturedName: upgradeData.capturedName || capturedName || null,
      capturedEmail: upgradeData.capturedEmail || capturedEmail || null,
      redFlagPayload: upgradeData.redFlagPayload || redFlagPayload || null,
      basicDiagnosis: upgradeData.basicDiagnosis || previousBasicDiagnosis || null,
    };
  };

  const handleExitIntentPayment = async () => {
    setPaymentLoading(true);
    try {
      const basicData = getBasicUpgradePayload();
      const { data, error } = await supabase.functions.invoke("create-payment", {
        body: {
          payment_type: "single",
          exit_intent_discount: true,
          ...(basicData ? { basic_upgrade_data: basicData } : {}),
        },
      });
      if (error) throw error;
      if (data?.url) {
        sessionStorage.setItem("exit-intent-discount-used", "true");
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Exit intent payment error:", err);
      checkPremiumAccess(); // fallback to normal flow
    } finally {
      setPaymentLoading(false);
    }
  };

  const checkPremiumAccess = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-payment", {
        body: { check_access: true },
      });
      if (error) throw error;
      setPremiumAccess(data);
      if (data?.has_access) {
        // Check for upgrade data: first from localStorage, then from DB (boleto flow)
        const upgradeData = getUpgradeData();
        if (upgradeData?.anamnesisData) {
          setAnamnesisData(upgradeData.anamnesisData);
          if (upgradeData.basicDiagnosis?.hypothesis) setPreviousBasicDiagnosis(upgradeData.basicDiagnosis);
          if (upgradeData.capturedName) setCapturedName(upgradeData.capturedName);
          if (upgradeData.capturedEmail) setCapturedEmail(upgradeData.capturedEmail);
          setIsUpgradeFlow(true);
          clearUpgradeData();

          const { data: newAssessment, error: insertError } = await supabase
            .from("assessments")
            .insert({
              type: "premium",
              status: "in_progress",
              user_id: user?.id || null,
              payment_status: "covered",
              anamnesis_data: upgradeData.anamnesisData as any,
              pain_regions: upgradeData.painRegions || [],
              pain_extent: painExtentValue(upgradeData.painRegions || []),
              pain_score: upgradeData.painScore ?? null,
              patient_name: upgradeData.capturedName || null,
              patient_email: upgradeData.capturedEmail || null,
              red_flags: (upgradeData.redFlagPayload
                ? { ...upgradeData.redFlagPayload, carried_from_basic: true }
                : redFlagPayload) as any,
            })
            .select("id")
            .single();
          if (!insertError && newAssessment) {
            setAssessmentId(newAssessment.id);
          }
          setStep("questionnaire");
          return;
        }

        // Check DB for paid assessment with basic data already saved (boleto flow)
        if (user?.id) {
          const { data: paidWithData } = await supabase
            .from("assessments")
            .select("id, pending_upgrade_data, anamnesis_data, pain_regions, pain_score, patient_name, patient_email")
            .eq("user_id", user.id)
            .eq("type", "premium")
            .eq("payment_status", "paid")
            .eq("status", "in_progress")
            .not("anamnesis_data", "eq", "{}")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (paidWithData && paidWithData.anamnesis_data) {
            const restored = paidWithData.anamnesis_data as any;
            const pending = (paidWithData.pending_upgrade_data || null) as any;
            if (pending?.basicDiagnosis?.hypothesis) setPreviousBasicDiagnosis(pending.basicDiagnosis);
            if (pending?.redFlagPayload?.answers?.length && !pending.redFlagPayload.any_positive) {
              const answers: Record<string, boolean> = {};
              pending.redFlagPayload.answers.forEach((a: any) => { answers[a.key] = a.answer === "yes"; });
              setRedFlagAnswers(answers);
              setRedFlagPayload({ ...pending.redFlagPayload, carried_from_basic: true } as any);
              await supabase
                .from("assessments")
                .update({ red_flags: { ...pending.redFlagPayload, carried_from_basic: true } as any })
                .eq("id", paidWithData.id);
            }
            // Check if it has meaningful anamnesis data (not just empty object)
            const hasData = restored.painRegions?.length > 0 || restored.name || restored.age || restored.painScore;
            if (hasData) {
              setAnamnesisData(restored);
              if (paidWithData.patient_name) setCapturedName(paidWithData.patient_name);
              if (paidWithData.patient_email) setCapturedEmail(paidWithData.patient_email);
              setIsUpgradeFlow(true);
              setAssessmentId(paidWithData.id);
              setStep("questionnaire");
              return;
            }
          }
        }

        setStep("welcome");
      }
    } catch (err) {
      console.error("Error checking premium access:", err);
      setPremiumAccess({ has_access: false, can_redo: false });
    }
  };

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      const referralCode = localStorage.getItem("alivia_referral_code");
      const basicData = getBasicUpgradePayload();
      const body: any = {
        payment_type: isMonthly ? "monthly" : "single",
        ...(basicData ? { basic_upgrade_data: basicData } : {}),
      };
      if (referralCode) body.referral_code = referralCode;

      const { data, error } = await supabase.functions.invoke("create-payment", {
        body,
      });
      if (error) throw error;
      if (data?.url) {
        if (referralCode) localStorage.removeItem("alivia_referral_code");
        const w = window.open(data.url, '_blank');
        if (!w) window.location.href = data.url;
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast({
        title: t("payment.error_title") || "Erro no pagamento",
        description: t("payment.error_desc") || "Não foi possível iniciar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  /**
   * Red-flag screening payload to persist. Falls back to rebuilding it from the
   * raw answers so a resumed/restored session never saves an assessment without
   * its probatory screening record (needed by the PDF report).
   */
  const resolveRedFlagPayload = (): RedFlagPayload | null => {
    if (redFlagPayload) return redFlagPayload;
    if (Object.keys(redFlagAnswers).length === 0) return null;
    const anyPositive = Object.values(redFlagAnswers).some(Boolean);
    return buildRedFlagPayload(
      redFlagAnswers,
      language,
      anyPositive ? "continued_under_reservation" : "passed",
    );
  };

  const createAssessment = async () => {
    if (assessmentId) return assessmentId;
    try {
      const newId = crypto.randomUUID();
      const { data, error } = await supabase
        .from("assessments")
        .insert({
          id: newId,
          type: mode,
          status: "in_progress",
          user_id: user?.id || null,
          patient_name: capturedName || user?.user_metadata?.full_name || null,
          patient_email: capturedEmail || user?.email || null,
          payment_status: mode === "premium" ? "covered" : "pending",
          original_assessment_id: mode === "premium" ? premiumAccess?.payment_id || null : null,
          red_flags: resolveRedFlagPayload() as any,
        })
        .select("id")
        .single()
        .setHeader("x-assessment-id", newId);
      if (error) throw error;
      setAssessmentId(data.id);
      return data.id;
    } catch (err) {
      console.error("Error creating assessment:", err);
      const message = err && typeof err === "object" && "message" in err ? String(err.message) : "";
      toast({
        title: t("diagnosis.error_title"),
        description: message.includes("free_assessment_limit")
          ? t("assessment.free_limit")
          : message.includes("basic_assessment_email_required")
            ? t("assessment.email_required") : t("diagnosis.error_desc"),
        variant: "destructive",
      });
      return null;
    }
  };

  const updateAssessment = async (id: string, updates: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from("assessments")
        .update(updates)
        .eq("id", id)
        .setHeader("x-assessment-id", id);
      if (error) throw error;
    } catch (err) {
      console.error("Error updating assessment:", err);
    }
  };

  const handleAnamnesisComplete = async (data: AnamnesisData) => {
    setAnamnesisData(data);
    const id = await createAssessment();
    if (!id) return;
    if (id) {
      await updateAssessment(id, {
        anamnesis_data: data as any,
        pain_regions: isPreventiveAssessment(data) ? [] : data.painRegions,
        pain_extent: isPreventiveAssessment(data) ? null : painExtentValue(data.painRegions),
        pain_score: isPreventiveAssessment(data) ? null : data.painScore,
        ...buildMechanismPayload(data),
      });
    }
    if (isPreventiveAssessment(data) && mode === "premium" && shouldCollectFunctionalQuestionnaires(data)) {
      setQuestionnaireResults([]);
      setTestResults([]);
      setExtraQuestionnaireRegions([]);
      setStep("questionnaire");
      return;
    }
    if (isPreventiveAssessment(data)) {
      setQuestionnaireResults([]);
      setTestResults([]);
      if (mode === "premium") setStep("final_notes");
      else generateDiagnosis(data, [], id);
      return;
    }
    if (mode === "premium") {
      // Detect functional limitation context for the 3rd questionnaire rule.
      const note = (data as any).functionalLimitationNote?.trim?.() || additionalInfo.trim();
      if (note && data.painRegions.length >= 3) {
        try {
          const { data: detect } = await supabase.functions.invoke("detect-functional-limitation", {
            body: {
              note,
              painRegions: data.painRegions,
              painScoresPerRegion: data.painScoresPerRegion || {},
              language,
              assessmentId: id || assessmentId,
            },
          });
          if (Array.isArray(detect?.regions)) setExtraQuestionnaireRegions(detect.regions);
        } catch (err) {
          console.error("detect-functional-limitation failed (non-blocking):", err);
        }
      } else {
        setExtraQuestionnaireRegions([]);
      }
      setStep("questionnaire");
    } else {
      generateDiagnosis(data, [], id);
    }
  };

  const handleQuestionnaireComplete = async (results: QuestionnaireResult[]) => {
    setQuestionnaireResults(results);
    if (assessmentId && results.length > 0) {
      await updateAssessment(assessmentId, { test_results: results as any });
    }
    setStep(isPreventiveAssessment(anamnesisData) ? "final_notes" : "functional_tests");
  };

  const handleQuestionnaireSkip = () => {
    setStep(isPreventiveAssessment(anamnesisData) ? "final_notes" : "functional_tests");
  };

  const handleTestsComplete = async (results: TestResult[]) => {
    setTestResults(results);
    const combinedResults = [...questionnaireResults, ...results];
    if (assessmentId) {
      await updateAssessment(assessmentId, { test_results: combinedResults as any });
    }
    if (mode === "premium") {
      setStep("final_notes");
    } else {
      generateDiagnosis(anamnesisData!, results, assessmentId);
    }
  };

  const handleFinalize = async () => {
    if (isFinalizing) return;
    setIsFinalizing(true);
    const extra = additionalInfo.trim();
    const dataWithNote = extra
      ? ({ ...anamnesisData!, additionalInfo: extra } as any)
      : anamnesisData!;
    if (extra) setAnamnesisData(dataWithNote);
    await generateDiagnosis(dataWithNote, testResults, assessmentId, extra || undefined);
    setIsFinalizing(false);
  };

  const generateDiagnosis = async (data: AnamnesisData, tests: TestResult[], currentAssessmentId?: string | null, extraInfo?: string) => {
    if (inFlightDiagnosisRef.current) return;
    // Offline guard — keep the user on the previous step and queue.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setPendingAIAction("diagnosis");
      toast({
        title: language === "pt" ? "Sem conexão" : language === "es" ? "Sin conexión" : "Offline",
        description:
          language === "pt"
            ? "Vamos gerar sua hipótese preliminar assim que a internet voltar."
            : language === "es"
            ? "Generaremos tu hipótesis preliminar cuando vuelva la conexión."
            : "We'll generate your preliminary hypothesis as soon as you're back online.",
      });
      return;
    }
    inFlightDiagnosisRef.current = true;
    setStep("loading");
    try {
      const bodyData: any = { anamnesisData: data, testResults: tests, questionnaireResults, mode, language, assessmentId: currentAssessmentId || assessmentId };
      // Passo D1 — mecanismo/extensão de dor como contexto clínico para a IA.
      const mechPayload = buildMechanismPayload(data as any);
      if (mechPayload.pain_mechanism) bodyData.painMechanism = mechPayload.pain_mechanism;
      bodyData.painExtent = painExtentValue((data as any).painRegions);
      if (mode === "premium" && previousBasicDiagnosis?.hypothesis) {
        bodyData.previousBasicDiagnosis = previousBasicDiagnosis;
      }
      if (extraInfo) {
        bodyData.additionalInfo = extraInfo;
      }
      const { data: result, error } = await supabase.functions.invoke("generate-diagnosis", {
        body: bodyData,
      });
      if (error) throw error;
      setPendingAIAction(null);
      setDiagnosis(result.diagnosis);
      const id = currentAssessmentId || assessmentId;
      if (id) {
        const rf = resolveRedFlagPayload();
        await updateAssessment(id, {
          diagnosis: result.diagnosis as any,
          status: "diagnosis_complete",
          // Safety net: guarantees the screening record exists on the saved
          // assessment even if the flow was resumed after the screening step.
          ...(rf ? { red_flags: rf as any } : {}),
          ...(capturedName || user?.user_metadata?.full_name
            ? { patient_name: capturedName || user?.user_metadata?.full_name }
            : {}),
        });
      }
      if (result.diagnosis.confidence === "low" && !hasRetried && !extraInfo) {
        setStep("low_confidence");
      } else {
        setStep("result");
      }
      // Persist assessmentId so user can return after sharing via WhatsApp
      if (id) {
        sessionStorage.setItem("alivia-last-assessment-id", id);
      }
    } catch (err: any) {
      console.error("Diagnosis error:", err);
      // Network failure that slipped past navigator.onLine — queue it.
      const isNetworkErr = err?.message?.toLowerCase?.().includes("network") || err?.message?.toLowerCase?.().includes("fetch");
      if (isNetworkErr || (typeof navigator !== "undefined" && !navigator.onLine)) {
        setPendingAIAction("diagnosis");
        setStep(mode === "premium" ? "final_notes" : "anamnesis");
        return;
      }
      toast({
        title: t("diagnosis.error_title"),
        description: t("diagnosis.error_desc"),
        variant: "destructive",
      });
      setStep(mode === "premium" ? "final_notes" : "anamnesis");
    } finally {
      inFlightDiagnosisRef.current = false;
    }
  };

  const handleLowConfidenceSubmit = () => {
    setHasRetried(true);
    if (additionalInfo.trim()) {
      const updatedAnamnesis = {
        ...anamnesisData!,
        additionalInfo: additionalInfo.trim(),
      };
      setAnamnesisData(updatedAnamnesis);
      generateDiagnosis(updatedAnamnesis, testResults, assessmentId, additionalInfo.trim());
    } else {
      setStep("result");
    }
  };

  const handleLowConfidenceSkip = () => {
    setHasRetried(true);
    setStep("result");
  };

  const generateTreatmentPlan = async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setPendingAIAction("treatment");
      toast({
        title: language === "pt" ? "Sem conexão" : language === "es" ? "Sin conexión" : "Offline",
        description:
          language === "pt"
            ? "Vamos gerar seu plano assim que a internet voltar."
            : language === "es"
            ? "Generaremos tu plan cuando vuelva la conexión."
            : "We'll generate your plan as soon as you're back online.",
      });
      return;
    }
    setStep("loading_treatment");
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-treatment", {
        body: { anamnesisData, testResults, questionnaireResults, diagnosis, mode, language, assessmentId },
      });
      if (error) throw error;
      setPendingAIAction(null);
      setTreatmentPlan(result.treatmentPlan);
      if (assessmentId) {
        await updateAssessment(assessmentId, { treatment_plan: result.treatmentPlan as any, status: "completed" });
      }
      setStep("treatment");
    } catch (err: any) {
      console.error("Treatment plan error:", err);
      const isNetworkErr = err?.message?.toLowerCase?.().includes("network") || err?.message?.toLowerCase?.().includes("fetch");
      if (isNetworkErr || (typeof navigator !== "undefined" && !navigator.onLine)) {
        setPendingAIAction("treatment");
        setStep("result");
        return;
      }
      toast({
        title: t("treatment.error_title"),
        description: t("treatment.error_desc"),
        variant: "destructive",
      });
      setStep("result");
    }
  };

  const currentPrice = isMonthly ? PREMIUM_PRICE : PREMIUM_SINGLE_PRICE;
  const currentPriceFormatted = isMonthly ? PREMIUM_PRICE_FORMATTED : PREMIUM_SINGLE_PRICE_FORMATTED;

  if (authLoading && mode === "premium") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <button
            onClick={() => navigate(user ? "/dashboard" : "/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
            <span className="text-xl font-bold text-foreground">Aliv.iA</span>
          </button>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${mode === "premium" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}`}>
              {mode === "premium" ? "Premium" : t("compare.basic")}
            </span>
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
              <Globe className="h-4 w-4" />
              {t("nav.language")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-8 px-4">
        <OfflineBanner online={online} pendingResume={online && !!pendingAIAction} />
        {step !== "payment_check" && step !== "welcome" && (
          <AssessmentStepper currentStep={step} mode={mode as "basic" | "premium"} />
        )}

        {step === "welcome" && (
          <WelcomeStep
            mode={mode as "basic" | "premium"}
            onContinue={(data) => {
              if (data?.email) setCapturedEmail(data.email);
              if (data?.name) setCapturedName(data.name);
              // If premium already passed the pre-payment screening, skip the second run.
              setStep(redFlagPayload?.outcome === "passed" ? "anamnesis" : "redflags");
            }}
            onRestart={() => {
              // Wipe the auto-saved draft and reset every piece of the
              // in-memory assessment so the user starts truly from scratch.
              clearDraft();
              setAnamnesisData(null);
              setTestResults([]);
              setQuestionnaireResults([]);
              setDiagnosis(null);
              setTreatmentPlan(null);
              setAssessmentId(null);
              setAdditionalInfo("");
              setHasRetried(false);
              setCapturedEmail(null);
              setCapturedName(null);
              setIsUpgradeFlow(false);
              setExtraQuestionnaireRegions([]);
              setPendingAIAction(null);
              setStep("welcome");
              toast({
                title: language === "pt" ? "Autoavaliação reiniciada" : language === "es" ? "Autoevaluación reiniciada" : "Self-assessment restarted",
                description: language === "pt"
                  ? "Recomeçamos do zero."
                  : language === "es"
                  ? "Comenzamos desde cero."
                  : "We've started over from scratch.",
              });
            }}
          />
        )}

        {step === "payment_check" && mode === "premium" && premiumPreScreen === "screening" && (
          <RedFlagScreening
            initialAnswers={redFlagAnswers}
            introOverride={
              language === "pt"
                ? "Antes de iniciar, 5 perguntas rápidas para garantir que a autoavaliação é segura para você agora. Você não será cobrado(a) até concluirmos esta etapa."
                : language === "es"
                ? "Antes de comenzar, 5 preguntas rápidas para asegurar que la autoevaluación es segura para usted ahora. No se le cobrará hasta completar esta etapa."
                : "Before we start, 5 quick questions to make sure the self-assessment is safe for you right now. You won't be charged until this step is complete."
            }
            onAnswered={(ans) => setRedFlagAnswers(ans)}
            onPass={(ans) => {
              const finalAns = ans || redFlagAnswers;
              const payload = buildRedFlagPayload(finalAns, language, "passed");
              setRedFlagAnswers(finalAns);
              setRedFlagPayload(payload);
              setPremiumPreScreen("passed");
            }}
            onFlaggedWithData={async (ans) => {
              const payload = buildRedFlagPayload(ans, language, "blocked_premium_payment");
              setRedFlagAnswers(ans);
              setRedFlagPayload(payload);
              setPremiumPreScreen("blocked");
              if (user?.id) {
                try {
                  await supabase.from("assessments").insert({
                    type: "premium",
                    status: "red_flagged",
                    user_id: user.id,
                    patient_email: user.email || null,
                    payment_status: "pending",
                    red_flags: payload as any,
                  });
                } catch (err) {
                  console.error("Failed to record red-flag block:", err);
                }
              }
            }}
            onFlagged={() => setPremiumPreScreen("blocked")}
            onBack={() => navigate("/")}
          />
        )}

        {step === "payment_check" && mode === "premium" && premiumPreScreen === "blocked" && (
          <RedFlagAlert
            flaggedItems={redFlagAnswers}
            onReview={() => setPremiumPreScreen("screening")}
            onSeekHelp={() => navigate("/professional-search")}
          />
        )}

        {step === "payment_check" && premiumPreScreen === "passed" && premiumAccess !== null && !premiumAccess.has_access && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* Hero section */}
            <div className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mx-auto"
              >
                <Sparkles className="h-8 w-8 text-primary" />
              </motion.div>

              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                {premiumAccess.assessments_used && premiumAccess.assessments_used >= 2
                  ? (t("payment.limit_reached_title") || "Limite de avaliações atingido")
                  : (t("payment.unlock_title") || "Desbloqueie sua avaliação completa")}
              </h2>
              <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
                {premiumAccess.assessments_used && premiumAccess.assessments_used >= 2
                  ? (t("payment.limit_reached_desc") || "Você já realizou 2 avaliações neste período. Faça um novo pagamento para continuar.")
                  : (t("payment.unlock_desc") || "Inclui anamnese completa, testes funcionais, hipótese preliminar detalhada com explicação e plano de tratamento personalizado por fases.")}
              </p>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: ClipboardList, label: t("payment.feature_5") || "Questionários validados (KOOS, SPADI, ODI)", color: "text-primary" },
                { icon: Activity, label: t("payment.feature_1") || "Testes funcionais guiados por vídeo", color: "text-primary" },
                { icon: FileText, label: t("payment.feature_2") || "Hipótese preliminar com explicação detalhada", color: "text-primary" },
                { icon: TrendingUp, label: t("payment.feature_3") || "Plano de tratamento em 3 fases", color: "text-primary" },
                { icon: Star, label: t("payment.feature_4") || "Exercícios com vídeos do YouTube", color: "text-primary" },
                { icon: Shield, label: language === "pt" ? "Dados seguros e criptografados" : language === "es" ? "Datos seguros y encriptados" : "Secure & encrypted data", color: "text-primary" },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-3 rounded-xl bg-card border border-border/50 p-3"
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                    <feature.icon className={`h-4 w-4 ${feature.color}`} />
                  </div>
                  <span className="text-sm text-foreground font-medium">{feature.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Plan toggle */}
            <div className="flex items-center justify-center gap-4 py-1">
              <button
                onClick={() => setIsMonthly(true)}
                className={`relative px-4 py-2 rounded-xl text-sm font-semibold transition-all ${isMonthly ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                <Calendar className="inline h-3.5 w-3.5 mr-1.5" />
                {t("compare.toggle.monthly")}
                {isMonthly && (
                  <span className="absolute -top-2 -right-2 text-[10px] font-bold bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full">
                    {language === "pt" ? "Popular" : "Best"}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsMonthly(false)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${!isMonthly ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:text-foreground"}`}
              >
                <Zap className="inline h-3.5 w-3.5 mr-1.5" />
                {t("compare.toggle.single")}
              </button>
            </div>

            {/* Pricing card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="rounded-2xl border-primary/20 overflow-hidden max-w-md mx-auto shadow-lg shadow-primary/5">
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b border-primary/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-primary uppercase tracking-wider">
                        {isMonthly ? (language === "pt" ? "Plano Mensal" : "Monthly Plan") : (language === "pt" ? "Pagamento Único" : "One-time")}
                      </p>
                      {premiumAccess.available_discount ? (
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-lg text-muted-foreground line-through">{currentPriceFormatted}</span>
                          <span className="text-3xl font-bold text-foreground">
                            R$ {Math.round(currentPrice * (1 - premiumAccess.available_discount.discount_percent / 100))}
                          </span>
                        </div>
                      ) : (
                        <p className="text-3xl font-bold text-foreground mt-1">{currentPriceFormatted}</p>
                      )}
                    </div>
                    {premiumAccess.available_discount && (
                      <Badge className="bg-accent/10 text-accent-foreground border-accent/20 text-xs">
                        -{premiumAccess.available_discount.discount_percent}%
                      </Badge>
                    )}
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {isMonthly
                      ? (t("payment.includes_redo") || "Assinatura mensal — 2 avaliações por ciclo")
                      : (t("payment.single_desc") || "Pagamento único — 1 avaliação completa")}
                  </p>

                  {isMonthly && (
                    <div className="rounded-xl bg-primary/5 border border-primary/10 p-3.5 space-y-2">
                      <p className="font-semibold text-primary text-sm flex items-center gap-1.5">
                        <Star className="h-4 w-4" />
                        {t("compare.monthly.benefits_title")}
                      </p>
                      {[
                        t("compare.monthly.benefit_1"),
                        t("compare.monthly.benefit_2"),
                        t("compare.monthly.benefit_3"),
                        t("compare.monthly.benefit_4"),
                      ].map((b, i) => (
                        <p key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                          {b}
                        </p>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={handlePayment}
                    disabled={paymentLoading}
                    className="w-full rounded-xl gap-2 h-12 text-base font-semibold shadow-md hover:shadow-lg transition-shadow"
                    size="lg"
                  >
                    {paymentLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <CreditCard className="h-5 w-5" />
                    )}
                    {t("payment.pay_now") || "Pagar e começar"}
                  </Button>

                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-1">
                    <Lock className="h-3 w-3" />
                    {language === "pt" ? "Pagamento seguro via Stripe" : language === "es" ? "Pago seguro con Stripe" : "Secure payment via Stripe"}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {step === "payment_check" && premiumPreScreen === "passed" && premiumAccess === null && (
          <div className="text-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground mt-4">{t("payment.checking") || "Verificando acesso..."}</p>
          </div>
        )}

        {step === "redflags" && (
          <RedFlagScreening
            initialAnswers={redFlagAnswers}
            onAnswered={(ans) => setRedFlagAnswers(ans)}
            onPass={(ans) => {
              const finalAns = ans || redFlagAnswers;
              setRedFlagAnswers(finalAns);
              setRedFlagPayload(buildRedFlagPayload(finalAns, language, "passed"));
              setStep("anamnesis");
            }}
            onFlaggedWithData={(ans) => {
              setRedFlagAnswers(ans);
              setRedFlagPayload(buildRedFlagPayload(ans, language, "continued_under_reservation"));
              setStep("redflag_alert");
            }}
            onFlagged={() => setStep("redflag_alert")}
            onBack={() => setStep("welcome")}
          />
        )}
        {step === "redflag_alert" && (
          <RedFlagAlert
            flaggedItems={redFlagAnswers}
            onReview={() => setStep("redflags")}
            onSeekHelp={() => navigate("/professional-search")}
          />
        )}
        {step === "anamnesis" && (
          <AnamnesisForm
            mode={mode}
            onComplete={handleAnamnesisComplete}
            onBack={() => setStep("redflags")}
            draftScopeKey={`self:${mode}:${user?.id || "anon"}`}
          />
        )}
        {step === "questionnaire" && anamnesisData && (
          <>
            {isUpgradeFlow && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700"
              >
                <CheckCircle className="h-4 w-4 shrink-0" />
                {language === "pt"
                  ? "Seus dados da avaliação básica foram aproveitados. Continue de onde parou."
                  : "Your basic assessment data has been imported. Continue where you left off."}
              </motion.div>
            )}
            <QuestionnaireStep
              painRegions={isPreventiveAssessment(anamnesisData) ? ((anamnesisData as any).historyRegions || []) : anamnesisData.painRegions}
              functionalOnly={isPreventiveAssessment(anamnesisData)}
              onComplete={handleQuestionnaireComplete}
              onBack={() => { if (!isUpgradeFlow) setStep("anamnesis"); }}
              onSkip={handleQuestionnaireSkip}
              painScoresPerRegion={anamnesisData.painScoresPerRegion}
              generalPainScore={anamnesisData.painScore}
              extraQuestionnaireRegions={extraQuestionnaireRegions}
            />
          </>
        )}
        {step === "functional_tests" && anamnesisData && (
          <FunctionalTests
            painRegions={anamnesisData.painRegions}
            onComplete={handleTestsComplete}
            onBack={() => setStep("questionnaire")}
            hasQuestionnaires={questionnaireResults.length > 0}
          />
        )}
        {step === "final_notes" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <MessageCircle className="h-4 w-4" />
                {language === "pt" ? "Última etapa" : language === "es" ? "Última etapa" : "Final step"}
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {language === "pt"
                  ? "Algo mais que devemos saber?"
                  : language === "es"
                  ? "¿Algo más que debamos saber?"
                  : "Anything else we should know?"}
              </h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {language === "pt"
                  ? "Espaço opcional para qualquer detalhe relevante: contexto da dor, exames, tratamentos prévios, expectativas."
                  : language === "es"
                  ? "Espacio opcional para cualquier detalle relevante: contexto del dolor, exámenes, tratamientos previos, expectativas."
                  : "Optional space for any relevant detail: pain context, imaging, prior treatments, expectations."}
              </p>
            </div>

            <Card className="rounded-xl">
              <CardContent className="pt-6 space-y-4">
                <Textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value.slice(0, 600))}
                  placeholder={
                    language === "pt"
                      ? "Ex.: A dor piora muito ao dirigir e me impede de praticar tênis aos fins de semana..."
                      : language === "es"
                      ? "Ej.: El dolor empeora al conducir y me impide jugar tenis los fines de semana..."
                      : "E.g.: The pain worsens when driving and stops me from playing tennis on weekends..."
                  }
                  className="min-h-[140px] rounded-xl"
                  disabled={isFinalizing}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>
                    {language === "pt"
                      ? "Opcional · sua análise será gerada em até 20s"
                      : language === "es"
                      ? "Opcional · tu análisis se generará en hasta 20s"
                      : "Optional · your analysis will be generated in up to 20s"}
                  </span>
                  <span>{additionalInfo.length}/600</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep("functional_tests")}
                    disabled={isFinalizing}
                    className="rounded-xl gap-2 sm:w-auto"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {language === "pt" ? "Voltar" : language === "es" ? "Atrás" : "Back"}
                  </Button>
                  <Button
                    onClick={handleFinalize}
                    disabled={isFinalizing}
                    className="rounded-xl gap-2 flex-1 h-12 text-base font-semibold"
                  >
                    {isFinalizing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {language === "pt"
                          ? "Processando sua avaliação..."
                          : language === "es"
                          ? "Procesando tu evaluación..."
                          : "Processing your assessment..."}
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        {language === "pt"
                          ? "Finalizar e gerar análise"
                          : language === "es"
                          ? "Finalizar y generar análisis"
                          : "Finish & generate analysis"}
                      </>
                    )}
                  </Button>
                </div>
                {isFinalizing && (
                  <>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: "10%" }}
                        animate={{ width: ["10%", "90%", "60%", "95%"] }}
                        transition={{ duration: 18, ease: "easeInOut" }}
                      />
                    </div>
                    <p className="text-[11px] text-center text-muted-foreground">
                      {language === "pt"
                        ? "Isso pode levar até 20 segundos. Não feche a página."
                        : language === "es"
                        ? "Esto puede tardar hasta 20 segundos. No cierres la página."
                        : "This may take up to 20 seconds. Please don't close the page."}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
        {step === "loading" && (
          <ClinicalThinkingSkeleton phase="diagnosis" lang={language} />
        )}
        {step === "low_confidence" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
                <MessageCircle className="h-4 w-4" />
                {t("diagnosis.low_confidence_title")}
              </div>
            </div>

            <Card className="rounded-xl border-yellow-200 bg-yellow-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-yellow-600" />
                  {t("diagnosis.low_confidence_title")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t("diagnosis.low_confidence_desc")}
                </p>
                <Textarea
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder={t("diagnosis.low_confidence_placeholder")}
                  className="min-h-[120px] rounded-xl border-yellow-200 focus-visible:ring-yellow-400"
                />
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleLowConfidenceSubmit}
                    disabled={!additionalInfo.trim()}
                    className="flex-1 rounded-xl gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {t("diagnosis.low_confidence_submit")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleLowConfidenceSkip}
                    className="flex-1 rounded-xl gap-2"
                  >
                    {t("diagnosis.low_confidence_skip")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {step === "result" && diagnosis && (
          <>
            <DiagnosisResult
              diagnosis={diagnosis}
              mode={mode}
              onBack={() => setStep(mode === "premium" ? "functional_tests" : "anamnesis")}
              onNewAssessment={() => { clearDraft(); navigate("/"); }}
              onGenerateTreatment={mode === "premium" ? generateTreatmentPlan : undefined}
              assessmentId={assessmentId}
              patientName={capturedName || user?.user_metadata?.full_name || undefined}
              patientEmail={capturedEmail || user?.email || undefined}
              painRegions={anamnesisData?.painRegions}
              painScore={anamnesisData?.painScore}
              anamnesisData={anamnesisData}
              testResults={[...questionnaireResults, ...testResults].length > 0 ? [...questionnaireResults, ...testResults] : undefined}
              redFlagPayload={redFlagPayload}
            />
            {mode === "basic" && <ExitIntentPopup variant="diagnosis" />}
          </>
        )}
        {step === "loading_treatment" && (
          <ClinicalThinkingSkeleton phase="treatment" lang={language} />
        )}
        {step === "treatment" && treatmentPlan && (
          <TreatmentPlan
            plan={treatmentPlan}
            diagnosis={diagnosis}
            assessmentId={assessmentId || undefined}
            anamnesisData={anamnesisData || undefined}
            painRegions={anamnesisData?.painRegions}
            testResults={[...questionnaireResults, ...testResults].length > 0 ? [...questionnaireResults, ...testResults] : undefined}
            onBack={() => setStep("result")}
            onNewAssessment={() => { clearDraft(); navigate("/"); }}
          />
        )}
      </main>
    </div>
  );
};

export default Assessment;
