import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import PwaUpdateGuard from "@/components/PwaUpdateGuard";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Gateway from "./pages/Gateway";
import PatientLanding from "./pages/PatientLanding";
import LandingLegacy from "./pages/LandingLegacy";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

import Assessment from "./pages/Assessment";
import AssessmentView from "./pages/AssessmentView";
import PaymentSuccess from "./pages/PaymentSuccess";
import Admin from "./pages/Admin";
import ProfessionalRegister from "./pages/ProfessionalRegister";
import ProfessionalSearch from "./pages/ProfessionalSearch";
import ProfessionalAssessment from "./pages/ProfessionalAssessment";
import ExerciseProgram from "./pages/ExerciseProgram";
import ResetPassword from "./pages/ResetPassword";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import ProfessionalLanding from "./pages/ProfessionalLanding";
import CompleteProfile from "./pages/CompleteProfile";
import Support from "./pages/Support";
import UpgradeWelcome from "./pages/UpgradeWelcome";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <PwaUpdateGuard />
            <Routes>
              <Route path="/" element={<Gateway />} />
              <Route path="/para-pacientes" element={<PatientLanding />} />
              <Route path="/landing-legacy" element={<LandingLegacy />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/assessment/view/:id" element={<AssessmentView />} />
              <Route path="/assessment/:type" element={<Assessment />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/professional/register" element={<ProfessionalRegister />} />
              <Route path="/professionals" element={<ProfessionalSearch />} />
              <Route path="/assessment/professional/:professionalId" element={<ProfessionalAssessment />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />
              <Route path="/profissionais" element={<ProfessionalLanding />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/suporte" element={<Support />} />
              <Route path="/upgrade-welcome" element={<UpgradeWelcome />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
