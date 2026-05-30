import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import ScrollToTop from "@/components/ScrollToTop";
import { startVersionChecker } from "@/lib/versionChecker";
import { startIdlePreloads } from "@/lib/preloader";

import GlobalMobileMenu from "@/components/GlobalMobileMenu";
import DashboardErrorBoundary from "@/components/dashboard/DashboardErrorBoundary";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClinicProvider } from "@/contexts/ClinicContext";
import { VoiceRecorderProvider } from "@/contexts/VoiceRecorderContext";
import RealtimeNotifier from "@/components/RealtimeNotifier";

// Level 1 — eager (initial paint critical)
import Gateway from "./pages/Gateway";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Level 2/3 — lazy (split into separate chunks)
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
const ProfessionalLanding = lazy(() => import("./pages/ProfessionalLanding"));
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

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

const App = () => {
  useEffect(() => {
    startVersionChecker();
    startIdlePreloads();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <ClinicProvider>
          <VoiceRecorderProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
              <GlobalMobileMenu />
              <RealtimeNotifier />
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
                  <Route path="/profissionais" element={<ProfessionalLanding />} />
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
