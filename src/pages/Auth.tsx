import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, ArrowLeft, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, Stethoscope, Building2, GraduationCap, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoAlivia from "@/assets/logo-alivia.png";
import { isValidEmailFormat, suggestEmailFix } from "@/lib/emailValidation";
import { supabase } from "@/integrations/supabase/client";
import PasskeyUnlockButton from "@/components/auth/PasskeyUnlockButton";
import { INVITE_PARAM } from "@/lib/clinicInvite";
import { CLINIC_TRIAL_ENTRY, readPendingClinicTrial } from "@/lib/clinicTrialEntry";

const INVITE_ROLE_LABELS: Record<string, Record<"pt" | "en" | "es", string>> = {
  owner: { pt: "Proprietário", en: "Owner", es: "Propietario" },
  admin: { pt: "Administrador", en: "Administrator", es: "Administrador" },
  therapist: { pt: "Fisioterapeuta", en: "Physiotherapist", es: "Fisioterapeuta" },
  intern: { pt: "Estagiário", en: "Intern", es: "Practicante" },
  secretary: { pt: "Secretária", en: "Secretary", es: "Secretaria" },
  osteopath: { pt: "Osteopata", en: "Osteopath", es: "Osteópata" },
  pilates_instructor: { pt: "Prof. Pilates", en: "Pilates Instructor", es: "Prof. Pilates" },
  doctor: { pt: "Médico", en: "Doctor", es: "Médico" },
  rpg_specialist: { pt: "RPG", en: "RPG Specialist", es: "RPG" },
  massage_therapist: { pt: "Massoterapeuta", en: "Massage Therapist", es: "Masajista" },
};



