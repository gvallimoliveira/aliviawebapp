import { useState, useEffect } from "react";
import { Globe, HelpCircle, LogOut, Menu, ShieldCheck, Stethoscope, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import logoAlivia from "@/assets/logo-alivia.png";

const Header = () => {
  const { t, toggleLanguage, language } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [updatePending, setUpdatePending] = useState(() => !!(window as any).__pwaUpdatePending);
  const isProfessionalPage = location.pathname === "/profissionais";

  useEffect(() => {
    const handler = () => setUpdatePending(true);
    window.addEventListener("pwa-update-ready", handler);
    return () => window.removeEventListener("pwa-update-ready", handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const go = (path: string) => {
    if (path.startsWith("#")) {
      document.querySelector(path)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(path);
    }
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between overflow-visible">
        <div className="flex items-center gap-2 cursor-pointer shrink-0 relative" onClick={() => go(user ? "/dashboard" : "/")}>
          <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
          <span className="hidden sm:inline text-xl font-bold text-foreground">Aliv.iA</span>
          {updatePending && (
            <span className="absolute -top-0.5 -right-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
          )}
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
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            <Stethoscope className="h-3.5 w-3.5" />
            {t("nav.professional")}
          </button>
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5 px-2 sm:px-3">
            <Globe className="h-4 w-4" />
            <span>{language === "pt" ? "EN" : language === "en" ? "ES" : "PT"}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => go("/suporte")} title={t("support.badge")}>
            <HelpCircle className="h-4 w-4" />
          </Button>
          {user ? (
            <>
              <Button variant="ghost" size="icon" onClick={() => go("/admin")} title="Admin">
                <ShieldCheck className="h-4 w-4" />
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

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

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
            <button
              onClick={() => go("#compare")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              {isProfessionalPage ? (language === "pt" ? "Planos e preços" : language === "es" ? "Planes y precios" : "Plans & pricing") : t("compare.title")}
            </button>
            <button
              onClick={() => go("#how")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              {t("how.title")}
            </button>
            <button
              onClick={() => go("/blog")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              {t("blog.title")}
            </button>
            <button
              onClick={() => go("/profissionais")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors text-left"
            >
              <Stethoscope className="h-4 w-4" />
              {t("nav.professional")}
            </button>

            <div className="my-2 border-t border-border/40" />

            <button
              onClick={() => { toggleLanguage(); setMobileOpen(false); }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <Globe className="h-4 w-4" />
              {language === "pt" ? "EN" : language === "en" ? "ES" : "PT"}
            </button>
            <button
              onClick={() => go("/suporte")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <HelpCircle className="h-4 w-4" />
              {t("support.badge")}
            </button>

            {user ? (
              <>
                <button
                  onClick={() => go("/dashboard")}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
                >
                  {t("nav.dashboard")}
                </button>
                <button
                  onClick={() => go("/admin")}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </button>
                <button
                  onClick={() => { handleSignOut(); setMobileOpen(false); }}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  {language === "pt" ? "Sair" : language === "es" ? "Salir" : "Sign out"}
                </button>
              </>
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
    </header>
  );
};

export default Header;
