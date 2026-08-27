import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Loader2, Mail, User, KeyRound, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCT } from "./product";
import { useStudioPwaMeta } from "./useStudioPwaMeta";

/**
 * ENTRADA DO STUDIO PÚBLICO
 *
 * Mesmo fluxo do app principal: criar conta (com confirmação de senha e
 * olhinho), entrar e recuperar senha por e-mail. Quem já tem conta (por
 * exemplo, quem recebeu acesso cortesia e nunca definiu senha) usa
 * "Esqueci minha senha" para criar uma senha e entrar.
 */
const StudioProAuth = () => {
  useStudioPwaMeta();
  const { user, loading: authLoading, signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const appPath = `${PRODUCT.base}/app`;

  useEffect(() => {
    document.title = `${PRODUCT.name} — entrar`;
  }, []);

  // Já autenticado? Vai direto para a área logada.
  useEffect(() => {
    if (!authLoading && user) {
      navigate(appPath, { replace: true });
    }
  }, [authLoading, user, navigate, appPath]);

  const sendReset = async (target: string) => {
    // Marca a origem para o /reset-password devolver a pessoa ao Studio.
    try {
      localStorage.setItem("studio-pro:reset-origin", "1");
    } catch {
      /* storage bloqueado: segue o fluxo normal */
    }
    const { error } = await resetPassword(target);
    if (error) {
      toast.error(error.message || "Não foi possível enviar o e-mail de recuperação.");
      return false;
    }
    setSent(true);
    toast.success("Enviamos um link por e-mail para você definir sua senha.");
    return true;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (mode === "forgot") {
      if (!normalizedEmail) {
        toast.error("Informe seu e-mail.");
        return;
      }
      setSubmitting(true);
      await sendReset(normalizedEmail);
      setSubmitting(false);
      return;
    }

    if (!normalizedEmail || !password) {
      toast.error("Preencha email e senha.");
      return;
    }
    if (mode === "signup") {
      if (!fullName.trim()) {
        toast.error("Diga seu nome para criarmos sua conta.");
        return;
      }
      if (password.length < 6) {
        toast.error("A senha precisa ter no mínimo 6 caracteres.");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("As senhas não conferem. Confira a digitação.");
        return;
      }
    }
    setSubmitting(true);

    if (mode === "signin") {
      const { error } = await signIn(normalizedEmail, password);
      setSubmitting(false);
      if (error) {
        toast.error(error.message || "Não foi possível entrar. Confira os dados.");
        return;
      }
      toast.success(`Bem-vindo de volta ao ${PRODUCT.wordmark}.`);
      navigate(appPath, { replace: true });
      return;
    }

    // Email auto-confirm está ativo: signUp já retorna sessão na maioria dos casos.
    const { error, session } = await signUp(normalizedEmail, password, fullName.trim());
    if (error) {
      const msg = String(error.message || "");
      const exists = /already|registered|exist/i.test(msg);
      if (exists) {
        // Conta já existe (ex.: acesso cortesia concedido) — tenta entrar com a
        // senha digitada; se não for a senha certa, oferece recuperação.
        const { error: signInErr } = await signIn(normalizedEmail, password);
        if (!signInErr) {
          setSubmitting(false);
          navigate(appPath, { replace: true });
          return;
        }
        await sendReset(normalizedEmail);
        setSubmitting(false);
        setMode("forgot");
        toast.info("Este e-mail já tem conta. Use o link enviado para definir sua senha.");
        return;
      }
      setSubmitting(false);
      toast.error(msg || "Não foi possível criar a conta.");
      return;
    }
    if (session) {
      setSubmitting(false);
      toast.success("Conta criada. Seu estúdio está pronto.");
      navigate(appPath, { replace: true });
      return;
    }
    // Fallback: signUp sem sessão — tenta entrar em seguida.
    const { error: signInErr } = await signIn(normalizedEmail, password);
    setSubmitting(false);
    if (signInErr) {
      toast.error("Conta criada. Faça login para continuar.");
      setMode("signin");
      return;
    }
    navigate(appPath, { replace: true });
  };

  const title =
    mode === "signup" ? "Crie seu estúdio" : mode === "signin" ? "Entre no seu estúdio" : "Recuperar acesso";
  const subtitle =
    mode === "signup"
      ? "Cadastre sua marca e comece a gerar posts no seu DNA visual."
      : mode === "signin"
        ? "Acesse suas marcas e continue criando."
        : "Enviamos um link por e-mail para você definir uma nova senha.";

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Link to={PRODUCT.base} className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" />
          {PRODUCT.wordmark}
        </Link>
        <span className="text-xs text-muted-foreground">{PRODUCT.tagline}</span>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 pb-16">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-6 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
              <Sparkles className="h-3 w-3" />
              {PRODUCT.freeCredits} artes grátis no cadastro
            </span>
            <h1 className="mt-4 text-2xl font-black tracking-tight">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          <form onSubmit={submit} className="grid gap-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="sp-name">Seu nome</Label>
                <div className="relative mt-1">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="sp-name"
                    className="pl-9"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Como devemos te chamar?"
                    autoComplete="name"
                  />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="sp-email">Email</Label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="sp-email"
                  type="email"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@suaempresa.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <Label htmlFor="sp-password">Senha</Label>
                <div className="relative mt-1">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="sp-password"
                    type={showPassword ? "text" : "password"}
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "Sua senha"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === "signup" && (
              <div>
                <Label htmlFor="sp-password2">Repetir senha</Label>
                <div className="relative mt-1">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="sp-password2"
                    type={showConfirm ? "text" : "password"}
                    className="pl-9 pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite a senha novamente"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="mt-1 text-xs text-destructive">As senhas não conferem.</p>
                )}
              </div>
            )}

            <Button type="submit" className="mt-1 h-11 rounded-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Criar conta grátis" : mode === "signin" ? "Entrar" : "Enviar link de senha"}
            </Button>

            {mode === "forgot" && sent && (
              <p className="text-center text-xs text-muted-foreground">
                Verifique sua caixa de entrada (e o spam). O link abre a página para criar a nova senha.
              </p>
            )}
          </form>

          {mode !== "forgot" && (
            <p className="mt-4 text-center text-sm">
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground hover:underline"
                onClick={() => {
                  setMode("forgot");
                  setSent(false);
                }}
              >
                Esqueci minha senha / nunca criei uma
              </button>
            </p>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            >
              {mode === "signup" ? "Entrar" : "Criar grátis"}
            </button>
          </p>
        </div>

        <p className="mt-4 text-center text-[11px] leading-snug text-muted-foreground">
          Ao continuar você concorda em receber suas artes com marca d'água no plano gratuito.
          Nada é publicado sem o seu comando.
        </p>
      </div>
    </main>
  );
};

export default StudioProAuth;
