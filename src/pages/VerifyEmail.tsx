import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import logoAlivia from "@/assets/logo-alivia.png";

const RESEND_COOLDOWN_SECONDS = 60;

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { language, toggleLanguage } = useLanguage();
  const { user } = useAuth();

  const emailFromState = (location.state as any)?.email as string | undefined;
  const [email] = useState(emailFromState || "");
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);

  // If user is already confirmed and logged in, send them to dashboard
  useEffect(() => {
    if (user?.email_confirmed_at) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // Periodic check + on-focus check: if the user confirmed the email in
  // another tab, refresh the session and redirect to /dashboard automatically.
  useEffect(() => {
    let cancelled = false;

    const checkConfirmation = async () => {
      try {
        const { data: { user: refreshed } } = await supabase.auth.getUser();
        if (!cancelled && refreshed?.email_confirmed_at) {
          navigate("/dashboard", { replace: true });
        }
      } catch {
        /* noop — network blip, will retry next tick */
      }
    };

    const interval = window.setInterval(checkConfirmation, 5000);
    const onFocus = () => checkConfirmation();
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkConfirmation();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    // Run once immediately on mount
    checkConfirmation();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0 || resending) return;
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        toast({
          title: language === "pt" ? "Não foi possível reenviar" : "Could not resend",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: language === "pt" ? "Email reenviado" : "Email resent",
          description: language === "pt"
            ? `Reenviamos o link para ${email}.`
            : `We resent the link to ${email}.`,
        });
        setCooldown(RESEND_COOLDOWN_SECONDS);
      }
    } finally {
      setResending(false);
    }
  };

  const labels = {
    pt: {
      title: "Confirme seu email",
      subtitle: "Enviamos um link de confirmação para",
      noEmail: "seu email",
      step1: "Abra a caixa de entrada do seu email",
      step2: 'Clique no link "Confirmar conta" enviado por nós',
      step3: "Você será redirecionado automaticamente para o app",
      tip: "Não recebeu? Verifique a pasta de spam ou promoções.",
      resend: "Reenviar email",
      resendIn: (s: number) => `Reenviar em ${s}s`,
      backToLogin: "Voltar para o login",
      changeEmail: "Usar outro email",
    },
    es: {
      title: "Confirma tu email",
      subtitle: "Enviamos un enlace de confirmación a",
      noEmail: "tu email",
      step1: "Abre la bandeja de entrada de tu email",
      step2: 'Haz clic en el enlace "Confirmar cuenta" que enviamos',
      step3: "Serás redirigido automáticamente a la aplicación",
      tip: "¿No lo recibiste? Revisa la carpeta de spam o promociones.",
      resend: "Reenviar email",
      resendIn: (s: number) => `Reenviar en ${s}s`,
      backToLogin: "Volver al inicio de sesión",
      changeEmail: "Usar otro email",
    },
    en: {
      title: "Confirm your email",
      subtitle: "We sent a confirmation link to",
      noEmail: "your email",
      step1: "Open your email inbox",
      step2: 'Click the "Confirm account" link we sent',
      step3: "You'll be redirected to the app automatically",
      tip: "Didn't get it? Check your spam or promotions folder.",
      resend: "Resend email",
      resendIn: (s: number) => `Resend in ${s}s`,
      backToLogin: "Back to login",
      changeEmail: "Use a different email",
    },
  } as const;

  const l = labels[language as keyof typeof labels] || labels.pt;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
            <span className="text-xl font-bold text-foreground">Aliv.iA</span>
          </button>
          <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
            <Globe className="h-4 w-4" />
            {language.toUpperCase()}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-border/60 shadow-lg">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{l.title}</CardTitle>
            <CardDescription className="text-base">
              {l.subtitle}{" "}
              <span className="font-semibold text-foreground break-all">
                {email || l.noEmail}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ol className="space-y-3">
              {[l.step1, l.step2, l.step3].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    {i + 1}
                  </span>
                  <span className="text-sm text-muted-foreground pt-0.5">{step}</span>
                </li>
              ))}
            </ol>

            <div className="rounded-lg bg-muted/50 border border-border/60 p-3 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">{l.tip}</p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={handleResend}
                disabled={!email || cooldown > 0 || resending}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${resending ? "animate-spin" : ""}`} />
                {cooldown > 0 ? l.resendIn(cooldown) : l.resend}
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                variant="ghost"
                className="w-full"
              >
                {l.backToLogin}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default VerifyEmail;
