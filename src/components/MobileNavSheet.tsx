import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BookOpen, Building2, Globe, GraduationCap, Heart, HelpCircle, Home, LayoutDashboard,
  LogOut, Menu, Shield, ShieldCheck, Smartphone, Stethoscope, UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import logoAlivia from "@/assets/logo-alivia.png";
import InstallAppDialog from "@/components/InstallAppDialog";
import LanguageSelector from "@/components/LanguageSelector";

/**
 * Reusable mobile navigation Sheet — matches the structure used in Header.tsx
 * and GlobalMobileMenu.tsx so every page shows the same items.
 *
 * Use it inside pages that have their own custom header (Gateway, ClinicLanding),
 * by rendering <MobileNavSheet /> and triggering it via the included default
 * hamburger button, or wiring `open`/`onOpenChange` externally.
 */
interface Props {
  /** When provided, makes the component fully controlled (no internal trigger). */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  /** Hide the default hamburger trigger (use when caller renders its own). */
  hideTrigger?: boolean;
  triggerClassName?: string;
}

const MobileNavSheet = ({ open: controlledOpen, onOpenChange, hideTrigger, triggerClassName }: Props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, toggleLanguage, language } = useLanguage();
  const { user, signOut } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen! : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  const navigateAfterSheetClose = (path: string) => {
    const performNavigation = () => {
      navigate(path);
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

  const go = (path: string) => {
    navigateAfterSheetClose(path);
  };

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    window.location.replace("/");
  };

  const item = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left w-full";
  const primary = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors text-left w-full";
  const groupCls = "px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70";

  const L = {
    pt: { dashboard: "Meu Painel", home: "Início", explore: "Conheça o Aliv.iA", patients: "Para Pacientes", professionals: "Para Profissionais", academic: "Aliv.iA Acadêmico", clinic: "Aliv.iA Clínica", account: "Conta & Utilidades", myAccount: "Minha Conta", install: "Instalar como App", support: "Suporte", privacy: "Privacidade", lang: "Idioma: Português", signout: "Sair" },
    en: { dashboard: "My Dashboard", home: "Home", explore: "Discover Aliv.iA", patients: "For Patients", professionals: "For Professionals", academic: "Aliv.iA Academic", clinic: "Aliv.iA Clinic", account: "Account & Utilities", myAccount: "My Account", install: "Install as App", support: "Support", privacy: "Privacy", lang: "Language: English", signout: "Sign out" },
    es: { dashboard: "Mi Panel", home: "Inicio", explore: "Conoce Aliv.iA", patients: "Para Pacientes", professionals: "Para Profesionales", academic: "Aliv.iA Académico", clinic: "Aliv.iA Clínica", account: "Cuenta y Utilidades", myAccount: "Mi Cuenta", install: "Instalar como App", support: "Soporte", privacy: "Privacidad", lang: "Idioma: Español", signout: "Salir" },
  }[language as "pt" | "en" | "es"] || ({} as any);

  const langNext = language === "pt" ? "EN" : language === "en" ? "ES" : "PT";
  const supportPath = location.pathname.startsWith("/clinica") ? "/clinica/suporte" : "/suporte";

  return (
    <>
      {!hideTrigger && !isControlled && (
        <Button
          variant="ghost"
          size="icon"
          className={triggerClassName ?? "md:hidden"}
          onClick={() => setOpen(true)}
          aria-label="Menu"
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
            {user && (
              <button onClick={() => go("/dashboard")} className={primary}>
                <LayoutDashboard className="h-4 w-4" />{L.dashboard}
              </button>
            )}
            <button onClick={() => go("/")} className={item}>
              <Home className="h-4 w-4" />{L.home}
            </button>

            <div className={groupCls}>{L.explore}</div>
            <button onClick={() => go("/para-pacientes")} className={item}>
              <Heart className="h-4 w-4" />{L.patients}
            </button>
            <button onClick={() => go("/profissionais")} className={item}>
              <Stethoscope className="h-4 w-4" />{t("nav.professional")}
            </button>
            <button onClick={() => go("/academico")} className={item}>
              <GraduationCap className="h-4 w-4" />{L.academic}
            </button>
            <button onClick={() => go("/clinica")} className={item}>
              <Building2 className="h-4 w-4" />{L.clinic}
            </button>
            <button onClick={() => go("/blog")} className={item}>
              <BookOpen className="h-4 w-4" />{t("blog.title")}
            </button>

            <div className={groupCls}>{L.account}</div>
            {user && (
              <button onClick={() => go("/conta")} className={item}>
                <UserCog className="h-4 w-4" />{L.myAccount}
              </button>
            )}
            <button onClick={() => { setOpen(false); setInstallOpen(true); }} className={item}>
              <Smartphone className="h-4 w-4" />{L.install}
            </button>
            <button onClick={() => go(supportPath)} className={item}>
              <HelpCircle className="h-4 w-4" />{t("support.badge")}
            </button>
            <button onClick={() => go("/privacidade")} className={item}>
              <Shield className="h-4 w-4" />{L.privacy}
            </button>
            <LanguageSelector className={`${item} justify-start w-full h-auto`} onSelected={() => setOpen(false)} />
            {user && (
              <button onClick={() => go("/admin")} className={item}>
                <ShieldCheck className="h-4 w-4" />Admin
              </button>
            )}

            <div className="my-2 border-t border-border/40" />

            {user ? (
              <button onClick={handleSignOut} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors text-left">
                <LogOut className="h-4 w-4" />{L.signout}
              </button>
            ) : (
              <button onClick={() => go("/auth")} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors text-left">
                {t("nav.login")}
              </button>
            )}
          </nav>
        </SheetContent>
      </Sheet>

      <InstallAppDialog open={installOpen} onOpenChange={setInstallOpen} />
    </>
  );
};

export default MobileNavSheet;
