import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Globe,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Home,
  BookOpen,
  Heart,
  Building2,
  Smartphone,
  GraduationCap,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import logoAlivia from "@/assets/logo-alivia.png";
import AppVersionBadge from "@/components/AppVersionBadge";
import InstallAppDialog from "@/components/InstallAppDialog";
import LanguageSelector from "@/components/LanguageSelector";
import ClinicContextSelector from "@/components/dashboard/ClinicContextSelector";

const HIDDEN_PATH_PREFIXES = [
  "/assessment",
  "/payment-success",
  "/aceitar-convite",
  "/reset-password",
  "/auth",
  "/complete-profile",
  "/hep/",
  "/feedback/clinic",
  // Studio interno: tela limpa para captura de conteúdo
  "/studio",
  // Studio público: produto separado, sem nenhuma navegação do app clínico
  "/studio-pro",

];

const PAGES_WITH_HEADER = [
  "/",
  "/agente",
  "/para-pacientes",
  "/landing-legacy",
  "/profissionais",
  "/blog",
  "/suporte",
  "/admin",
  "/conta",
  "/clinica",
  "/dashboard",
];

const LABELS = {
  pt: {
    dashboard: "Meu Painel",
    home: "Início",
    groupExplore: "Conheça o Aliv.iA",
    patients: "Para Pacientes",
    professionals: "Para Profissionais",
    academic: "Aliv.iA Acadêmico",
    clinic: "Aliv.iA Clínica",
    blog: "Blog",
    groupAccount: "Conta & Utilidades",
    account: "Minha Conta",
    install: "Instalar como App",
    support: "Suporte",
    privacy: "Privacidade",
    language: "Idioma: Português",
    languageNext: "EN",
    admin: "Admin",
    signin: "Entrar",
    signout: "Sair",
  },
  en: {
    dashboard: "My Dashboard",
    home: "Home",
    groupExplore: "Discover Aliv.iA",
    patients: "For Patients",
    professionals: "For Professionals",
    academic: "Aliv.iA Academic",
    clinic: "Aliv.iA Clinic",
    blog: "Blog",
    groupAccount: "Account & Utilities",
    account: "My Account",
    install: "Install as App",
    support: "Support",
    privacy: "Privacy",
    language: "Language: English",
    languageNext: "ES",
    admin: "Admin",
    signin: "Sign in",
    signout: "Sign out",
  },
  es: {
    dashboard: "Mi Panel",
    home: "Inicio",
    groupExplore: "Conoce Aliv.iA",
    patients: "Para Pacientes",
    professionals: "Para Profesionales",
    academic: "Aliv.iA Académico",
    clinic: "Aliv.iA Clínica",
    blog: "Blog",
    groupAccount: "Cuenta y Utilidades",
    account: "Mi Cuenta",
    install: "Instalar como App",
    support: "Soporte",
    privacy: "Privacidad",
    language: "Idioma: Español",
    languageNext: "PT",
    admin: "Admin",
    signin: "Entrar",
    signout: "Salir",
  },
};

