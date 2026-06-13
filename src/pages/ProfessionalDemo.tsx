import { useState, Suspense, lazy, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logoAlivia from "@/assets/logo-alivia.png";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import {
  Stethoscope, Calendar as CalendarIcon, Sparkles, MessageCircle,
  Crown, ArrowLeft, HelpCircle, User, Brain,
} from "lucide-react";
import ProDashboard from "@/components/dashboard/ProDashboard";
import DemoUpsellBanner from "@/components/demo/DemoUpsellBanner";
import DemoInsightsMock from "@/components/demo/DemoInsightsMock";
import DemoMessagesMock from "@/components/demo/DemoMessagesMock";
import DemoDailySummaryMock from "@/components/demo/DemoDailySummaryMock";
import DemoClinicalAgentMock from "@/components/demo/DemoClinicalAgentMock";

import { setSeo } from "@/lib/seo";

const ProSchedule = lazy(() => import("@/components/dashboard/ProSchedule"));

const SectionFallback = () => (
  <div className="flex justify-center py-10">
    <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

const ProfessionalDemo = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("professional");

  useEffect(() => {
    setSeo({
      title: "Demo Profissional — Aliv.iA",
      description: "Explore o painel profissional Aliv.iA com pacientes simulados, agenda, insights e mensagens.",
      url: `${window.location.origin}/profissionais/demo`,
      type: "website",
    });
  }, []);

  const handleCTA = () => {
    if (user) navigate("/dashboard?tab=professional");
    else navigate("/auth", { state: { redirectTo: "/dashboard?tab=professional" } });
  };

  const proStub: any = {
    id: "demo-pro",
    full_name: "Dr. Demo (Fisioterapeuta)",
    email: "demo@aliv.ia",
    lifetime_treatment: false,
    is_partner: false,
    premium_granted: false,
    crefito: "DEMO/000000-F",
    specialties: ["Traumato-ortopédica", "Esportiva"],
    city: "São Paulo",
    state: "SP",
    profile_photo_url: null,
    logo_url: null,
    clinic_name: null,
    clinic_address: null,
    bio: null,
    social_media: null,
    phone: null,
    active: true,
    approved: true,
    subscription_status: "active",
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header — mirrors ClinicDemo header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/profissionais")} className="flex items-center gap-2">
              <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
              <span className="text-xl font-bold text-foreground">Aliv.iA</span>
            </button>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300/40 text-[10px] gap-1">
              Demo Profissional
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/suporte")} className="hidden md:inline-flex">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/profissionais")} className="gap-1.5 rounded-xl">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair do demo</span>
            </Button>
            <Button size="sm" onClick={handleCTA} className="gap-1.5 rounded-xl">
              <Crown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Assinar PRO</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 px-4 space-y-6 max-w-7xl">
        {/* WelcomeSection-like header */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardContent className="py-4 px-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
                  {proStub.full_name}
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-300/40 text-[10px]">PRO Ativo</Badge>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">Modo simulado</Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {proStub.crefito} · {proStub.city}/{proStub.state} · Pacientes, agenda e mensagens simulados para demonstração
                </p>
              </div>
            </div>
            <Button size="sm" onClick={handleCTA} className="rounded-xl gap-1.5">
              <Crown className="h-3.5 w-3.5" /> Assinar PRO
            </Button>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="professional" className="gap-1.5 text-xs">
              <Stethoscope className="h-4 w-4" /><span className="hidden sm:inline">Pacientes</span>
            </TabsTrigger>
            <TabsTrigger value="agenda" className="gap-1.5 text-xs">
              <CalendarIcon className="h-4 w-4" /><span className="hidden sm:inline">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5 text-xs">
              <Sparkles className="h-4 w-4" /><span className="hidden sm:inline">Insights</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5 text-xs">
              <MessageCircle className="h-4 w-4" /><span className="hidden sm:inline">Mensagens</span>
            </TabsTrigger>
            <TabsTrigger value="agente" className="gap-1.5 text-xs">
              <Brain className="h-4 w-4" /><span className="hidden sm:inline">Agente</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="professional" className="space-y-6">
            <DemoUpsellBanner section="pro-patients" variant="pro" />
            <ProDashboard
              professional={proStub}
              isSimulated={true}
              isDemoMode={true}
            />
          </TabsContent>

          <TabsContent value="agenda" className="space-y-6">
            <DemoUpsellBanner section="pro-agenda" variant="pro" />
            <DemoDailySummaryMock professionalId={proStub.id} />
            <Suspense fallback={<SectionFallback />}>
              <ProSchedule professionalId={proStub.id} isSimulated={true} />
            </Suspense>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <DemoUpsellBanner section="pro-insights" variant="pro" />
            <DemoInsightsMock variant="pro" />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6">
            <DemoUpsellBanner section="pro-messages" variant="pro" />
            <DemoMessagesMock />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ProfessionalDemo;
