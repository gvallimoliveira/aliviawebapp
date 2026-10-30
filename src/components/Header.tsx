import { useState } from "react";
import { BookOpen, Building2, Globe, Heart, HelpCircle, Home, LayoutDashboard, LogOut, Menu, ShieldCheck, Smartphone, Stethoscope, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import logoAlivia from "@/assets/logo-alivia.png";
import InstallAppDialog from "@/components/InstallAppDialog";
import LanguageSelector from "@/components/LanguageSelector";
import { preloadProfessionalLanding } from "@/lib/professionalLandingLoader";

const Header = () => {
  const { t, toggleLanguage, language } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const isProfessionalPage = location.pathname === "/profissionais";

  const handleSignOut = async () => {
    await signOut();
    // Hard redirect garante que rotas protegidas (Dashboard) não
    // renderizem com user=null e fiquem em branco antes da navegação.
    window.location.replace("/");
  };

  const navigateAfterMenuClose = (target: string) => {
    const performNavigation = () => {
      navigate(target);
      window.scrollTo({ top: 0, left: 0 });
    };

    if (mobileOpen) {
      setMobileOpen(false);
      window.setTimeout(performNavigation, 0);
      return;
    }

    performNavigation();
  };

  const go = (path: string) => {
    if (path.startsWith("#")) {
      document.querySelector(path)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigateAfterMenuClose(path);
    }
  };

  return (
    // bg-background/95 on mobile (no backdrop-filter) avoids the browser re-compositing the
    // entire header backdrop on every scroll frame — the main cause of janky fast-scroll on
    // phones. Desktop keeps the translucent blurred look.
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 md:bg-background/80 md:backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between overflow-visible">
        <div className="flex items-center gap-2 cursor-pointer shrink-0 relative" onClick={() => go(user ? "/dashboard" : "/")}>
          <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
          <span className="hidden sm:inline text-xl font-bold text-foreground">Aliv.iA</span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <a href="#compare" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {isProfessionalPage ? (language === "pt" ? "Planos e preços" : language === "es" ? "Planes y precios" : "Plans & pricing") : t("compare.title")}
          </a>
          <a href="#how" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("how.title")}
          </a>
          <a href="/blog" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("blog.title")}
          </a>
          <button
            onClick={() => go("/profissionais")}
            onPointerEnter={preloadProfessionalLanding}
            onPointerDown={preloadProfessionalLanding}
            onFocus={preloadProfessionalLanding}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            <Stethoscope className="h-3.5 w-3.5" />
            {t("nav.professional")}
          </button>
        </nav>

        {/* Actions + hamburger */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Button variant="ghost" size="icon" onClick={() => go("/admin")} title="Admin">
                  <ShieldCheck className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => go("/conta")} title={language === "pt" ? "Minha Conta" : language === "es" ? "Mi Cuenta" : "My Account"}>
                  <UserCog className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => go("/dashboard")}>
                  {t("nav.dashboard")}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => go("/auth")}>
                {t("nav.login")}
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              preloadProfessionalLanding();
              setMobileOpen(true);
            }}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile side menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border/40">
            <SheetTitle className="flex items-center gap-2">
              <img src={logoAlivia} alt="Aliv.iA" className="h-8" />
              <span className="text-lg font-bold text-foreground">Aliv.iA</span>
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-0.5 p-2 overflow-y-auto flex-1">
            {user && (
              <button
                onClick={() => go("/dashboard")}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors text-left"
              >
                <LayoutDashboard className="h-4 w-4" />
                {language === "pt" ? "Meu Painel" : language === "es" ? "Mi Panel" : "My Dashboard"}
              </button>
            )}
            <button
              onClick={() => go("/")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <Home className="h-4 w-4" />
              {language === "pt" ? "Início" : language === "es" ? "Inicio" : "Home"}
            </button>

            <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
              {language === "pt" ? "Conheça o Aliv.iA" : language === "es" ? "Conoce Aliv.iA" : "Discover Aliv.iA"}
            </div>
            <button
              onClick={() => go("/para-pacientes")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <Heart className="h-4 w-4" />
              {language === "pt" ? "Para Pacientes" : language === "es" ? "Para Pacientes" : "For Patients"}
            </button>
            <button
              onClick={() => go("/profissionais")}
              onPointerDown={preloadProfessionalLanding}
              onFocus={preloadProfessionalLanding}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <Stethoscope className="h-4 w-4" />
              {t("nav.professional")}
            </button>
            <button
              onClick={() => go("/clinica")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <Building2 className="h-4 w-4" />
              {language === "pt" ? "Aliv.iA Clínica" : language === "es" ? "Aliv.iA Clínica" : "Aliv.iA Clinic"}
            </button>
            <button
              onClick={() => go("/blog")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <BookOpen className="h-4 w-4" />
              {t("blog.title")}
            </button>

            <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
              {language === "pt" ? "Conta & Utilidades" : language === "es" ? "Cuenta y Utilidades" : "Account & Utilities"}
            </div>
            {user && (
              <button
                onClick={() => go("/conta")}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
              >
                <UserCog className="h-4 w-4" />
                {language === "pt" ? "Minha Conta" : language === "es" ? "Mi Cuenta" : "My Account"}
              </button>
            )}
            <button
              onClick={() => { setMobileOpen(false); setInstallOpen(true); }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <Smartphone className="h-4 w-4" />
              {language === "pt" ? "Instalar como App" : language === "es" ? "Instalar como App" : "Install as App"}
            </button>
            <button
              onClick={() => go("/suporte")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <HelpCircle className="h-4 w-4" />
              {t("support.badge")}
            </button>
            <LanguageSelector className="justify-start gap-3 w-full h-auto px-3 py-2.5 text-muted-foreground" onSelected={() => setMobileOpen(false)} />
            {user && (
              <button
                onClick={() => go("/admin")}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </button>
            )}

            <div className="my-2 border-t border-border/40" />

            {user ? (
              <button
                onClick={() => { handleSignOut(); setMobileOpen(false); }}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors text-left"
              >
                <LogOut className="h-4 w-4" />
                {language === "pt" ? "Sair" : language === "es" ? "Salir" : "Sign out"}
              </button>
            ) : (
              <button
                onClick={() => go("/auth")}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
              >
                {t("nav.login")}
              </button>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      <InstallAppDialog open={installOpen} onOpenChange={setInstallOpen} />
    </header>
  );
};

export default Header;
