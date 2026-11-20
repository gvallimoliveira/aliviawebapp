import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Stethoscope, Zap } from "lucide-react";
import Header from "@/components/Header";
import ScrollProgress from "@/components/scroll/ScrollProgress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { setOrganizationJsonLd, setSeo, setSoftwareJsonLd } from "@/lib/seo";

const ProfessionalLandingBody = lazy(() => import("./ProfessionalLandingBody"));

const ProfessionalLandingShell = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [loadBody, setLoadBody] = useState(false);

  useEffect(() => {
    setSeo({
      title: "Software para Fisioterapeutas: Prontuário e Avaliação | Aliv.iA",
      description: "Prontuário eletrônico para fisioterapeutas autônomos. Anamnese prévia, questionários validados (Oswestry, LEFS, DASH), escalas de dor e conduta clínica rápida.",
      url: "https://aliviawebapp.com.br/profissionais",
      type: "website",
    });
    setSoftwareJsonLd({
      name: "Aliv.iA PRO", url: "https://aliviawebapp.com.br/profissionais",
      description: "Prontuário eletrônico e raciocínio clínico com IA especializada em fisioterapia para fisioterapeutas autônomos.",
      audience: "Fisioterapeutas autônomos",
      features: ["Pré-avaliação online do paciente", "Questionários validados (Oswestry, LEFS, DASH, KOOS)", "Triagem de Red Flags", "Raciocínio clínico STEPS e D.I.F.I.", "Prontuário e evolução", "Controle de carga (sRPE, ACWR)", "Relatórios em PDF com sua marca", "Agenda"],
    });
    setOrganizationJsonLd();
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setLoadBody(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleCTA = () => {
    // Plan choice lives in the pricing card, which opens checkout directly.
    const pricing = document.getElementById("pricing");
    if (pricing) { pricing.scrollIntoView({ behavior: "instant" }); return; }
    if (user) {
      navigate("/dashboard?tab=professional");
      return;
    }
    try { sessionStorage.setItem("signupOrigin", "professional"); } catch {}
    navigate("/auth", { state: { redirectTo: "/dashboard" } });
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-background">
      <ScrollProgress />
      <Header />
      <main>
        <section className="relative min-h-[620px] overflow-hidden py-20 md:min-h-[670px] md:py-28">
          <div className="blur-blob absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/20" />
          <div className="container relative z-10 mx-auto max-w-4xl px-4 text-center">
            <Badge variant="outline" className="mb-6 border-primary/30 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Stethoscope className="mr-1.5 h-3.5 w-3.5" />
              {t("b2b.badge")}
            </Badge>
            <h1 className="mb-6 text-4xl font-bold leading-tight text-foreground md:text-5xl lg:text-6xl">
              {t("b2b.hero_title")}
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              {t("b2b.hero_subtitle")}
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Button onClick={handleCTA} size="lg" className="gap-2 rounded-xl px-8 text-base">
                {t("b2b.subscribe_now_cta")}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" className="gap-2 rounded-xl px-8 text-base" onClick={() => navigate("/profissionais/demo")}>
                <Zap className="h-4 w-4" />
                Ver demo interativa
              </Button>
              <Button variant="ghost" size="lg" className="rounded-xl px-8 text-base" onClick={handleCTA}>
                {t("b2b.hero_login")}
              </Button>
            </div>
            <Button variant="link" onClick={handleCTA} className="mt-3 h-auto whitespace-normal text-sm text-muted-foreground">
              {t("b2b.trial_cta")}
            </Button>
          </div>
        </section>
        {loadBody ? (
          <Suspense fallback={<div className="h-24 border-t border-border/30 bg-muted/20" aria-hidden="true" />}>
            <ProfessionalLandingBody />
          </Suspense>
        ) : (
          <div className="h-24 border-t border-border/30 bg-muted/20" aria-hidden="true" />
        )}
      </main>
    </div>
  );
};

export default ProfessionalLandingShell;