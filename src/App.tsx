import PhysioTechUpgradeDialog from "@/components/PhysioTechUpgradeDialog";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import ScrollToTop from "@/components/ScrollToTop";
import { startVersionChecker } from "@/lib/versionChecker";
import { startIdlePreloads } from "@/lib/preloader";
import { installGlobalErrorLogging } from "@/lib/logAppError";

import GlobalMobileMenu from "@/components/GlobalMobileMenu";
import DashboardErrorBoundary from "@/components/dashboard/DashboardErrorBoundary";
import SplashScreen from "@/components/SplashScreen";
import NavigationOverlay from "@/components/NavigationOverlay";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClinicProvider } from "@/contexts/ClinicContext";
import { VoiceRecorderProvider } from "@/contexts/VoiceRecorderContext";
import RealtimeNotifier from "@/components/RealtimeNotifier";
import PushSubscriptionKeeper from "@/components/PushSubscriptionKeeper";
import ManualAssessmentResumer from "@/components/dashboard/ManualAssessmentResumer";
import PasskeyEnrollPrompt from "@/components/auth/PasskeyEnrollPrompt";
import ProfessionalLanding from "@/pages/cinematic/ProfessionalLandingShell";
import { LANDING_LAYOUT } from "@/lib/landingLayout";
import AiCreditMonitor from "@/components/AiCreditMonitor";
import { AI_CREDIT_BLOCKED, AI_CREDIT_REFRESH } from "@/lib/aiCreditPolicy";
import { supabase } from "@/integrations/supabase/client";

