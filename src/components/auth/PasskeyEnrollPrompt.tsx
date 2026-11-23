import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useClinic } from "@/contexts/ClinicContext";
import {
  enrollPasskey,
  hasEnrolledPasskey,
  isPlatformAuthenticatorAvailable,
  shouldShowEnrollPrompt,
  dismissEnrollPrompt,
} from "@/lib/passkey";
import { toast } from "sonner";
import { ENABLE_GUIDED_TOUR } from "@/lib/featureFlags";

/**
 * Mostra um diálogo único oferecendo cadastrar passkey (digital/face)
 * para desbloqueio rápido. Aparece após login e fica oculto se:
 *  - dispositivo não suporta autenticador biométrico;
 *  - usuário já tem passkey cadastrado neste navegador;
 *  - usuário dispensou nas últimas 7 dias ou marcou "não perguntar".
 */
export default function PasskeyEnrollPrompt() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { loading: clinicLoading, needsContextSelection, activeContext, activeClinic } = useClinic();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Never compete with other primary surfaces (profile selector, onboarding
    // tour, any open modal). Show one popup at a time — wait until the screen
    // is clear, then open.
    const currentOnboardingContext = () => {
      if (activeContext === "clinic" && activeClinic) return "clinic";
      if (activeContext === "professional" || activeContext === "professional_demo") return "professional";
      return "personal";
    };

    const isScreenBusy = () => {
      if (typeof document === "undefined") return true;
      const path = window.location.pathname;
      // Profile selector lives at the gateway root.
      if (path === "/" || path === "/index") return true;
      // On dashboard, biometrics is intentionally the LAST popup:
      // 1) wait for clinic/profile context restore or selector;
      // 2) wait for that context's first-run tutorial to finish/skip;
      // 3) only then ask for passkey enrollment.
      if (path === "/dashboard") {
        if (clinicLoading || needsContextSelection) return true;
        const onboardingKey = `onboarding_${currentOnboardingContext()}_completed_v2`;
        if (ENABLE_GUIDED_TOUR && localStorage.getItem(onboardingKey) !== "true") return true;
      }
      // Any open Radix dialog/sheet/alert dialog blocks us.
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) return true;
      // Onboarding tour overlay marker.
      if (document.querySelector('[data-profile-context-selector], [data-onboarding-step], [data-onboarding-overlay]')) return true;
      return false;
    };

    const tryOpen = async () => {
      if (cancelled) return;
      try {
        if (!shouldShowEnrollPrompt(user.id)) return;
        const platformOk = await isPlatformAuthenticatorAvailable();
        if (!platformOk) return;
        const already = await hasEnrolledPasskey();
        if (already) return;
        if (isScreenBusy()) {
          timer = setTimeout(tryOpen, 2000);
          return;
        }
        if (!cancelled) setOpen(true);
      } catch {
        /* noop */
      }
    };

    timer = setTimeout(tryOpen, 1500);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [user, clinicLoading, needsContextSelection, activeContext, activeClinic]);

  if (!user) return null;

  const t = {
    pt: {
      title: "Ativar login com biometria?",
      desc: "Use a digital ou Face ID do seu dispositivo para desbloquear sua conta na próxima vez, sem digitar senha. A chave fica apenas neste navegador.",
      bullet1: "Mais rápido nas próximas entradas",
      bullet2: "Sua biometria nunca sai do dispositivo",
      bullet3: "Você pode remover quando quiser em Conta",
      enable: "Ativar agora",
      later: "Agora não",
      never: "Não perguntar mais",
      success: "Passkey ativado! Da próxima vez entre com biometria.",
      error: "Não foi possível ativar o passkey.",
    },
    en: {
      title: "Enable biometric login?",
      desc: "Use your device fingerprint or Face ID to unlock your account next time without typing a password. The key stays on this browser only.",
      bullet1: "Faster next sign-ins",
      bullet2: "Your biometrics never leave the device",
      bullet3: "You can remove it anytime in Account",
      enable: "Enable now",
      later: "Not now",
      never: "Don't ask again",
      success: "Passkey enabled! Next time sign in with biometrics.",
      error: "Could not enable the passkey.",
    },
    es: {
      title: "¿Activar inicio de sesión biométrico?",
      desc: "Usa la huella o Face ID de tu dispositivo para desbloquear tu cuenta la próxima vez sin escribir contraseña. La clave queda solo en este navegador.",
      bullet1: "Más rápido en los próximos inicios",
      bullet2: "Tu biometría nunca sale del dispositivo",
      bullet3: "Puedes quitarla cuando quieras en Cuenta",
      enable: "Activar ahora",
      later: "Ahora no",
      never: "No preguntar más",
      success: "¡Passkey activado! La próxima vez entra con biometría.",
      error: "No se pudo activar el passkey.",
    },
  }[language as "pt" | "en" | "es"] ?? null;

  const L = t ?? {
    title: "Ativar login com biometria?",
    desc: "",
    bullet1: "",
    bullet2: "",
    bullet3: "",
    enable: "Ativar",
    later: "Agora não",
    never: "Não perguntar mais",
    success: "OK",
    error: "Erro",
  };

  const handleEnable = async () => {
    setBusy(true);
    try {
      const res = await enrollPasskey({
        userId: user.id,
        email: user.email ?? null,
        displayName: (user.user_metadata?.full_name as string) || user.email || null,
      });
      if (res.ok) {
        toast.success(L.success);
        setOpen(false);
      } else {
        toast.error((res as { error?: string }).error || L.error);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLater = () => {
    dismissEnrollPrompt(false);
    setOpen(false);
  };
  const handleNever = () => {
    dismissEnrollPrompt(true);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleLater()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Fingerprint className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{L.title}</DialogTitle>
          <DialogDescription className="text-center">{L.desc}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />{L.bullet1}</li>
          <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />{L.bullet2}</li>
          <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 mt-0.5 text-primary shrink-0" />{L.bullet3}</li>
        </ul>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={handleNever} disabled={busy} className="sm:mr-auto">
            {L.never}
          </Button>
          <Button variant="outline" onClick={handleLater} disabled={busy}>
            {L.later}
          </Button>
          <Button onClick={handleEnable} disabled={busy}>
            <Fingerprint className="h-4 w-4 mr-2" />
            {busy ? "..." : L.enable}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
