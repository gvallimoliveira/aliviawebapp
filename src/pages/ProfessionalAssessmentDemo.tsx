import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, Crown, Sparkles, ArrowLeft, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import WelcomeStep from "@/components/assessment/WelcomeStep";
import logoAlivia from "@/assets/logo-alivia.png";
import { setSeo } from "@/lib/seo";
import { PRO_PLAN_ANNUAL_PRICE_FORMATTED, PRO_PLAN_PRICE_FORMATTED } from "@/constants/pricing";

const ProfessionalAssessmentDemo = () => {
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const { user } = useAuth();
  const isPt = language === "pt";
  const [showUpsell, setShowUpsell] = useState(false);

  useEffect(() => {
    setSeo({
      title: "Demo — Link de pré-avaliação Aliv.iA",
      description: "Veja como seus pacientes recebem o link de pré-avaliação Aliv.iA antes da consulta.",
      url: `${window.location.origin}/assessment/professional/demo`,
      type: "website",
    });
  }, []);

  const goSubscribe = () => navigate("/profissionais#planos");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Demo header banner */}
      <div className="w-full border-b border-amber-300/40 bg-amber-50 dark:bg-amber-900/15">
        <div className="container max-w-3xl mx-auto px-4 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              <strong>Modo demonstração</strong> — esta é a tela que seus pacientes verão ao abrir seu link Aliv.iA.
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={() => navigate("/profissionais/demo")} className="h-7 gap-1.5 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao painel demo
          </Button>
        </div>
      </div>

      {/* Header — mirrors ProfessionalAssessment */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoAlivia} alt="Aliv.iA" className="h-8" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">Aliv.iA</span>
              <span className="text-[10px] text-muted-foreground">Pré-avaliação profissional</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            <span className="text-xs uppercase">{language}</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl mx-auto px-4 py-6">
        {/* Pro identity card — Dr. Demo */}
        <Card className="mb-6 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background">
          <CardContent className="py-4 px-5 flex items-center gap-4 flex-wrap">
            <div className="h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-base font-bold text-primary">DD</span>
            </div>
            <div className="flex-1 min-w-[180px]">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-foreground">Dr. Demo (Fisioterapeuta)</p>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300/40 text-[10px]">CREFITO DEMO/000000-F</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Traumato-ortopédica · Esportiva · São Paulo/SP
              </p>
            </div>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300/40 text-[10px] uppercase">Simulação</Badge>
          </CardContent>
        </Card>

        <WelcomeStep
          mode="professional"
          professionalName="Dr. Demo"
          onContinue={() => setShowUpsell(true)}
        />
      </main>

      {/* Upsell dialog — blocks assessment progression */}
      <Dialog open={showUpsell} onOpenChange={setShowUpsell}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-2">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-center">Esta é uma simulação</DialogTitle>
            <DialogDescription className="text-center">
              Na versão real, ao clicar em <strong>Começar avaliação</strong>, o paciente segue para a triagem de segurança, anamnese, mapa de dor e questionários — e o resultado chega direto no seu prontuário PRO.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1.5 text-sm">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Crown className="h-4 w-4 text-primary" /> Libere seu link real assinando o PRO
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-5 list-disc">
              <li>Link único para enviar aos seus pacientes</li>
              <li>Prontuário automático com hipótese da IA</li>
              <li>Agenda, mensagens e PDFs white-label</li>
            </ul>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowUpsell(false)} className="rounded-xl">
              Continuar explorando
            </Button>
            <Button onClick={goSubscribe} className="rounded-xl gap-1.5">
              <Crown className="h-4 w-4" />
              Assinar PRO ({PRO_PLAN_ANNUAL_PRICE_FORMATTED})
            </Button>
          </DialogFooter>
          <p className="text-[11px] text-center text-muted-foreground">
            Também disponível mensal por {PRO_PLAN_PRICE_FORMATTED}.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfessionalAssessmentDemo;
