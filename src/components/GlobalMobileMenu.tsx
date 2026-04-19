import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Globe,
  HelpCircle,
  Info,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Home,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import logoAlivia from "@/assets/logo-alivia.png";
import AppVersionBadge from "@/components/AppVersionBadge";

/**
 * Floating hamburger button for mobile that's always available
 * across pages that don't include the global Header (Dashboard,
 * Assessment, Gateway, etc.). Hidden on critical flows.
 */
const HIDDEN_PATH_PREFIXES = [
  "/assessment", // active assessment flow
  "/payment-success",
  "/aceitar-convite",
  "/reset-password",
  "/auth",
  "/complete-profile",
  "/hep/", // exercise program token page
  "/feedback/clinic",
];

const PAGES_WITH_HEADER = [
  "/",
  "/para-pacientes",
  "/landing-legacy",
  "/profissionais",
  "/blog",
  "/suporte",
  "/admin",
  "/conta",
  "/clinica",
];

const GlobalMobileMenu = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, toggleLanguage, language } = useLanguage();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Hide floating menu while a Radix Dialog/Sheet is open (it locks body scroll)
  useEffect(() => {
    const check = () => {
      const locked =
        document.body.hasAttribute("data-scroll-locked") ||
        !!document.querySelector('[role="dialog"][data-state="open"]');
      setDialogOpen(locked);
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked", "style"], childList: true, subtree: true });
    return () => obs.disconnect();
  }, []);

  // Hide on critical/auth flows
  const path = location.pathname;
  const inCriticalFlow = HIDDEN_PATH_PREFIXES.some((p) =>
    p.endsWith("/") ? path.startsWith(p) : path === p || path.startsWith(p + "/"),
  );

  // If a page already renders the global Header, skip the floating button
  // (Header has its own hamburger). We match exact + nested.
  const pageHasHeader = PAGES_WITH_HEADER.some((p) => {
    if (p === "/") return path === "/";
    return path === p || path.startsWith(p + "/");
  });

  if (inCriticalFlow || pageHasHeader || dialogOpen) return null;

  const go = (target: string) => {
    setOpen(false);
    navigate(target);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/");
  };

  return (
    <>
      {/* Floating button - mobile only. z-40 keeps it below Radix Dialog/Sheet (z-50). */}
      <Button
        variant="default"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Menu"
        className="md:hidden fixed top-3 right-3 z-40 h-10 w-10 rounded-full shadow-lg bg-background/95 backdrop-blur border border-border text-foreground hover:bg-muted"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="p-4 border-b border-border/40">
            <SheetTitle className="flex items-center gap-2">
              <img src={logoAlivia} alt="Aliv.iA" className="h-8" />
              <span className="text-lg font-bold text-foreground">Aliv.iA</span>
            </SheetTitle>
          </SheetHeader>


          <nav className="flex flex-col gap-1 p-3">
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

            <button
              onClick={() => go("/para-pacientes")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <Info className="h-4 w-4" />
              {language === "pt" ? "Sobre o Aliv.iA" : language === "es" ? "Acerca de" : "About"}
            </button>

            <button
              onClick={() => go("/profissionais")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors text-left"
            >
              <Stethoscope className="h-4 w-4" />
              {t("nav.professional")}
            </button>

            <button
              onClick={() => go("/blog")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <BookOpen className="h-4 w-4" />
              {t("blog.title")}
            </button>

            <div className="my-2 border-t border-border/40" />

            <button
              onClick={() => {
                toggleLanguage();
                setOpen(false);
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <Globe className="h-4 w-4" />
              {language === "pt"
                ? "Idioma: Português"
                : language === "en"
                  ? "Language: English"
                  : "Idioma: Español"}
              <span className="ml-auto text-xs text-primary">
                → {language === "pt" ? "EN" : language === "en" ? "ES" : "PT"}
              </span>
            </button>

            <button
              onClick={() => go("/suporte")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <HelpCircle className="h-4 w-4" />
              {t("support.badge")}
            </button>

            <button
              onClick={() => go("/conta")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
            >
              <UserCog className="h-4 w-4" />
              {language === "pt" ? "Minha Conta" : language === "es" ? "Mi Cuenta" : "My Account"}
            </button>

            {user ? (
              <>
                <button
                  onClick={() => go("/admin")}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </button>

                <div className="my-2 border-t border-border/40" />

                <button
                  onClick={handleSignOut}
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

          <div className="mt-auto border-t border-border/40 p-4 text-center">
            <AppVersionBadge />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
        </SheetContent>
      </Sheet>
    </>
  );
};

export default GlobalMobileMenu;
