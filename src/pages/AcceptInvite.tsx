import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle, XCircle, Loader2 } from "lucide-react";
import logoAlivia from "@/assets/logo-alivia.png";

const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "needAuth">("loading");
  const [clinicName, setClinicName] = useState("");
  const [role, setRole] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const lang = language as "pt" | "en" | "es";

  useEffect(() => {
    if (authLoading) return;
    if (!token) { setStatus("error"); setErrorMsg("Token inválido"); return; }
    if (!user) { setStatus("needAuth"); return; }

    const accept = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("accept-clinic-invite", {
          body: { invite_token: token },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
        setClinicName(data.clinic_name || "");
        setRole(data.role || "");
        setStatus("success");
      } catch (err: any) {
        setErrorMsg(err.message);
        setStatus("error");
      }
    };
    accept();
  }, [user, authLoading, token]);

  const labels = {
    pt: { needAuth: "Faça login para aceitar o convite", login: "Entrar", success: "Convite aceito!", joined: "Você agora faz parte de", goToDash: "Ir ao Painel", error: "Erro ao aceitar convite", tryAgain: "Voltar" },
    en: { needAuth: "Sign in to accept the invitation", login: "Sign in", success: "Invite accepted!", joined: "You are now part of", goToDash: "Go to Dashboard", error: "Error accepting invite", tryAgain: "Go back" },
    es: { needAuth: "Inicia sesión para aceptar la invitación", login: "Iniciar sesión", success: "¡Invitación aceptada!", joined: "Ahora formas parte de", goToDash: "Ir al Panel", error: "Error al aceptar invitación", tryAgain: "Volver" },
  };
  const t = labels[lang];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="flex items-center gap-2 mb-8">
        <img src={logoAlivia} alt="Aliv.iA" className="h-10" />
        <span className="text-2xl font-bold text-foreground">Aliv.iA Clinic</span>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Building2 className="h-5 w-5" />
            {status === "loading" && (lang === "pt" ? "Processando..." : "Processing...")}
            {status === "needAuth" && t.needAuth}
            {status === "success" && t.success}
            {status === "error" && t.error}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />}

          {status === "needAuth" && (
            <Button onClick={() => navigate(`/auth?redirect=/aceitar-convite?token=${token}`)} className="w-full">
              {t.login}
            </Button>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <p className="text-muted-foreground">{t.joined} <strong>{clinicName}</strong></p>
              {role && <p className="text-sm text-muted-foreground capitalize">{role}</p>}
              <Button onClick={() => navigate("/dashboard")} className="w-full">{t.goToDash}</Button>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-sm text-destructive">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate("/")} className="w-full">{t.tryAgain}</Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
