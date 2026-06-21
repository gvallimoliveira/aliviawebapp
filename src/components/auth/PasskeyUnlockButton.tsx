import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint } from "lucide-react";
import {
  hasEnrolledPasskey,
  isPlatformAuthenticatorAvailable,
  unlockWithPasskey,
  getEnrolledEmail,
} from "@/lib/passkey";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Botão "Entrar com biometria" exibido na tela de Auth quando
 * existe um passkey já registrado neste navegador.
 */
export default function PasskeyUnlockButton({
  redirectTo = "/dashboard",
}: {
  redirectTo?: string;
}) {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { language } = useLanguage();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supported = await isPlatformAuthenticatorAvailable();
        if (!supported) return;
        const enrolled = await hasEnrolledPasskey();
        if (!enrolled) return;
        const em = await getEnrolledEmail();
        if (cancelled) return;
        setEmail(em);
        setShow(true);
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!show) return null;

  const labels = {
    pt: { btn: "Entrar com biometria", as: "Entrar como" },
    en: { btn: "Sign in with biometrics", as: "Sign in as" },
    es: { btn: "Entrar con biometría", as: "Entrar como" },
  }[language as "pt" | "en" | "es"] ?? {
    btn: "Entrar com biometria",
    as: "Entrar como",
  };

  const handleUnlock = async () => {
    setBusy(true);
    try {
      const res = await unlockWithPasskey();
      if (res.ok) {
        navigate(redirectTo, { replace: true });
      } else {
        toast.error((res as { error?: string }).error || "Falha na biometria.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4">
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 border-primary/40 hover:bg-primary/5"
        onClick={handleUnlock}
        disabled={busy}
      >
        <Fingerprint className="h-4 w-4 text-primary" />
        <span className="flex flex-col items-start leading-tight">
          <span className="font-medium">{labels.btn}</span>
          {email && (
            <span className="text-[11px] text-muted-foreground font-normal">
              {labels.as} {email}
            </span>
          )}
        </span>
      </Button>
    </div>
  );
}
