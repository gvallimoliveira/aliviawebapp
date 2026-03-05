import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
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
import ResetPassword from "./pages/ResetPassword";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import ProfessionalLanding from "./pages/ProfessionalLanding";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
