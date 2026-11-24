import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ReferralBanner from "@/components/ReferralBanner";
import { motion } from "framer-motion";
import { User, UserCog, Stethoscope, ArrowRight, Activity, FileText, Clock, Target, Shield, BarChart3, Heart, Globe, LogOut, LayoutDashboard, HelpCircle, Info, Menu, ClipboardList, Brain, Users, Building2, Mail, Sparkles, Calendar, GraduationCap, Lightbulb, BookOpen, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { setSeo, setLandingJsonLd, setOrganizationJsonLd } from "@/lib/seo";
import LgpdBadge from "@/components/LgpdBadge";
import logoAlivia from "@/assets/logo-alivia.png";
import guilhermePhoto from "@/assets/guilherme-founder.jpeg";
import AppVersionBadge from "@/components/AppVersionBadge";
import { preloadProfessionalLanding } from "@/lib/professionalLandingLoader";

import MobileNavSheet from "@/components/MobileNavSheet";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

/** Reveal discreto ao entrar na viewport (uma única vez). */
const reveal = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const inView = { once: true, margin: "-80px" } as const;

/** Elevação sutil e sóbria no hover — sem exageros. */
const CARD_MOTION =
  "transition-[transform,box-shadow,border-color] duration-500 ease-out will-change-transform hover:-translate-y-1.5 motion-reduce:hover:translate-y-0";

const GatewayModern = () => {
  const { t, toggleLanguage, language } = useLanguage();
  const { user, signOut, ready } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.replace("/");
  };

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) localStorage.setItem("alivia_referral_code", ref);
  }, [searchParams]);

  useEffect(() => {
    if (ready && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [ready, user, navigate]);

  useEffect(() => {
    setSeo({
      title: "Fisioterapia com IA: triagem de dor e prontuário | Aliv.iA",
      description: "Sente dor? Faça uma triagem online com sinais de alerta. É fisioterapeuta ou clínica? Prontuário eletrônico, questionários validados e agenda em um só lugar.",
      url: "https://aliviawebapp.com.br",
      type: "website",
    });
    setLandingJsonLd();
    setOrganizationJsonLd();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(preloadProfessionalLanding, 120);
    return () => window.clearTimeout(timer);
  }, []);


  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden flex flex-col">
      {/* Background: malha técnica discreta + blobs suaves */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right, hsl(var(--border)/0.5) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border)/0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="blur-blob absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="blur-blob absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />
      <div className="blur-blob absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />



      {/* Header minimal */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between py-4">
          <button
            onClick={() => user ? navigate("/dashboard") : window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2"
            aria-label={user ? "Ir para o painel" : "Aliv.iA"}
          >
            <img src={logoAlivia} alt="Aliv.iA" className="h-8" />
            <span className="text-lg font-bold text-foreground">Aliv.iA</span>
          </button>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-3">
            <a href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </a>
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5 px-2">
              <Globe className="h-4 w-4" />
              {language === "pt" ? "EN" : language === "en" ? "ES" : "PT"}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/suporte")} title={t("support.badge")}>
              <HelpCircle className="h-4 w-4" />
            </Button>
            {user ? (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5 text-muted-foreground">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-sm">
                {t("nav.login")}
              </Button>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex sm:hidden items-center gap-1">
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1 px-2">
              <Globe className="h-4 w-4" />
              {language === "pt" ? "EN" : language === "en" ? "ES" : "PT"}
            </Button>
            {user ? (
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5 px-2 text-xs">
                <LayoutDashboard className="h-3.5 w-3.5" />
                {language === "pt" ? "Painel" : language === "es" ? "Panel" : "Dashboard"}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-sm px-2">
                {t("nav.login")}
              </Button>
            )}
            <MobileNavSheet open={mobileOpen} onOpenChange={setMobileOpen} hideTrigger />
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Menu">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
      <ReferralBanner />

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full mx-auto text-center">
          {/* Floating logo */}
          <motion.div
            className="mb-8 flex justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <img
              src={logoAlivia}
              alt="Aliv.iA"
              className="h-24 w-24 md:h-32 md:w-32 drop-shadow-[0_0_30px_hsl(var(--primary)/0.4)] animate-float"
            />
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {t("gateway.badge")}
            </div>
          </motion.div>

          <motion.h1
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="mb-5 text-3xl font-bold leading-[1.12] tracking-[-0.02em] text-foreground md:text-4xl lg:text-5xl"
          >
            {t("gateway.title")}
          </motion.h1>

          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mb-6 h-px w-40 origin-center bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            aria-hidden="true"
          />


          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="mb-10 text-base text-muted-foreground md:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            {t("gateway.subtitle")}
          </motion.p>

          {/* About section moved after cards for both mobile and desktop */}

          {/* 2x2 cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Patient Card */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={inView} variants={reveal} custom={3}
              className={`group rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 md:p-7 text-left hover:shadow-[0_18px_50px_-24px_hsl(var(--primary)/0.35)] hover:border-primary/30 flex flex-col cursor-pointer ${CARD_MOTION}`}
              onClick={() => navigate("/para-pacientes")}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <User className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">{t("gateway.patient.title")}</h2>
              <p className="text-sm text-muted-foreground mb-4">{t("gateway.patient.desc")}</p>
              <ul className="space-y-2 mb-5 flex-1">
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("gateway.patient.bullet1")}
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("gateway.patient.bullet2")}
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <Activity className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("gateway.patient.bullet3")}
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("gateway.patient.bullet5")}
                </li>
              </ul>
              <Button
                size="lg"
                className="w-full rounded-xl gap-2 text-base pointer-events-none"
                tabIndex={-1}
              >
                {t("gateway.patient.cta")}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </motion.div>

            {/* Professional Card */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={inView} variants={reveal} custom={4}
              className={`group relative rounded-2xl border-2 border-primary/30 bg-primary/[0.03] backdrop-blur-sm p-6 md:p-7 text-left hover:shadow-[0_18px_50px_-24px_hsl(var(--primary)/0.4)] hover:border-primary/50 flex flex-col cursor-pointer ${CARD_MOTION}`}
              onClick={() => navigate("/profissionais")}
              onPointerEnter={preloadProfessionalLanding}
              onPointerDown={preloadProfessionalLanding}
              onFocus={preloadProfessionalLanding}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <Stethoscope className="h-3 w-3" /> PRO
                </span>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 mb-4">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">{t("gateway.pro.title")}</h2>
              <p className="text-sm text-muted-foreground mb-4">{t("gateway.pro.desc")}</p>
              <ul className="space-y-2 mb-5 flex-1">
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("gateway.pro.bullet1")}
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <Brain className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("gateway.pro.bullet2")}
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <BarChart3 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("gateway.pro.bullet4")}
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <Users className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("gateway.pro.bullet6")}
                </li>
              </ul>
              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-xl gap-2 text-base border-primary/30 text-primary hover:bg-primary/5 pointer-events-none"
                tabIndex={-1}
              >
                {t("gateway.pro.cta")}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </motion.div>

            {/* Clinic Card */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={inView} variants={reveal} custom={5}
              className={`group relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 backdrop-blur-sm p-6 md:p-7 text-left hover:shadow-[0_18px_50px_-24px_hsl(var(--primary)/0.4)] hover:border-primary/60 flex flex-col cursor-pointer ${CARD_MOTION}`}
              onClick={() => navigate("/clinica")}
            >
              <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-primary/10 blur-2xl" aria-hidden="true" />
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-md">
                  <Sparkles className="h-2.5 w-2.5" />
                  {language === "pt" ? "Novo" : language === "es" ? "Nuevo" : "New"}
                </span>
              </div>
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/30 mb-4">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <h2 className="relative text-lg font-bold text-foreground mb-2">{t("gateway.clinic.title")}</h2>
              <p className="relative text-sm text-muted-foreground mb-4">{t("gateway.clinic.desc")}</p>
              <div className="relative flex flex-wrap gap-1.5 mb-5 flex-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <Users className="h-3 w-3" />
                  {language === "pt" ? "Equipe" : language === "es" ? "Equipo" : "Team"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <Calendar className="h-3 w-3" />
                  {language === "pt" ? "Agenda" : language === "es" ? "Agenda" : "Schedule"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  <BarChart3 className="h-3 w-3" />
                  {language === "pt" ? "Gestão" : language === "es" ? "Gestión" : "Management"}
                </span>
              </div>
              <Button
                size="lg"
                className="relative w-full rounded-xl gap-2 text-base bg-primary text-primary-foreground hover:bg-primary/90 pointer-events-none"
                tabIndex={-1}
              >
                {t("gateway.clinic.cta")}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </motion.div>

            {/* Academic Card */}
            <motion.div
              initial="hidden" whileInView="visible" viewport={inView} variants={reveal} custom={6}
              className={`group relative overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-card via-card to-amber-500/5 backdrop-blur-sm p-6 md:p-7 text-left hover:shadow-[0_18px_50px_-24px_hsl(38_92%_50%/0.4)] hover:border-amber-500/60 flex flex-col cursor-pointer ${CARD_MOTION}`}
              onClick={() => navigate("/academico")}
            >
              <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" aria-hidden="true" />
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                  <Sparkles className="h-2.5 w-2.5" />
                  {language === "pt" ? "Novo" : language === "es" ? "Nuevo" : "New"}
                </span>
              </div>
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30 mb-4">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h2 className="relative text-lg font-bold text-foreground mb-2">
                {language === "pt" ? "Sou estudante de fisioterapia" : language === "es" ? "Soy estudiante de fisioterapia" : "I'm a physiotherapy student"}
              </h2>
              <p className="relative text-sm text-muted-foreground mb-4">
                {language === "pt"
                  ? "Treine seu raciocínio clínico com IA, casos simulados e mentor virtual antes de pisar no estágio."
                  : language === "es"
                  ? "Entrena tu razonamiento clínico con IA, casos simulados y mentor virtual antes de la práctica."
                  : "Train your clinical reasoning with AI, simulated cases and a virtual mentor before your internship."}
              </p>
              <ul className="relative space-y-2 mb-5 flex-1">
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <Brain className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  {language === "pt" ? "Agente Clínico com IA e Modo Mentor" : language === "es" ? "Agente Clínico IA y Modo Mentor" : "Clinical AI Agent and Mentor Mode"}
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <FlaskConical className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  {language === "pt" ? "Casos simulados para praticar todo dia" : language === "es" ? "Casos simulados para practicar cada día" : "Simulated cases to practice every day"}
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <BookOpen className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  {language === "pt" ? "Trilhas clínicas e biblioteca de evidências" : language === "es" ? "Rutas clínicas y biblioteca de evidencia" : "Clinical tracks and evidence library"}
                </li>
                <li className="flex items-start gap-2 text-sm text-foreground">
                  <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  {language === "pt" ? "Selo acadêmico em PDFs e migração ao obter CREFITO" : language === "es" ? "Sello académico en PDFs y migración al obtener colegiatura" : "Academic seal in PDFs and migration on licensure"}
                </li>
              </ul>
              <Button
                size="lg"
                className="relative w-full rounded-xl gap-2 text-base bg-amber-500 text-white hover:bg-amber-600 pointer-events-none"
                tabIndex={-1}
              >
                {language === "pt" ? "Conhecer Aliv.iA Acadêmico" : language === "es" ? "Conocer Aliv.iA Académico" : "Discover Aliv.iA Academic"}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </motion.div>
          </div>

          {/* Social proof badge */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={inView} variants={reveal} custom={5}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground"
          >
            <Activity className="h-4 w-4 text-primary" />
            {t("gateway.social_proof")}
          </motion.div>

          {/* About section */}
          <motion.div
            id="about"
            initial="hidden" whileInView="visible" viewport={inView} variants={reveal} custom={6}
            className="mt-12 max-w-2xl mx-auto rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm p-6 md:p-8 text-center"
          >
            <div className="flex justify-center mb-4">
              <img
                src={guilhermePhoto}
                alt="Guilherme — Fisioterapeuta e criador da Aliv.iA"
                className="h-20 w-20 md:h-24 md:w-24 rounded-full object-cover object-top border-2 border-primary/20 shadow-md pointer-events-none select-none"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-3">{t("gateway.about_title")}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("gateway.about_text")}</p>
            <p className="mt-4 border-l-4 border-primary pl-4 text-sm italic text-primary leading-relaxed">
              {t("brand.slogan")}
            </p>
          </motion.div>
        </div>

      </main>

      <LgpdBadge />

      {/* Footer minimal */}
      <footer className="relative z-10 border-t border-border/40 bg-muted/20 py-6">
        <div className="container text-center space-y-2">
          <a
            href="mailto:aliviawebapp@gmail.com"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            Contato
          </a>
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Aliv.iA. {t("footer.rights")}
          </p>
          <div className="pt-1">
            <AppVersionBadge />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GatewayModern;