const GlobalMobileMenu = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleLanguage, language } = useLanguage();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [otherDialogOpen, setOtherDialogOpen] = useState(false);

  const L = LABELS[language as "pt" | "en" | "es"] || LABELS.pt;

  useEffect(() => {
    if (open) {
      setOtherDialogOpen(false);
      return;
    }
    const check = () => {
      const dialogs = document.querySelectorAll('[role="dialog"][data-state="open"]');
      setOtherDialogOpen(dialogs.length > 0);
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ["data-state"], childList: true, subtree: true });
    return () => obs.disconnect();
  }, [open]);

  const path = location.pathname;
  const inCriticalFlow = HIDDEN_PATH_PREFIXES.some((p) =>
    p.endsWith("/") ? path.startsWith(p) : path === p || path.startsWith(p + "/"),
  );
  const pageHasHeader = PAGES_WITH_HEADER.some((p) => {
    if (p === "/") return path === "/";
    return path === p || path.startsWith(p + "/");
  });
  const hideButton = inCriticalFlow || pageHasHeader || otherDialogOpen;

  useEffect(() => {
    setOpen(false);
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
    window.scrollTo({ top: 0, left: 0 });
  }, [path]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("alivia:open-global-menu", handler);
    return () => window.removeEventListener("alivia:open-global-menu", handler);
  }, []);

  const navigateAfterSheetClose = (target: string) => {
    const performNavigation = () => {
      navigate(target);
      window.scrollTo({ top: 0, left: 0 });
      document.documentElement.scrollLeft = 0;
      document.body.scrollLeft = 0;
    };

    if (open) {
      setOpen(false);
      window.setTimeout(performNavigation, 0);
      return;
    }

    performNavigation();
  };

  const go = (target: string) => {
    navigateAfterSheetClose(target);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/");
  };

  const groupLabel = (text: string) => (
    <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
      {text}
    </div>
  );

  const itemCls = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left w-full";
  const primaryCls = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors text-left w-full";

  return (
    <>
      {!hideButton && (
        <Button
          variant="default"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Menu"
          className="fixed top-3 right-3 z-[60] h-10 w-10 rounded-full shadow-lg bg-background/95 backdrop-blur border border-border text-foreground hover:bg-muted"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border/40">
            <SheetTitle className="flex items-center gap-2">
              <img src={logoAlivia} alt="Aliv.iA" className="h-8" />
              <span className="text-lg font-bold text-foreground">Aliv.iA</span>
            </SheetTitle>
          </SheetHeader>

          <nav className="flex flex-col gap-0.5 p-2 overflow-y-auto flex-1">
            {user && path.startsWith("/dashboard") && (
              <ClinicContextSelector variant="list" onSelected={() => setOpen(false)} />
            )}
            {user && (
              <button onClick={() => go("/dashboard")} className={primaryCls}>
                <LayoutDashboard className="h-4 w-4" />
                {L.dashboard}
              </button>
            )}
            <button onClick={() => go("/")} className={itemCls}>
              <Home className="h-4 w-4" />
              {L.home}
            </button>

            {groupLabel(L.groupExplore)}
            <button onClick={() => go("/para-pacientes")} className={itemCls}>
              <Heart className="h-4 w-4" />
              {L.patients}
            </button>
            <button onClick={() => go("/profissionais")} className={itemCls}>
              <Stethoscope className="h-4 w-4" />
              {L.professionals}
            </button>
            <button onClick={() => go("/academico")} className={itemCls}>
              <GraduationCap className="h-4 w-4" />
              {L.academic}
            </button>
            <button onClick={() => go("/clinica")} className={itemCls}>
              <Building2 className="h-4 w-4" />
              {L.clinic}
            </button>
            <button onClick={() => go("/blog")} className={itemCls}>
              <BookOpen className="h-4 w-4" />
              {L.blog}
            </button>

            {groupLabel(L.groupAccount)}
            {user && (
              <button onClick={() => go("/conta")} className={itemCls}>
                <UserCog className="h-4 w-4" />
                {L.account}
              </button>
            )}
            <button
              onClick={() => {
                setOpen(false);
                setInstallOpen(true);
              }}
              className={itemCls}
            >
              <Smartphone className="h-4 w-4" />
              {L.install}
            </button>
            <button
              onClick={() => {
                go(path.startsWith("/clinica") ? "/clinica/suporte" : "/suporte");
              }}
              className={itemCls}
            >
              <HelpCircle className="h-4 w-4" />
              {L.support}
            </button>
            <button onClick={() => go("/privacidade")} className={itemCls}>
              <Shield className="h-4 w-4" />
              {L.privacy}
            </button>
            <LanguageSelector className={`${itemCls} justify-start w-full h-auto`} onSelected={() => setOpen(false)} />
            {user && (
              <button onClick={() => go("/admin")} className={itemCls}>
                <ShieldCheck className="h-4 w-4" />
                {L.admin}
              </button>
            )}

            <div className="my-2 border-t border-border/40" />

            {user ? (
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors text-left"
              >
                <LogOut className="h-4 w-4" />
                {L.signout}
              </button>
            ) : (
              <button
                onClick={() => go("/auth")}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
              >
                {L.signin}
              </button>
            )}
          </nav>

          <div className="border-t border-border/40 p-4 text-center">
            <AppVersionBadge />
          </div>
        </SheetContent>
      </Sheet>

      <InstallAppDialog open={installOpen} onOpenChange={setInstallOpen} />
    </>
  );
};

export default GlobalMobileMenu;
