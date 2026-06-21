import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fingerprint, ShieldCheck, Trash2 } from "lucide-react";
import {
  enrollPasskey,
  hasEnrolledPasskey,
  isPlatformAuthenticatorAvailable,
  removeEnrolledPasskey,
} from "@/lib/passkey";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export default function PasskeyAccountCard() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const s = await isPlatformAuthenticatorAvailable();
      setSupported(s);
      setEnrolled(s ? await hasEnrolledPasskey() : false);
    } catch {
      setSupported(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const L = {
    pt: {
      title: "Login com biometria (passkey)",
      desc: "Use digital ou Face ID para entrar mais rápido neste navegador, sem digitar a senha.",
      unsupported: "Este navegador/dispositivo não suporta passkey biométrico.",
      enabled: "Passkey ativo neste navegador.",
      enable: "Ativar passkey",
      remove: "Remover passkey",
      enroll_ok: "Passkey ativado com sucesso!",
      remove_ok: "Passkey removido deste navegador.",
      fail: "Não foi possível concluir a operação.",
    },
    en: {
      title: "Biometric sign-in (passkey)",
      desc: "Use fingerprint or Face ID to sign in faster on this browser without typing your password.",
      unsupported: "This browser/device does not support biometric passkeys.",
      enabled: "Passkey active on this browser.",
      enable: "Enable passkey",
      remove: "Remove passkey",
      enroll_ok: "Passkey enabled!",
      remove_ok: "Passkey removed from this browser.",
      fail: "Operation failed.",
    },
    es: {
      title: "Inicio biométrico (passkey)",
      desc: "Usa huella o Face ID para entrar más rápido en este navegador, sin escribir contraseña.",
      unsupported: "Este navegador/dispositivo no soporta passkey biométrico.",
      enabled: "Passkey activo en este navegador.",
      enable: "Activar passkey",
      remove: "Quitar passkey",
      enroll_ok: "¡Passkey activado!",
      remove_ok: "Passkey eliminado de este navegador.",
      fail: "No se pudo completar la operación.",
    },
  }[language as "pt" | "en" | "es"] ?? null;

  if (!L) return null;

  const handleEnable = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const res = await enrollPasskey({
        userId: user.id,
        email: user.email ?? null,
        displayName: (user.user_metadata?.full_name as string) || user.email || null,
      });
      if (res.ok) {
        toast.success(L.enroll_ok);
        await refresh();
      } else {
        toast.error((res as { error?: string }).error || L.fail);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    try {
      await removeEnrolledPasskey();
      toast.success(L.remove_ok);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-primary" />
          {L.title}
        </CardTitle>
        <CardDescription>{L.desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!supported ? (
          <p className="text-sm text-muted-foreground">{L.unsupported}</p>
        ) : enrolled ? (
          <>
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              {L.enabled}
            </div>
            <Button variant="outline" onClick={handleRemove} disabled={busy} className="gap-2">
              <Trash2 className="h-4 w-4" />
              {L.remove}
            </Button>
          </>
        ) : (
          <Button onClick={handleEnable} disabled={busy} className="gap-2">
            <Fingerprint className="h-4 w-4" />
            {L.enable}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
