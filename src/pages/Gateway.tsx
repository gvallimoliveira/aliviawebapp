import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ReferralBanner from "@/components/ReferralBanner";
import { motion } from "framer-motion";
import { User, Stethoscope, ArrowRight, Activity, FileText, Clock, Target, Shield, BarChart3, Heart, Globe, LogOut, LayoutDashboard, HelpCircle, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { setSeo } from "@/lib/seo";
import logoAlivia from "@/assets/logo-alivia.png";
import guilhermePhoto from "@/assets/guilherme-founder.jpeg";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.5 } }),
};

const Gateway = () => {
  const { t, toggleLanguage, language } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) localStorage.setItem("alivia_referral_code", ref);
  }, [searchParams]);

  useEffect(() => {
    setSeo({
      title: "Aliv.iA — Avaliação Musculoesquelética Inteligente",
      description: "O Aliv.iA não é só um app — é um sistema de raciocínio clínico com alma de fisioterapeuta de verdade. Avaliação musculoesquelética com IA, diagnóstico preliminar e plano de tratamento personalizado.",
      url: "https://aliviawebapp.com.br",
      type: "website",
    });
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Background blobs */}
      <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />

      {/* Header minimal */}
      <header className="relative z-10 container flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <img src={logoAlivia} alt="Aliv.iA" className="h-8" />
          <span className="text-lg font-bold text-foreground">Aliv.iA</span>
        </div>

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
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-sm px-2">
            {t("nav.login")}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <ReferralBanner />

      {/* Mobile side menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="p-4 border-b border-border/40">
            <SheetTitle className="flex items-center gap-2">
              <img src={logoAlivia} alt="Aliv.iA" className="h-8" />
              <span className="text-lg font-bold text-foreground">Aliv.iA</span>
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-3">
            <button onClick={() => { navigate("/blog"); setMobileOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left">
              Blog
            </button>
            <div className="my-2 border-t border-border/40" />
            <button onClick={() => { toggleLanguage(); setMobileOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left">
              <Globe className="h-4 w-4" />
              {language === "pt" ? "EN" : language === "en" ? "ES" : "PT"}
            </button>
            <button onClick={() => { navigate("/suporte"); setMobileOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left">
              <HelpCircle className="h-4 w-4" />
              {t("support.badge")}
            </button>
            {user ? (
              <>
                <button onClick={() => { navigate("/dashboard"); setMobileOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </button>
                <button onClick={() => { handleSignOut(); setMobileOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors text-left">
                  <LogOut className="h-4 w-4" />
                  {language === "pt" ? "Sair" : language === "es" ? "Salir" : "Sign out"}
                </button>
              </>
            ) : (
              <button onClick={() => { navigate("/auth"); setMobileOpen(false); }} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left">
                {t("nav.login")}
              </button>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full mx-auto text-center">
          {/* Floating logo */}
          <motion.div
            className="mb-8 flex justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <motion.img
              src={logoAlivia}
              alt="Aliv.iA"
              className="h-24 w-24 md:h-32 md:w-32 drop-shadow-[0_0_30px_hsl(var(--primary)/0.4)]"
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            />
          </motion.div>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              {t("gateway.badge")}
            </div>
          </motion.div>

          <motion.h1
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
            className="mb-4 text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl lg:text-5xl"
          >
            {t("gateway.title")}
          </motion.h1>

          <motion.p
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
            className="mb-10 text-base text-muted-foreground md:text-lg max-w-2xl mx-auto leading-relaxed"
          >
            {t("gateway.subtitle")}
          </motion.p>

          {/* Two cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Patient Card */}
            <motion.div
              initial="hidden" animate="visible" variants={fadeUp} custom={3}
              className="group rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 md:p-8 text-left hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col cursor-pointer"
              onClick={() => navigate("/para-pacientes")}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-5">
                <User className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">{t("gateway.patient.title")}</h2>
              <p className="text-sm text-muted-foreground mb-5">{t("gateway.patient.desc")}</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                <li className="flex items-start gap-2.5 text-sm text-foreground">
                  <Shield className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("gateway.patient.bullet1")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-foreground">
                  <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("gateway.patient.bullet2")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-foreground">
                  <Activity className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("gateway.patient.bullet3")}
                </li>
              </ul>
              <Button
                size="lg"
                className="w-full rounded-xl gap-2 text-base pointer-events-none"
                tabIndex={-1}
              >
                {t("gateway.patient.cta")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>

            {/* Professional Card */}
            <motion.div
              initial="hidden" animate="visible" variants={fadeUp} custom={4}
              className="group rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 md:p-8 text-left hover:shadow-xl hover:border-primary/30 transition-all duration-300 flex flex-col cursor-pointer"
              onClick={() => navigate("/profissionais")}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-5">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">{t("gateway.pro.title")}</h2>
              <p className="text-sm text-muted-foreground mb-5">{t("gateway.pro.desc")}</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                <li className="flex items-start gap-2.5 text-sm text-foreground">
                  <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("gateway.pro.bullet1")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-foreground">
                  <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("gateway.pro.bullet2")}
                </li>
                <li className="flex items-start gap-2.5 text-sm text-foreground">
                  <BarChart3 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  {t("gateway.pro.bullet3")}
                </li>
              </ul>
              <Button
                variant="outline"
                size="lg"
                className="w-full rounded-xl gap-2 text-base border-primary/30 text-primary hover:bg-primary/5 pointer-events-none"
                tabIndex={-1}
              >
                {t("gateway.pro.cta")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>

          {/* Social proof badge */}
          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} custom={5}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground"
          >
            <Activity className="h-4 w-4 text-primary" />
            {t("gateway.social_proof")}
          </motion.div>

          {/* About section */}
          <motion.div
            initial="hidden" animate="visible" variants={fadeUp} custom={6}
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

      {/* Footer minimal */}
      <footer className="relative z-10 border-t border-border/40 bg-muted/20 py-6">
        <div className="container text-center">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Aliv.iA. {t("footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Gateway;
