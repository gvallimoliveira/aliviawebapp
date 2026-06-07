import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import logoAlivia from "@/assets/logo-alivia.png";

type Status = "processing" | "success" | "error";

const labels = {
  pt: {
    processing: "Confirmando seu email...",
    success: "Email confirmado!",
    successDesc: "Você será redirecionado para o app em instantes.",
    errorTitle: "Não foi possível confirmar",
    errorExpired: "Este link expirou ou já foi utilizado. Solicite um novo email de confirmação.",
    goToLogin: "Ir para o login",
    goToDashboard: "Ir para o app",
    resend: "Reenviar email de confirmação",
  },
  es: {
    processing: "Confirmando tu email...",
    success: "¡Email confirmado!",
    successDesc: "Serás redirigido a la aplicación en un momento.",
    errorTitle: "No se pudo confirmar",
    errorExpired: "Este enlace expiró o ya fue utilizado. Solicita un nuevo correo de confirmación.",
    goToLogin: "Ir al inicio de sesión",
    goToDashboard: "Ir a la aplicación",
    resend: "Reenviar correo de confirmación",
  },
  en: {
    processing: "Confirming your email...",
    success: "Email confirmed!",
    successDesc: "You'll be redirected to the app shortly.",
    errorTitle: "Could not confirm",
    errorExpired: "This link expired or has already been used. Request a new confirmation email.",
    goToLogin: "Go to login",
    goToDashboard: "Go to the app",
    resend: "Resend confirmation email",
  },
} as const;

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language } = useLanguage();
  const [status, setStatus] = useState<Status>("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const l = labels[language as keyof typeof labels] || labels.pt;

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      try {
        // Case 1: Error returned in query (e.g. ?error=access_denied&error_description=...)
        const errParam = searchParams.get("error") || searchParams.get("error_code");
        const errDesc = searchParams.get("error_description");
        if (errParam) {
          if (!cancelled) {
            setStatus("error");
            setErrorMessage(errDesc ? decodeURIComponent(errDesc.replace(/\+/g, " ")) : l.errorExpired);
          }
          return;
        }

        // Case 2: PKCE flow — ?code=... must be exchanged for a session
        const code = searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (!cancelled) {
              setStatus("error");
              setErrorMessage(error.message || l.errorExpired);
            }
            return;
          }
        }

        // Case 3: Implicit flow — tokens are in window.location.hash and the
        // supabase-js client (with detectSessionInUrl: true by default) will
        // pick them up automatically. We just need to wait for the session.

        // Poll for session up to ~10s (covers both PKCE post-exchange and implicit)
        let session = null;
        for (let i = 0; i < 20 && !cancelled; i += 1) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            session = data.session;
            break;
          }
          await new Promise((r) => setTimeout(r, 500));
        }

        if (cancelled) return;

        if (session) {
          // Persist signup_origin captured before the OAuth redirect so the
          // Dashboard knows whether to send the user to the professional /
          // clinic flow even on a fresh device where sessionStorage might
          // not survive the round-trip. Prioriza ?signup_origin= da URL
          // (sobrevive ao redirect em qualquer browser/PWA) e cai para
          // sessionStorage como fallback.
          try {
            const urlOrigin = searchParams.get("signup_origin");
            let storedOrigin: string | null = null;
            try { storedOrigin = sessionStorage.getItem("signupOrigin"); } catch {}
            const origin = urlOrigin || storedOrigin;
            if (origin && session.user?.id) {
              await (supabase as any)
                .from("profiles")
                .update({ signup_origin: origin })
                .eq("user_id", session.user.id);
              // Mantém em sessionStorage para o Dashboard consumir logo após.
              try { sessionStorage.setItem("signupOrigin", origin); } catch {}
            }
          } catch { /* noop */ }

          // Clean any leftover hash/query so refresh doesn't re-trigger
          window.history.replaceState({}, document.title, "/auth/callback");
          setStatus("success");
          setTimeout(() => {
            if (!cancelled) navigate("/dashboard", { replace: true });
          }, 1200);
        } else {
          setStatus("error");
          setErrorMessage(l.errorExpired);
        }
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setErrorMessage((e as Error)?.message || l.errorExpired);
        }
      }
    };

    handleCallback();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams, l.errorExpired]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2">
            <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
            <span className="text-xl font-bold text-foreground">Aliv.iA</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-border/60 shadow-lg">
          <CardHeader className="text-center space-y-3">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {status === "processing" && <Loader2 className="h-8 w-8 text-primary animate-spin" />}
              {status === "success" && <CheckCircle2 className="h-8 w-8 text-primary" />}
              {status === "error" && <AlertCircle className="h-8 w-8 text-destructive" />}
            </div>
            <CardTitle className="text-2xl">
              {status === "processing" && l.processing}
              {status === "success" && l.success}
              {status === "error" && l.errorTitle}
            </CardTitle>
            {status === "success" && (
              <CardDescription className="text-base">{l.successDesc}</CardDescription>
            )}
            {status === "error" && errorMessage && (
              <CardDescription className="text-base">{errorMessage}</CardDescription>
            )}
          </CardHeader>
          {status !== "processing" && (
            <CardContent className="space-y-2">
              {status === "success" ? (
                <Button onClick={() => navigate("/dashboard", { replace: true })} className="w-full">
                  {l.goToDashboard}
                </Button>
              ) : (
                <>
                  <Button onClick={() => navigate("/verificar-email", { replace: true })} className="w-full">
                    {l.resend}
                  </Button>
                  <Button onClick={() => navigate("/auth", { replace: true })} variant="ghost" className="w-full">
                    {l.goToLogin}
                  </Button>
                </>
              )}
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  );
};

export default AuthCallback;
