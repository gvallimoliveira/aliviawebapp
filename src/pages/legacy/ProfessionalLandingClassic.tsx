import AnnualRefundDisclaimer from "@/components/AnnualRefundDisclaimer";
import CreditsSufficiency from "@/components/CreditsSufficiency";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InstallAppSection from "@/components/InstallAppSection";
import { motion } from "framer-motion";
import {
  Clock, Target, FileText, Activity, Stethoscope, ArrowRight, ArrowDown,
  UserPlus, Link2, Send, ClipboardCheck, Check,
  LayoutDashboard, Brain, User, FileBarChart, Zap,
  RefreshCw, Dumbbell, Palette, TrendingUp, GraduationCap,
  BarChart3, ListChecks, ShieldCheck, DollarSign, Timer, Users,
  BookOpen, Filter, Star, Sparkles, Gauge,
} from "lucide-react";
import { PRO_PLAN_PRICE, PRO_PLAN_ANNUAL_PRICE } from "@/constants/pricing";
import ValidatedQuestionnairesTable from "@/components/ValidatedQuestionnairesTable";
import { setSeo, setMedicalBusinessJsonLd, setOrganizationJsonLd } from "@/lib/seo";
import LgpdBadge from "@/components/LgpdBadge";
import { useEffect } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const ProfessionalLandingClassic = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  useEffect(() => {
    setSeo({
      title: "Aliv.iA Webapp — Para Profissionais",
      description: "Receba pacientes com anamnese, mapa de dor e questionários prontos. Economize 30 min por consulta com o painel profissional Aliv.iA.",
      url: `${window.location.origin}/profissionais`,
      type: "website",
    });
    setMedicalBusinessJsonLd();
    setOrganizationJsonLd();
  }, []);

  const handleCTA = () => {
    if (user) {
      navigate("/dashboard?tab=professional");
    } else {
      try { sessionStorage.setItem("signupOrigin", "professional"); } catch {}
      navigate("/auth", { state: { redirectTo: "/dashboard?tab=professional" } });
    }
  };

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  };

  const benefits = [
    { icon: Clock, titleKey: "b2b.benefit_1_title", descKey: "b2b.benefit_1_desc" },
    { icon: RefreshCw, titleKey: "b2b.benefit_2_title", descKey: "b2b.benefit_2_desc" },
    { icon: Dumbbell, titleKey: "b2b.benefit_3_title", descKey: "b2b.benefit_3_desc" },
    { icon: Target, titleKey: "b2b.benefit_4_title", descKey: "b2b.benefit_4_desc" },
    { icon: Palette, titleKey: "b2b.benefit_5_title", descKey: "b2b.benefit_5_desc" },
    { icon: Activity, titleKey: "b2b.benefit_6_title", descKey: "b2b.benefit_6_desc" },
    { icon: TrendingUp, titleKey: "b2b.benefit_7_title", descKey: "b2b.benefit_7_desc" },
    { icon: Brain, titleKey: "b2b.benefit_8_title", descKey: "b2b.benefit_8_desc" },
  ];

  const steps = [
    { icon: UserPlus, titleKey: "b2b.step_1_title", descKey: "b2b.step_1_desc" },
    { icon: Link2, titleKey: "b2b.step_2_title", descKey: "b2b.step_2_desc" },
    { icon: Send, titleKey: "b2b.step_3_title", descKey: "b2b.step_3_desc" },
    { icon: ClipboardCheck, titleKey: "b2b.step_4_title", descKey: "b2b.step_4_desc" },
    { icon: Brain, titleKey: "b2b.step_5_title", descKey: "b2b.step_5_desc" },
    { icon: Dumbbell, titleKey: "b2b.step_6_title", descKey: "b2b.step_6_desc" },
    { icon: BarChart3, titleKey: "b2b.step_7_title", descKey: "b2b.step_7_desc" },
  ];

  const features = [
    { icon: Link2, key: "b2b.feature_1", descKey: "b2b.feature_1_desc" },
    { icon: LayoutDashboard, key: "b2b.feature_2", descKey: "b2b.feature_2_desc" },
    { icon: User, key: "b2b.feature_3", descKey: "b2b.feature_3_desc" },
    { icon: Brain, key: "b2b.feature_4", descKey: "b2b.feature_4_desc" },
    { icon: Stethoscope, key: "b2b.feature_5", descKey: "b2b.feature_5_desc" },
    { icon: Zap, key: "b2b.feature_6", descKey: "b2b.feature_6_desc" },
    { icon: RefreshCw, key: "b2b.feature_7", descKey: "b2b.feature_7_desc" },
    { icon: Dumbbell, key: "b2b.feature_8", descKey: "b2b.feature_8_desc" },
    { icon: Palette, key: "b2b.feature_9", descKey: "b2b.feature_9_desc" },
    { icon: TrendingUp, key: "b2b.feature_10", descKey: "b2b.feature_10_desc" },
    { icon: Brain, key: "b2b.feature_11", descKey: "b2b.feature_11_desc" },
    { icon: BarChart3, key: "b2b.feature_12", descKey: "b2b.feature_12_desc" },
    { icon: Zap, key: "b2b.feature_13", descKey: "b2b.feature_13_desc" },
    { icon: Gauge, key: "b2b.feature_14", descKey: "b2b.feature_14_desc" },
  ];

  const faqKeys = ["b2b.faq1", "b2b.faq2", "b2b.faq3", "b2b.faq4", "b2b.faq5", "b2b.faq6"];

  const pricingIncludes = [
    "b2b.pricing_inc_1",
    "b2b.pricing_inc_2",
    "b2b.pricing_inc_3",
    "b2b.pricing_inc_4",
    "b2b.pricing_inc_5",
    "b2b.pricing_inc_6",
    "b2b.pricing_inc_7",
    "b2b.pricing_inc_8",
    "b2b.pricing_inc_9",
    "b2b.pricing_inc_10",
  ];

  const price = billing === "monthly" ? PRO_PLAN_PRICE : PRO_PLAN_ANNUAL_PRICE;
  const priceFormatted = billing === "monthly"
    ? `R$${PRO_PLAN_PRICE}`
    : `R$${PRO_PLAN_ANNUAL_PRICE.toFixed(2).replace(".", ",")}`;

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="blur-blob absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/20" />
        <div className="blur-blob absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-3xl" />
        <div className="container relative z-10 max-w-4xl mx-auto text-center px-4">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Badge variant="outline" className="mb-6 border-primary/30 bg-primary/5 text-primary px-4 py-1.5 text-sm font-medium">
              <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
              {t("b2b.badge")}
            </Badge>
          </motion.div>
          <motion.h1
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6"
          >
            {t("b2b.hero_title")}
          </motion.h1>
          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed"
          >
            {t("b2b.hero_subtitle")}
          </motion.p>
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleCTA} size="lg" className="rounded-xl gap-2 px-8 text-base">
              {t("b2b.hero_cta")}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" className="rounded-xl gap-2 px-8 text-base" onClick={() => navigate("/profissionais/demo")}>
              <Zap className="h-4 w-4" />
              Ver demo interativa
            </Button>
            <Button variant="ghost" size="lg" className="rounded-xl px-8 text-base" onClick={() => {
              if (user) {
                navigate("/dashboard?tab=professional");
              } else {
                try { sessionStorage.setItem("signupOrigin", "professional"); } catch {}
                navigate("/auth", { state: { redirectTo: "/dashboard?tab=professional" } });
              }
            }}>
              {t("b2b.hero_login")}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Early CTA — pricing teaser */}
      <section className="py-10 md:py-14">
        <div className="container max-w-lg mx-auto px-4">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="rounded-2xl border border-primary/20 bg-card/90 backdrop-blur-sm p-6 md:p-8 text-center shadow-sm"
          >
            <p className="text-sm font-medium text-muted-foreground mb-3">
              {t("b2b.early_cta_desc")}
            </p>

            {/* Toggle mensal / anual */}
            <div className="inline-flex items-center rounded-full border border-border bg-muted/50 p-1 mb-4">
              <button
                onClick={() => setBilling("monthly")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  billing === "monthly"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("b2b.plan_monthly")}
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5 ${
                  billing === "annual"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("b2b.plan_annual")}
                <Badge className={`text-[10px] px-1.5 py-0 ${
                  billing === "annual"
                    ? "bg-white/20 text-white border-white/30"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                }`}>
                  {t("b2b.save_30")}
                </Badge>
              </button>
            </div>

            <div className="text-3xl font-bold text-foreground mb-1">
              {priceFormatted}<span className="text-lg font-normal text-muted-foreground">/{t("b2b.per_month")}</span>
            </div>
            {billing === "annual" && (
              <p className="text-xs text-muted-foreground mb-1">{t("b2b.billed_annually")}</p>
            )}

            <AnnualRefundDisclaimer annual={billing === "annual"} />

            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-5">
              <Button onClick={handleCTA} size="lg" className="rounded-xl gap-2 px-8">
                {t("b2b.hero_cta")}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="lg" className="rounded-xl gap-2 text-muted-foreground" onClick={scrollToPricing}>
                {t("b2b.see_plans")}
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Complemento quote */}
      <section className="py-10 md:py-14 bg-primary/10">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <motion.p
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-lg md:text-xl font-semibold text-primary italic"
          >
            "O Aliv.iA não compete com o fisioterapeuta — nós o complementamos."
          </motion.p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 md:py-20">
        <div className="container max-w-5xl mx-auto px-4">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12"
          >
            {t("b2b.benefits_title")}
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((b, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <b.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{t(b.titleKey)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(b.descKey)}</p>
              </motion.div>
            ))}
          </div>

          {/* Grad CTA */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={benefits.length}
            className="mt-10 mx-auto max-w-2xl text-center"
          >
            <div className="inline-flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-6 py-4">
              <GraduationCap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                {t("b2b.grad_cta")}
              </p>
            </div>
          </motion.div>

          {/* Student mode CTA */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={benefits.length + 1}
            className="mt-6 mx-auto max-w-2xl"
          >
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <GraduationCap className="h-5 w-5 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">
                  {language === "pt" ? "Ainda é aluno de fisioterapia?" : language === "es" ? "¿Aún eres estudiante de fisioterapia?" : "Still a physiotherapy student?"}
                </p>
              </div>
              <p className="text-sm text-amber-700/90 leading-relaxed">
                {language === "pt"
                  ? "Ao assinar o Plano Profissional, você pode ativar o modo Alivia Acadêmico e usar todas as ferramentas PRO com selo acadêmico — ideal para prática supervisionada e estágios."
                  : language === "es"
                  ? "Al suscribirte al Plan Profesional, puedes activar el modo Alivia Académico y usar todas las herramientas PRO con sello académico — ideal para práctica supervisada y pasantías."
                  : "By subscribing to the Professional Plan, you can activate Alivia Academic mode and use all PRO tools with an academic seal — ideal for supervised practice and internships."}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Biblioteca de Evidências por Nicho — destaque PRO */}
      <section className="py-14 md:py-20">
        <div className="container max-w-5xl mx-auto px-4">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-6 md:p-10"
          >
            <div className="blur-blob absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="relative grid md:grid-cols-[1.2fr_1fr] gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 mb-4">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary tracking-wide uppercase">
                    {language === "pt" ? "Novidade PRO · Beta" : language === "es" ? "Novedad PRO · Beta" : "PRO update · Beta"}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight">
                  {language === "pt"
                    ? "Biblioteca de Evidências por Nicho — direto dentro do Agente Clínico"
                    : language === "es"
                    ? "Biblioteca de Evidencia por Nicho — dentro del Agente Clínico"
                    : "Evidence Library by Niche — inside the Clinical Agent"}
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed mb-5">
                  {language === "pt"
                    ? "Os mesmos artigos curados (PEDro ≥ 7) que alimentam a IA agora ficam disponíveis para você consultar, filtrar e favoritar. Acesse pela página do Agente, segmentado por nicho, com filtros de ano e nota PEDro — sem precisar abrir outra aba ou caçar PDF."
                    : language === "es"
                    ? "Los mismos artículos curados (PEDro ≥ 7) que alimentan la IA ahora están disponibles para consultar, filtrar y marcar como favoritos. Accede desde la página del Agente, segmentado por nicho, con filtros de año y nota PEDro."
                    : "The same curated studies (PEDro ≥ 7) that power the AI are now yours to browse, filter and favorite — right from the Clinical Agent page, sorted by niche with year and PEDro score filters."}
                </p>
                <ul className="grid sm:grid-cols-2 gap-2.5 text-sm text-foreground">
                  <li className="flex items-start gap-2"><BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />{language === "pt" ? "Segmentado por nicho clínico" : language === "es" ? "Segmentado por nicho clínico" : "Sorted by clinical niche"}</li>
                  <li className="flex items-start gap-2"><Filter className="h-4 w-4 text-primary mt-0.5 shrink-0" />{language === "pt" ? "Filtros de ano e nota PEDro" : language === "es" ? "Filtros de año y nota PEDro" : "Year and PEDro score filters"}</li>
                  <li className="flex items-start gap-2"><Star className="h-4 w-4 text-primary mt-0.5 shrink-0" />{language === "pt" ? "Favorite estudos para acesso rápido" : language === "es" ? "Marca favoritos para acceso rápido" : "Favorite studies for quick access"}</li>
                  <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />{language === "pt" ? "Mesma base usada pela IA do Aliv.iA" : language === "es" ? "Misma base usada por la IA de Aliv.iA" : "Same base the Aliv.iA AI uses"}</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{language === "pt" ? "Nichos atuais" : language === "es" ? "Nichos actuales" : "Current niches"}</span>
                  <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">BETA</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["Ombro", "Lombar", "Cervical", "Quadril", "Joelho", "Tornozelo", "Cotovelo", "Punho", "Pélvica", "Temporomandibular"].map((n) => (
                    <span key={n} className="rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1">{n}</span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                  {language === "pt"
                    ? "Novos nichos entram conforme novos artigos são aprovados na curadoria."
                    : language === "es"
                    ? "Nuevos nichos se incorporan a medida que se aprueban más artículos."
                    : "New niches are added as more studies clear curation."}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-16 md:py-20 bg-muted/30">
        <div className="container max-w-5xl mx-auto px-4">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12"
          >
            {t("b2b.how_title")}
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.slice(0, 6).map((s, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="text-center"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 relative">
                  <s.icon className="h-6 w-6 text-primary" />
                  <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{t(s.titleKey)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(s.descKey)}</p>
              </motion.div>
            ))}
          </div>
          {(() => {
            const LastIcon = steps[6].icon;
            return (
              <motion.div
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={6}
                className="mt-6 flex justify-center"
              >
                <div className="text-center max-w-xs">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 relative">
                    <LastIcon className="h-6 w-6 text-primary" />
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      7
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{t(steps[6].titleKey)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(steps[6].descKey)}</p>
                </div>
              </motion.div>
            );
          })()}
        </div>
      </section>

      {/* Panel Features with hover details */}
      <section className="py-16 md:py-20">
        <div className="container max-w-4xl mx-auto px-4">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12"
          >
            {t("b2b.features_title")}
          </motion.h2>
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((f, i) => (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <motion.div
                      initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                      className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/60 p-4 cursor-default hover:border-primary/30 hover:shadow-md hover:bg-card/90 transition-all duration-200"
                    >
                      <f.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-sm text-foreground">{t(f.key)}</span>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {t(f.descKey)}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>
      </section>

      <LgpdBadge />

      {/* ROI Section */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container max-w-4xl mx-auto px-4">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-center mb-10"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{t("b2b.roi_title")}</h2>
            <p className="text-muted-foreground text-base md:text-lg">{t("b2b.roi_subtitle")}</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
            {[
              { icon: Timer, title: "b2b.roi_time_saved", desc: "b2b.roi_time_desc" },
              { icon: Users, title: "b2b.roi_patients", desc: "b2b.roi_patients_desc" },
              { icon: DollarSign, title: "b2b.roi_revenue", desc: "b2b.roi_revenue_desc" },
              { icon: TrendingUp, title: "b2b.roi_monthly", desc: "b2b.roi_monthly_desc" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="rounded-xl border border-border/60 bg-card/80 p-5 text-center"
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-3">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <p className="font-bold text-foreground text-lg mb-1">{t(item.title)}</p>
                <p className="text-sm text-muted-foreground">{t(item.desc)}</p>
              </motion.div>
            ))}
          </div>
          <motion.p
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={4}
            className="text-center text-sm font-medium text-primary italic"
          >
            {t("b2b.roi_conclusion")}
          </motion.p>
        </div>
      </section>

      {/* Validated Questionnaires */}
      <ValidatedQuestionnairesTable />

      {/* Pricing — unified single card with toggle */}
      <section id="pricing" className="py-16 md:py-20 bg-muted/30">
        <div className="container max-w-xl mx-auto px-4">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12"
          >
            {t("b2b.pricing_title")}
          </motion.h2>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
            <Card className="border-primary/30 shadow-lg relative bg-primary/[0.02]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {t("b2b.early_cta_desc")}
                </span>
              </div>

              <CardContent className="p-6 md:p-8 pt-8 text-center">
                {/* Toggle */}
                <div className="inline-flex items-center rounded-full border border-border bg-muted/50 p-1 mb-5">
                  <button
                    onClick={() => setBilling("monthly")}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                      billing === "monthly"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("b2b.plan_monthly")}
                  </button>
                  <button
                    onClick={() => setBilling("annual")}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5 ${
                      billing === "annual"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t("b2b.plan_annual")}
                    <Badge className={`text-[10px] px-1.5 py-0 ${
                      billing === "annual"
                        ? "bg-white/20 text-white border-white/30"
                        : "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                    }`}>
                      {t("b2b.save_30")}
                    </Badge>
                  </button>
                </div>

                <div className="text-4xl font-bold text-foreground mb-1">
                  {priceFormatted}<span className="text-lg font-normal text-muted-foreground">/{t("b2b.per_month")}</span>
                </div>
                {billing === "annual" && (
                  <p className="text-xs text-muted-foreground mb-1">{t("b2b.billed_annually")}</p>
                )}
                <p className="text-xs text-muted-foreground mb-6">
                  {billing === "monthly" ? t("b2b.cta_cancel") : t("b2b.annual_no_refund")}
                </p>

                <CreditsSufficiency plan="pro" annual={billing === "annual"} className="mb-6" />
                <ul className="text-left space-y-3 mb-8">
                  {pricingIncludes.map((key, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      {t(key)}
                    </li>
                  ))}
                </ul>

                <Button onClick={handleCTA} size="lg" className="w-full rounded-xl gap-2 text-base">
                  {t("b2b.hero_cta")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20">
        <div className="container max-w-2xl mx-auto px-4">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl font-bold text-foreground text-center mb-10"
          >
            {t("b2b.faq_title")}
          </motion.h2>
          <Accordion type="single" collapsible className="w-full">
            {faqKeys.map((key) => (
              <AccordionItem key={key} value={key}>
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  {t(`${key}.q`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {t(`${key}.a`)}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <InstallAppSection />
      <Footer />
    </div>
  );
};

export default ProfessionalLandingClassic;
