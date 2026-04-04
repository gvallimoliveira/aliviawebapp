import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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
import { motion } from "framer-motion";
import {
  Clock, Target, FileText, Activity, Stethoscope, ArrowRight,
  UserPlus, Link2, Send, ClipboardCheck, Check,
  LayoutDashboard, Brain, User, FileBarChart, Zap,
  RefreshCw, Dumbbell, Palette,
} from "lucide-react";
import { PRO_PLAN_PRICE, PRO_PLAN_ANNUAL_PRICE } from "@/constants/pricing";
import ValidatedQuestionnairesTable from "@/components/ValidatedQuestionnairesTable";
import { setSeo } from "@/lib/seo";
import { useEffect } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const ProfessionalLanding = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();

  useEffect(() => {
    setSeo({
      title: "Aliv.iA Webapp — Para Profissionais",
      description: "Receba pacientes com anamnese, mapa de dor e questionários prontos. Economize 30 min por consulta com o painel profissional Aliv.iA.",
      url: `${window.location.origin}/profissionais`,
      type: "website",
    });
  }, []);

  const handleCTA = () => {
    if (user) {
      navigate("/dashboard?tab=professional");
    } else {
      navigate("/auth", { state: { redirectTo: "/dashboard?tab=professional" } });
    }
  };

  const benefits = [
    { icon: Clock, titleKey: "b2b.benefit_1_title", descKey: "b2b.benefit_1_desc" },
    { icon: RefreshCw, titleKey: "b2b.benefit_2_title", descKey: "b2b.benefit_2_desc" },
    { icon: Dumbbell, titleKey: "b2b.benefit_3_title", descKey: "b2b.benefit_3_desc" },
    { icon: Target, titleKey: "b2b.benefit_4_title", descKey: "b2b.benefit_4_desc" },
    { icon: Palette, titleKey: "b2b.benefit_5_title", descKey: "b2b.benefit_5_desc" },
    { icon: Activity, titleKey: "b2b.benefit_6_title", descKey: "b2b.benefit_6_desc" },
  ];

  const steps = [
    { icon: UserPlus, titleKey: "b2b.step_1_title", descKey: "b2b.step_1_desc" },
    { icon: Link2, titleKey: "b2b.step_2_title", descKey: "b2b.step_2_desc" },
    { icon: Send, titleKey: "b2b.step_3_title", descKey: "b2b.step_3_desc" },
    { icon: ClipboardCheck, titleKey: "b2b.step_4_title", descKey: "b2b.step_4_desc" },
  ];

  const features = [
    { icon: Link2, key: "b2b.feature_1" },
    { icon: LayoutDashboard, key: "b2b.feature_2" },
    { icon: User, key: "b2b.feature_3" },
    { icon: Brain, key: "b2b.feature_4" },
    { icon: Stethoscope, key: "b2b.feature_5" },
    { icon: Zap, key: "b2b.feature_6" },
    { icon: RefreshCw, key: "b2b.feature_7" },
    { icon: Dumbbell, key: "b2b.feature_8" },
    { icon: Palette, key: "b2b.feature_9" },
  ];

  const faqKeys = ["b2b.faq1", "b2b.faq2", "b2b.faq3", "b2b.faq4", "b2b.faq5"];

  const pricingIncludes = [
    "b2b.pricing_inc_1",
    "b2b.pricing_inc_2",
    "b2b.pricing_inc_3",
    "b2b.pricing_inc_4",
    "b2b.pricing_inc_5",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-accent/20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-3xl" />
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
            <Button variant="outline" size="lg" className="rounded-xl px-8 text-base" onClick={() => {
              if (user) {
                navigate("/dashboard?tab=professional");
              } else {
                navigate("/auth", { state: { redirectTo: "/dashboard?tab=professional" } });
              }
            }}>
              {t("b2b.hero_login")}
            </Button>
          </motion.div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s, i) => (
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
        </div>
      </section>

      {/* Panel Features */}
      <section className="py-16 md:py-20">
        <div className="container max-w-4xl mx-auto px-4">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12"
          >
            {t("b2b.features_title")}
          </motion.h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/60 p-4"
              >
                <f.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm text-foreground">{t(f.key)}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Validated Questionnaires */}
      <ValidatedQuestionnairesTable />

      {/* Pricing */}
      <section id="compare" className="py-16 md:py-20 bg-muted/30">
        <div className="container max-w-4xl mx-auto px-4">
          <motion.h2
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
            className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12"
          >
            {t("b2b.pricing_title")}
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Monthly Plan */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <Card className="border-border/60 h-full">
                <div className="px-6 py-4 text-center border-b border-border/40">
                  <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{t("b2b.plan_monthly")}</p>
                </div>
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-foreground mb-1">
                    R${PRO_PLAN_PRICE}<span className="text-lg font-normal text-muted-foreground">/{t("b2b.per_month")}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">{t("b2b.cta_cancel")}</p>
                  <ul className="text-left space-y-3 mb-8">
                    {pricingIncludes.map((key, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        {t(key)}
                      </li>
                    ))}
                  </ul>
                  <Button onClick={handleCTA} variant="outline" size="lg" className="w-full rounded-xl gap-2 text-base">
                    {t("b2b.hero_cta")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Annual Plan — highlighted */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <Card className="border-primary/30 shadow-lg relative h-full bg-primary/[0.02]">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {t("b2b.best_value")}
                  </span>
                </div>
                <div className="px-6 py-4 pt-6 text-center border-b border-primary/10 bg-primary/5">
                  <p className="text-sm font-medium uppercase tracking-wider text-primary">{t("b2b.plan_annual")}</p>
                </div>
                <CardContent className="p-6 text-center">
                  <div className="text-4xl font-bold text-foreground mb-1">
                    R${PRO_PLAN_ANNUAL_PRICE.toFixed(2).replace(".", ",")}<span className="text-lg font-normal text-muted-foreground">/{t("b2b.per_month")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{t("b2b.billed_annually")}</p>
                  <p className="text-xs text-muted-foreground mb-1">{t("b2b.annual_no_refund")}</p>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs mb-4">
                    {t("b2b.save_30")}
                  </Badge>
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

      <Footer />
    </div>
  );
};

export default ProfessionalLanding;
