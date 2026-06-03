import { useEffect, useState } from "react";
import { MailWarning, X, RefreshCw, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  user?: { id?: string; email?: string | null; email_confirmed_at?: string | null } | null;
}

const STORAGE_KEY_PREFIX = "confirm_email_banner_dismissed_";
const RESEND_COOLDOWN = 60;

/**
 * Non-blocking reminder for users whose email is not yet confirmed.
 * Does NOT gate any feature — only nudges to ensure they receive
 * follow-ups, password recovery and receipts.
 */
const ConfirmEmailBanner = ({ user }: Props) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isPt = language === "pt";
  const [dismissed, setDismissed] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  const needsConfirm = !!user?.id && !!user?.email && !user?.email_confirmed_at;

  useEffect(() => {
    if (!needsConfirm || !user?.id) return;
    const key = `${STORAGE_KEY_PREFIX}${user.id}`;
    setDismissed(localStorage.getItem(key) === "true");
  }, [needsConfirm, user?.id]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  if (!needsConfirm || dismissed) return null;

  const handleDismiss = () => {
    if (!user?.id) return;
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${user.id}`, "true");
    setDismissed(true);
  };

  const handleResend = async () => {
    if (!user?.email || cooldown > 0 || resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        toast({
          title: isPt ? "Não foi possível reenviar" : "Could not resend",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: isPt ? "Email enviado" : "Email sent",
          description: isPt
            ? `Reenviamos o link para ${user.email}. Verifique também a pasta de spam.`
            : `We resent the link to ${user.email}. Check your spam folder too.`,
        });
        setCooldown(RESEND_COOLDOWN);
      }
    } finally {
      setResending(false);
    }
  };

  const t = isPt
    ? {
        title: "Confirme seu email (opcional, mas recomendado)",
        desc: "Garanta que você receba relatórios, lembretes e a recuperação de senha em caso de esquecimento.",
        cta: "Reenviar email",
        cooldown: (s: number) => `Reenviar em ${s}s`,
        dismiss: "Agora não",
      }
    : {
        title: "Confirm your email (optional, recommended)",
        desc: "Make sure you receive reports, reminders and password recovery if you ever forget your password.",
        cta: "Resend email",
        cooldown: (s: number) => `Resend in ${s}s`,
        dismiss: "Not now",
      };

  return (
    <div className="relative rounded-xl border border-sky-300/60 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-950/30 dark:to-cyan-950/30 dark:border-sky-700/40 p-4 shadow-sm">
      <button
        onClick={handleDismiss}
        aria-label={t.dismiss}
        className="absolute top-2 right-2 p-1 rounded-md text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="shrink-0 mt-0.5 rounded-full bg-sky-100 dark:bg-sky-900/40 p-2">
          <MailWarning className="h-5 w-5 text-sky-700 dark:text-sky-300" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sky-900 dark:text-sky-100 text-sm sm:text-base">
            {t.title}
          </h3>
          <p className="text-xs sm:text-sm text-sky-800/90 dark:text-sky-200/80 mt-1 break-all">
            {t.desc} <span className="font-medium">{user?.email}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="gap-1.5 bg-sky-600 hover:bg-sky-700 text-white"
            >
              {resending ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {cooldown > 0 ? t.cooldown(cooldown) : t.cta}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="text-sky-800 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/40"
            >
              {t.dismiss}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmailBanner;
