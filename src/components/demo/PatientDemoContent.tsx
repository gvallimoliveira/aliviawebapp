import { lazy, Suspense, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logoAlivia from "@/assets/logo-alivia.png";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Crown, ArrowLeft, HelpCircle, User, Heart, MessageCircle, Info,
} from "lucide-react";
import { setSeo } from "@/lib/seo";
import { hideNavOverlay } from "@/lib/navigationOverlay";

const PatientDemoMessages = lazy(() => import("@/components/demo/PatientDemoMessages"));
const PatientDemoHealth = lazy(() => import("@/components/demo/PatientDemoHealth"));

const PatientDemoContent = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("health");

  useEffect(() => {
    hideNavOverlay();
    sessionStorage.removeItem("patient-demo-opening");
    setSeo({
      title: "Demo Premium — Aliv.iA",
      description: "Veja como funciona o painel Premium do paciente Aliv.iA com avaliações, diário de dor e exercícios.",
      url: `${window.location.origin}/para-pacientes/demo`,
      type: "website",
    });
  }, []);

  const goSubscribe = () => navigate("/para-pacientes#planos");
  const goBasic = () => navigate("/para-pacientes#avaliacao");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/para-pacientes")} className="flex items-center gap-2">
              <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
              <span className="text-xl font-bold text-foreground">Aliv.iA</span>
            </button>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300/40 text-[10px] gap-1">
              Demo Premium
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/suporte")} className="hidden md:inline-flex">
              <HelpCircle className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/para-pacientes")} className="gap-1.5 rounded-xl">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sair do demo</span>
            </Button>
            <Button size="sm" onClick={goSubscribe} className="gap-1.5 rounded-xl">
              <Crown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Assinar Premium</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 px-4 space-y-6 max-w-4xl">
        {/* Welcome */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardContent className="py-4 px-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground flex items-center gap-2 flex-wrap">
                  Mariana Silva (Demo)
                  <Badge className="bg-amber-500/90 text-white text-[10px] px-2 py-0.5 gap-1">
                    <Crown className="h-3 w-3" /> Premium Mensal
                  </Badge>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                    Modo simulado
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  3 avaliações realizadas · Acompanhamento de lombalgia radicular ciática
                </p>
              </div>
            </div>
            <Button size="sm" onClick={goSubscribe} className="rounded-xl gap-1.5">
              <Crown className="h-3.5 w-3.5" /> Assinar Premium
            </Button>
          </CardContent>
        </Card>

        {/* Demo info banner */}
        <Card className="border-amber-300/40 bg-amber-50/40">
          <CardContent className="py-4 px-5 flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900/80">
              Esta é uma demonstração interativa do painel Premium do paciente.
              Os dados abaixo são fictícios e ilustram o acompanhamento de um caso real
              de <strong>lombalgia radicular com disfunção do ciático e componente miofascial</strong> ao longo de 3 avaliações.
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Minha Saúde + Mensagens (espelha o app real do paciente) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="health" className="gap-1.5">
              <Heart className="h-4 w-4" /> Minha Saúde
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-1.5 relative">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Mensagens</span>
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center font-semibold">1</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="space-y-6">
            <Suspense fallback={<Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Carregando sua saúde...</CardContent></Card>}>
              <PatientDemoHealth goBasic={goBasic} goSubscribe={goSubscribe} />
            </Suspense>
          </TabsContent>

          {/* Mensagens (demo) */}
          <TabsContent value="messages" className="space-y-4">
            <Suspense fallback={<Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Carregando mensagens...</CardContent></Card>}>
              <PatientDemoMessages goSubscribe={goSubscribe} />
            </Suspense>
          </TabsContent>
        </Tabs>
      </main>

    </div>
  );
};

export default PatientDemoContent;
