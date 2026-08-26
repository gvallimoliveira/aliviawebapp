import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Mail, User, KeyRound, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCT } from "./product";

/**
 * ENTRADA DO STUDIO PÚBLICO
 *
 * Tela de acesso com identidade própria do produto (sem vocabulário clínico e
 * sem links para o app de fisioterapia). Reutiliza a mesma sessão do backend,
 * mas quem entra por aqui só vê o Studio. Após entrar/cadastrar, vai direto
 * para a área logada (`/studio-pro/app`).
 */
const StudioProAuth = () => {
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      toast.error("Preencha email e senha.");
      return;
    }
    if (mode === "signup" && !fullName.trim()) {
      toast.error("Diga seu nome para criarmos sua conta.");
      return;
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
      setSubmitting(false);
      toast.error(error.message || "Não foi possível criar a conta.");
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
            <h1 className="mt-4 text-2xl font-black tracking-tight">
              {mode === "signup" ? "Crie seu estúdio" : "Entre no seu estúdio"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === "signup"
                ? "Cadastre sua marca e comece a gerar posts no seu DNA visual."
                : "Acesse suas marcas e continue criando."}
            </p>
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
            <div>
              <Label htmlFor="sp-password">Senha</Label>
              <div className="relative mt-1">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="sp-password"
                  type="password"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "Sua senha"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
              </div>
            </div>

            <Button type="submit" className="mt-1 h-11 rounded-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Criar conta grátis" : "Entrar"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
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