const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  // null = mostrar seletor de perfil (4 cards) antes do form de cadastro.
  const [signupProfile, setSignupProfile] = useState<"personal" | "professional" | "student" | "clinic" | null>(null);
  const [email, setEmail] = useState("");
  const [emailConfirm, setEmailConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { user, signIn, signUp, resetPassword } = useAuth();
  const { t, toggleLanguage, language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const trialEntry = new URLSearchParams(location.search).get("clinic_trial") === "1";
  useEffect(() => {
    if (!trialEntry) return;
    const pending = readPendingClinicTrial();
    if (!pending) return;
    setEmail(pending.email);
    setEmailConfirm(pending.email);
    setSignupProfile("clinic");
    setIsLogin(new URLSearchParams(location.search).get("mode") !== "signup");
  }, [trialEntry, location.search]);
  const redirectQuery = new URLSearchParams(location.search).get("redirect");
  // Only same-site paths ("/..."), never another site ("//x" or "https://x").
  const rawRedirect = trialEntry ? CLINIC_TRIAL_ENTRY : (location.state as any)?.redirectTo || redirectQuery || "/dashboard";
  const redirectTo = typeof rawRedirect === "string" && rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") && !rawRedirect.startsWith("/\\")
    ? rawRedirect
    : "/dashboard";
  const { toast } = useToast();
  const redirectingRef = useRef(false);

  // Convite direto da equipe da clínica: /auth?convite=TOKEN
  const inviteToken = new URLSearchParams(location.search).get(INVITE_PARAM);
  const [invite, setInvite] = useState<{ clinic_name: string; role: string; email: string } | null>(null);
  useEffect(() => {
    if (!inviteToken) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase.rpc as any)("get_clinic_invite_preview", { _token: inviteToken });
      const row = Array.isArray(data) ? data[0] : null;
      if (cancelled) return;
      if (!row || row.expired) {
        toast({
          title: language === "pt" ? "Convite inválido ou expirado" : language === "es" ? "Invitación inválida o expirada" : "Invalid or expired invite",
          description: language === "pt" ? "Peça um novo link ao gestor da clínica." : language === "es" ? "Pide un nuevo enlace al gestor." : "Ask the clinic manager for a new link.",
          variant: "destructive",
        });
        return;
      }
      setInvite(row);
      setIsLogin(false);
      setSignupProfile("clinic");
      setEmail(row.email);
      setEmailConfirm(row.email);
      try {
        sessionStorage.removeItem("forceStudentMode");
        sessionStorage.removeItem("forceProfessionalMode");
        sessionStorage.setItem("signupOrigin", "clinic");
      } catch { /* noop */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inviteToken]);
  const inviteRoleLabel = invite ? (INVITE_ROLE_LABELS[invite.role]?.[language as "pt" | "en" | "es"] ?? invite.role) : "";


  // Redirect if already logged in (on mount or when user populates)
  useEffect(() => {
    if (user && !redirectingRef.current) {
      redirectingRef.current = true;
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await resetPassword(email);
        if (error) {
          toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
          setLoading(false);
        } else {
          toast({ title: t("auth.reset_sent"), description: t("auth.reset_sent_desc") });
          setIsForgotPassword(false);
          setLoading(false);
        }
        return;
      }

      if (isLogin) {
        const { error, session } = await signIn(email, password);
        if (error) {
          toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
          setLoading(false);
          return;
        }
        if (session) {
          // Check if partner needs to reset default password
          if (session.user?.user_metadata?.force_password_reset) {
            redirectingRef.current = true;
            toast({
              title: language === "pt" ? "Redefinição obrigatória" : "Password reset required",
              description: language === "pt"
                ? "Por segurança, defina uma nova senha para sua conta."
                : "For security, please set a new password for your account.",
            });
            navigate("/reset-password", { replace: true, state: { forceReset: true } });
            return;
          }
          // Navigate immediately — don't rely solely on the useEffect, since the
          // user state update from signIn() is synchronous in the same render
          // and the effect may race with redirectingRef being set.
          redirectingRef.current = true;
          navigate(redirectTo, { replace: true });
          // Hard fallback (rare): if SPA navigation didn't take effect within
          // 2s (e.g. a route guard bounced back), force a full reload to the
          // intended destination so the user is not stranded on /auth.
          window.setTimeout(() => {
            if (window.location.pathname === "/auth") {
              window.location.replace(redirectTo);
            }
          }, 2000);
          return;
        }
        // No session and no error — should not happen, but reset.
        setLoading(false);
        return;
      }

      // Signup — email auto-confirm está ativo, então signUp() retorna sessão direto.
      // Validações extras só no signup para reduzir typos sem adicionar fricção no login.
      const normalizedEmail = email.trim().toLowerCase();
      if (!isValidEmailFormat(normalizedEmail)) {
        toast({
          title: t("auth.error"),
          description: language === "pt"
            ? "Email inválido. Verifique e tente novamente."
            : language === "es"
              ? "Email inválido. Verifique e intente nuevamente."
              : "Invalid email. Please check and try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      if (normalizedEmail !== emailConfirm.trim().toLowerCase()) {
        toast({
          title: t("auth.error"),
          description: language === "pt"
            ? "Os emails não coincidem. Confirme o endereço digitado."
            : language === "es"
              ? "Los emails no coinciden. Confirme el correo ingresado."
              : "Emails do not match. Please confirm the address.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const { error, session } = await signUp(normalizedEmail, password, fullName);
      // Persiste a origem do cadastro em profiles.signup_origin para que o
      // Dashboard saiba o contexto mesmo se sessionStorage sumir (refresh,
      // outro dispositivo, OAuth callback).
      const persistSignupOrigin = async () => {
        try {
          let origin: string | null = null;
          try { origin = sessionStorage.getItem("signupOrigin"); } catch {}
          if (!origin) return;
          const { data: sess } = await supabase.auth.getSession();
          const uid = sess.session?.user?.id;
          if (!uid) return;
          await (supabase as any)
            .from("profiles")
            .update({ signup_origin: origin })
            .eq("user_id", uid);
        } catch {}
      };
      if (error) {
        toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
        setLoading(false);
      } else if (session) {
        await persistSignupOrigin();
        toast({ title: t("auth.welcome"), description: t("auth.account_created") });
        redirectingRef.current = true;
        navigate(redirectTo, { replace: true });
      } else {
        // Fallback raríssimo: signUp sem sessão. Tenta signIn imediato.
        const { error: signInErr } = await signIn(normalizedEmail, password);
        if (signInErr) {
          toast({
            title: t("auth.error"),
            description: signInErr.message || "Não foi possível entrar. Tente fazer login.",
            variant: "destructive",
          });
          setLoading(false);
        } else {
          await persistSignupOrigin();
          toast({ title: t("auth.welcome"), description: t("auth.account_created") });
          redirectingRef.current = true;
          navigate(redirectTo, { replace: true });
        }
      }

    } catch (err: any) {
      toast({
        title: t("auth.error"),
        description: err?.message || "Erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Propaga signup_origin pela URL de callback. sessionStorage não é
      // confiável em redirects OAuth em alguns mobile browsers, então a
      // query string é o canal mais seguro.
      let originParam: string | null = null;
      try { originParam = sessionStorage.getItem("signupOrigin"); } catch {}

      // A sessão do Supabase fica presa ao ORIGIN onde os tokens são
      // gravados. Se o login começa em aliviawebapp.lovable.app e o
      // usuário depois abre aliviawebapp.com.br (bookmark/PWA), ele
      // aparece deslogado. Por isso canonizamos o domínio público:
      // qualquer login iniciado no *.lovable.app termina no domínio
      // oficial. Preview/localhost seguem no próprio origin.
      const currentOrigin = window.location.origin;
      const base = currentOrigin.includes("aliviawebapp.lovable.app")
        ? "https://aliviawebapp.com.br"
        : currentOrigin;

      // Sempre passamos por /auth/callback: rota pública que hidrata a
      // sessão (PKCE ou hash) antes de mandar para o dashboard.
      const redirectUri = originParam
        ? `${base}/auth/callback?signup_origin=${encodeURIComponent(originParam)}`
        : `${base}/auth/callback`;


      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectUri,
      });

      if (result.error) {
        toast({ title: t("auth.error"), description: String(result.error), variant: "destructive" });
        setLoading(false);
        return;
      }

      if (result.redirected) {
        return; // Browser will redirect
      }

      // Session set successfully, navigate
      redirectingRef.current = true;
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      toast({
        title: t("auth.error"),
        description: err?.message || "Erro ao conectar com o Google.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
            <span className="text-xl font-bold text-foreground">Aliv.iA</span>
          </button>
          <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
            <Globe className="h-4 w-4" />
            {t("nav.language")}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        {(() => {
          const showChooser = !isLogin && !isForgotPassword && signupProfile === null;
            const profileLabels = {
              pt: {
                title: "Crie sua conta",
                desc: "Escolha o perfil que melhor descreve você.",
                loginHint: "Já tem conta?",
                loginBtn: "Entrar",
                personal: "Pessoal",
                personalDesc: "Sou paciente / tenho uma dor para resolver",
                professional: "Profissional",
                professionalDesc: "Sou fisioterapeuta autônomo",
                student: "Estudante",
                studentDesc: "Sou aluno de fisioterapia (Alivia Acadêmico)",
                clinic: "Clínica",
                clinicDesc: "Gerencio ou sou integrante de uma clínica no Aliv.iA (fisio, secretária, estagiário)",
              },
              en: {
                title: "Create your account",
                desc: "Choose the profile that best describes you.",
                loginHint: "Already have an account?",
                loginBtn: "Sign in",
                personal: "Personal",
                personalDesc: "I am a patient with pain to solve",
                professional: "Professional",
                professionalDesc: "I am an autonomous physiotherapist",
                student: "Student",
                studentDesc: "I am a physiotherapy student (Alivia Academic)",
                clinic: "Clinic",
                clinicDesc: "I manage or belong to a clinic team on Aliv.iA (physio, secretary, intern)",
              },
              es: {
                title: "Crea tu cuenta",
                desc: "Elige el perfil que mejor te describe.",
                loginHint: "¿Ya tienes cuenta?",
                loginBtn: "Entrar",
                personal: "Personal",
                personalDesc: "Soy paciente / tengo dolor para resolver",
                professional: "Profesional",
                professionalDesc: "Soy fisioterapeuta autónomo",
                student: "Estudiante",
                studentDesc: "Soy estudiante de fisioterapia (Alivia Académico)",
                clinic: "Clínica",
                clinicDesc: "Gestiono o integro el equipo de una clínica en Aliv.iA (fisio, secretaria, practicante)",
              },
            }[language as "pt" | "en" | "es"];

          const pickProfile = (profile: "personal" | "professional" | "student" | "clinic") => {
            try {
              sessionStorage.removeItem("forceStudentMode");
              sessionStorage.removeItem("forceProfessionalMode");
              if (profile === "personal") sessionStorage.removeItem("signupOrigin");
              else if (profile === "professional") {
                sessionStorage.setItem("signupOrigin", "professional");
                sessionStorage.setItem("forceProfessionalMode", "1");
              } else if (profile === "student") {
                // Estudante usa o mesmo fluxo do profissional, mas com o
                // toggle "Sou estudante" pré-ativado em /professional/register.
                sessionStorage.setItem("signupOrigin", "professional");
                sessionStorage.setItem("forceStudentMode", "1");
              } else sessionStorage.setItem("signupOrigin", "clinic");
            } catch {}
            setSignupProfile(profile);
          };

          return (
        <Card className={`w-full ${showChooser ? "max-w-3xl" : "max-w-md"} border-border/50 shadow-lg`}>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {isForgotPassword
                ? t("auth.forgot_title")
                : isLogin
                  ? t("auth.login_title")
                  : showChooser
                    ? profileLabels.title
                    : t("auth.signup_title")}
            </CardTitle>
            <CardDescription>
              {isForgotPassword
                ? t("auth.forgot_desc")
                : isLogin
                  ? t("auth.login_desc")
                  : showChooser
                    ? profileLabels.desc
                    : signupProfile === "professional"
                      ? t("auth.signup_desc_professional")
                      : signupProfile === "student"
                        ? t("auth.signup_desc_student")
                        : signupProfile === "clinic"
                          ? t("auth.signup_desc_clinic")
                          : t("auth.signup_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {showChooser ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {([
                    { id: "personal", icon: User, label: profileLabels.personal, desc: profileLabels.personalDesc },
                    { id: "professional", icon: Stethoscope, label: profileLabels.professional, desc: profileLabels.professionalDesc },
                    { id: "student", icon: GraduationCap, label: profileLabels.student, desc: profileLabels.studentDesc },
                    { id: "clinic", icon: Building2, label: profileLabels.clinic, desc: profileLabels.clinicDesc },
                  ] as const).map(({ id, icon: Icon, label, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => pickProfile(id)}
                      className="group flex flex-col items-center text-center gap-2 rounded-xl border border-border/60 bg-card hover:border-primary hover:bg-primary/5 transition-colors p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
                    </button>
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  {profileLabels.loginHint}{" "}
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className="text-primary font-medium hover:underline"
                  >
                    {profileLabels.loginBtn}
                  </button>
                </p>
              </div>
            ) : (
              <>
                {!isLogin && !isForgotPassword && signupProfile && (
                  <button
                    type="button"
                    onClick={() => setSignupProfile(null)}
                    className="mb-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {language === "pt" ? "Escolher outro perfil" : language === "es" ? "Elegir otro perfil" : "Choose another profile"}
                  </button>
                )}
                {!isLogin && !isForgotPassword && signupProfile === "student" && (
                  <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 px-3 py-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                    <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
                    <p className="leading-relaxed">
                      {language === "pt"
                        ? "Modo acadêmico já vem ativado no próximo passo. Seus PDFs e link público exibirão o selo Alivia Acadêmico com sua instituição e período."
                        : language === "es"
                          ? "El modo académico ya viene activado en el siguiente paso. Tus PDFs y enlace público mostrarán el sello Alivia Académico con tu institución y período."
                          : "Academic mode is already enabled in the next step. Your PDFs and public link will show the Alivia Academic seal with your institution and term."}
                    </p>
                  </div>
                )}
                {!isForgotPassword && invite && (
                  <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs text-foreground flex items-start gap-2">
                    <Building2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                    <p className="leading-relaxed">
                      {language === "pt"
                        ? <>Você foi convidado para a equipe da <strong>{invite.clinic_name}</strong> como <strong>{inviteRoleLabel}</strong>. {isLogin ? "Entre com o e-mail convidado para acessar a clínica." : "Crie sua senha: ao concluir, você entra direto na clínica, sem plano próprio."}</>
                        : language === "es"
                          ? <>Fuiste invitado al equipo de <strong>{invite.clinic_name}</strong> como <strong>{inviteRoleLabel}</strong>. {isLogin ? "Entra con el email invitado." : "Crea tu contraseña: al terminar entras directo a la clínica, sin plan propio."}</>
                          : <>You were invited to the <strong>{invite.clinic_name}</strong> team as <strong>{inviteRoleLabel}</strong>. {isLogin ? "Sign in with the invited email." : "Create your password: you'll go straight into the clinic, no plan of your own needed."}</>}
                    </p>
                  </div>
                )}
            {isLogin && !isForgotPassword && <PasskeyUnlockButton />}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">{t("auth.name")}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t("auth.name_placeholder")}
                      className="pl-10"
                      autoComplete="name"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.email_placeholder")}
                    className="pl-10"
                    autoComplete="email"
                    required
                    readOnly={!!invite && !isLogin}
                    disabled={loading}
                  />
                </div>
                {!isLogin && !isForgotPassword && (() => {
                  const suggestion = suggestEmailFix(email);
                  if (!suggestion) return null;
                  return (
                    <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-md px-2 py-1.5">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span className="flex-1">
                        {language === "pt" ? "Você quis dizer " : language === "es" ? "¿Quisiste decir " : "Did you mean "}
                        <button
                          type="button"
                          onClick={() => { setEmail(suggestion); setEmailConfirm(suggestion); }}
                          className="font-semibold underline hover:no-underline"
                        >
                          {suggestion}
                        </button>
                        ?
                      </span>
                    </div>
                  );
                })()}
              </div>
              {!isLogin && !isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="emailConfirm">
                    {language === "pt" ? "Confirme seu email" : language === "es" ? "Confirme su email" : "Confirm your email"}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="emailConfirm"
                      type="email"
                      value={emailConfirm}
                      onChange={(e) => setEmailConfirm(e.target.value)}
                      placeholder={t("auth.email_placeholder")}
                      className="pl-10"
                      autoComplete="off"
                      onPaste={(e) => e.preventDefault()}
                      required
                      disabled={loading}
                    />
                  </div>
                  {emailConfirm.length > 0 && email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase() && (
                    <p className="text-xs text-destructive">
                      {language === "pt"
                        ? "Os emails não coincidem."
                        : language === "es"
                          ? "Los emails no coinciden."
                          : "Emails do not match."}
                    </p>
                  )}
                </div>
              )}
              {!isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("auth.password_placeholder")}
                      className="pl-10 pr-10"
                      autoComplete={isLogin ? "current-password" : "new-password"}
                      minLength={6}
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
              {isLogin && !isForgotPassword && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                    disabled={loading}
                  >
                    {t("auth.forgot_password")}
                  </button>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {language === "pt" ? "Entrando..." : language === "es" ? "Entrando..." : "Signing in..."}
                  </span>
                ) : isForgotPassword ? t("auth.send_reset") : isLogin ? t("auth.login_button") : t("auth.signup_button")}
              </Button>
            </form>

            {!isForgotPassword && (
              <>
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      {language === "pt" ? "ou continue com" : language === "es" ? "o continúa con" : "or continue with"}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={loading}
                  onClick={handleGoogleLogin}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Google
                </Button>
              </>
            )}

            <div className="mt-6 text-center space-y-2">
              {isForgotPassword ? (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-sm text-primary hover:underline"
                  disabled={loading}
                >
                  {t("auth.back_to_login")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const next = !isLogin;
                    setIsLogin(next);
                    // Ao entrar no modo cadastro, volta sempre para o seletor
                    // de perfil (Pessoal / Profissional / Clínica).
                    if (!next) setSignupProfile(trialEntry ? "clinic" : null);
                  }}
                  className="text-sm text-primary hover:underline"
                  disabled={loading}
                >
                  {isLogin ? t("auth.no_account") : t("auth.has_account")}
                </button>
              )}
            </div>
              </>
            )}
          </CardContent>
        </Card>
          );
        })()}
      </main>
    </div>
  );
};

export default Auth;