const Gateway = lazy(() => import("./pages/Gateway"));
const Auth = lazy(() => import("./pages/Auth"));
const CardioTestSheet = lazy(() => import("./pages/CardioTestSheet"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PatientLanding = lazy(() => import("./pages/PatientLanding"));
const LandingLegacy = lazy(() => import("./pages/LandingLegacy"));
const Assessment = lazy(() => import("./pages/Assessment"));
const AssessmentView = lazy(() => import("./pages/AssessmentView"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Admin = lazy(() => import("./pages/Admin"));
const ProfessionalRegister = lazy(() => import("./pages/ProfessionalRegister"));
const ProfessionalSearch = lazy(() => import("./pages/ProfessionalSearch"));
const ProfessionalAssessment = lazy(() => import("./pages/ProfessionalAssessment"));
const ExerciseProgram = lazy(() => import("./pages/ExerciseProgram"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const ProfessionalLandingClassic = lazy(() => import("./pages/legacy/ProfessionalLandingClassic"));
const CompleteProfile = lazy(() => import("./pages/CompleteProfile"));
const Support = lazy(() => import("./pages/Support"));
const UpgradeWelcome = lazy(() => import("./pages/UpgradeWelcome"));
const ClinicLanding = lazy(() => import("./pages/ClinicLanding"));
const ClinicSupport = lazy(() => import("./pages/ClinicSupport"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const ClinicAssessment = lazy(() => import("./pages/ClinicAssessment"));
const ClinicDemo = lazy(() => import("./pages/ClinicDemo"));
const ProfessionalDemo = lazy(() => import("./pages/ProfessionalDemo"));
const PatientDemo = lazy(() => import("./pages/PatientDemo"));
const ProfessionalAssessmentDemo = lazy(() => import("./pages/ProfessionalAssessmentDemo"));
const ClinicFeedback = lazy(() => import("./pages/ClinicFeedback"));
const Account = lazy(() => import("./pages/Account"));
const ClearCache = lazy(() => import("./pages/ClearCache"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const PendingQuestionnaire = lazy(() => import("./pages/PendingQuestionnaire"));
const AssessmentPendingQuestionnaires = lazy(() => import("./pages/AssessmentPendingQuestionnaires"));
const AssessmentAddendum = lazy(() => import("./pages/AssessmentAddendum"));
const PeriodizationCheckin = lazy(() => import("./pages/PeriodizationCheckin"));

const ClinicalAgent = lazy(() => import("./pages/ClinicalAgent"));
const CasosDeEstudo = lazy(() => import("./pages/CasosDeEstudo"));
const AcademicTracks = lazy(() => import("./pages/AcademicTracks"));
const AcademicLanding = lazy(() => import("./pages/AcademicLanding"));
const AcademicSupport = lazy(() => import("./pages/AcademicSupport"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const StudioLanding = lazy(() => import("./pages/studio/StudioLanding"));
// Produto público de criação de posts (shell isolado, sem vínculo com o app clínico).
const StudioProLanding = lazy(() => import("./pages/studio-pro/StudioProLanding"));
const StudioProApp = lazy(() => import("./pages/studio-pro/StudioProApp"));
const StudioProAuth = lazy(() => import("./pages/studio-pro/StudioProAuth"));
const StudioProBrand = lazy(() => import("./pages/studio-pro/StudioProBrand"));
const StudioProVip = lazy(() => import("./pages/studio-pro/StudioProVip"));



const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      <p className="text-sm text-muted-foreground">Carregando a próxima tela…</p>
    </div>
  </div>
);

const App = () => {
  useEffect(() => {
    // Observe function results only: auth and requests are never intercepted.
    const original = supabase.functions.invoke.bind(supabase.functions);
    const observed: typeof supabase.functions.invoke = async (...args) => {
      const result = await original(...args);
      window.dispatchEvent(new Event(AI_CREDIT_REFRESH));
      const context = result.error?.context;
      if (context instanceof Response && context.status === 402) {
        const payload = await context.clone().json().catch(() => null);
        if (payload?.error === "alivia_credit_limit") {
          if (result.error) result.error.message = "alivia_credit_limit";
          window.dispatchEvent(new Event(AI_CREDIT_BLOCKED));
        }
      }
      return result;
    };
    supabase.functions.invoke = observed;
    return () => { supabase.functions.invoke = original; };
  }, []);
  useEffect(() => {
    startVersionChecker();
    startIdlePreloads();
    installGlobalErrorLogging();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <ClinicProvider>
          <VoiceRecorderProvider>
          <TooltipProvider>
            <SplashScreen />
            <Toaster />
            <PhysioTechUpgradeDialog />
            <Sonner />
            <NavigationOverlay />
            <BrowserRouter>
              <ScrollToTop />
              <AiCreditMonitor />
              <GlobalMobileMenu />
              <RealtimeNotifier />
              <PushSubscriptionKeeper />
              <ManualAssessmentResumer />
              <PasskeyEnrollPrompt />
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Gateway />} />
                  <Route path="/para-pacientes" element={<PatientLanding />} />
                  <Route path="/para-pacientes/demo" element={<PatientDemo />} />
                  <Route path="/landing-legacy" element={<LandingLegacy />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route
                    path="/dashboard"
                    element={(
                      <DashboardErrorBoundary fallbackTitle="Erro ao abrir o dashboard">
                        <Dashboard />
                      </DashboardErrorBoundary>
                    )}
                  />
                  <Route path="/teste-cardio/:type" element={<CardioTestSheet />} />
                  <Route path="/assessment/view/:id" element={<AssessmentView />} />
                  <Route path="/assessment/:type" element={<Assessment />} />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/professional/register" element={<ProfessionalRegister />} />
                  <Route path="/professionals" element={<ProfessionalSearch />} />
                  <Route path="/assessment/professional/demo" element={<ProfessionalAssessmentDemo />} />
                  <Route path="/assessment/professional/:professionalId" element={<ProfessionalAssessment />} />
                  <Route path="/hep/:token" element={<ExerciseProgram />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route
                    path="/profissionais"
                    element={LANDING_LAYOUT === "classic" ? <ProfessionalLandingClassic /> : <ProfessionalLanding />}
                  />
                  <Route path="/profissionais/demo" element={<ProfessionalDemo />} />
                  <Route path="/complete-profile" element={<CompleteProfile />} />
                  <Route path="/suporte" element={<Support />} />
                  <Route path="/upgrade-welcome" element={<UpgradeWelcome />} />
                  <Route path="/clinica" element={<ClinicLanding />} />
                  <Route path="/clinica/suporte" element={<ClinicSupport />} />
                  <Route path="/clinica/demo" element={<ClinicDemo />} />
                  <Route path="/assessment/clinic/:clinicId" element={<ClinicAssessment />} />
                  <Route path="/feedback/clinic/:clinicId" element={<ClinicFeedback />} />
                  <Route path="/aceitar-convite" element={<AcceptInvite />} />
                  <Route path="/conta" element={<Account />} />
                  <Route path="/limpar-cache" element={<ClearCache />} />
                  <Route path="/verificar-email" element={<VerifyEmail />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/q/:token" element={<PendingQuestionnaire />} />
                  <Route path="/adendo/:token" element={<AssessmentAddendum />} />
                  <Route path="/carga/:token" element={<PeriodizationCheckin />} />

                  <Route path="/avaliacao/pendentes/:assessmentId" element={<AssessmentPendingQuestionnaires />} />
                  <Route path="/agente" element={<ClinicalAgent />} />
                  <Route path="/agente/:threadId" element={<ClinicalAgent />} />
                  <Route path="/casos-de-estudo" element={<CasosDeEstudo />} />
                  <Route path="/trilhas" element={<AcademicTracks />} />
                  <Route path="/academico" element={<AcademicLanding />} />
                  <Route path="/academico/suporte" element={<AcademicSupport />} />
                  <Route path="/privacidade" element={<PrivacyPolicy />} />
                  <Route path="/termos" element={<Terms />} />
                  {/* Interno: landing mutável de marketing, só no preview + conta admin */}
                  <Route path="/studio" element={<StudioLanding />} />
                  <Route path="/studio-pro" element={<StudioProLanding />} />
                  <Route path="/studio-pro/entrar" element={<StudioProAuth />} />
                  <Route path="/studio-pro/app" element={<StudioProApp />} />
                  <Route path="/studio-pro/app/vip" element={<StudioProVip />} />
                  <Route path="/studio-pro/app/marca/:brandId" element={<StudioProBrand />} />


                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
          </VoiceRecorderProvider>
        </ClinicProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
  );
};

export default App;
