import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, Sparkles, KeyRound, ChevronDown, ChevronUp, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCpf } from "@/utils/masks";
import logoAlivia from "@/assets/logo-alivia.png";
import { isPlaceholderCrefito } from "@/lib/crefito";


const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

const CREFITO_REGEX = /^\d{1,6}-[A-Z]$/;

const CompleteProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const isPt = language === "pt";
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [professional, setProfessional] = useState<any>(null);
  const [isPartner, setIsPartner] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    crefito: "",
    cpf: "",
    city: "",
    state: "",
  });
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Optional password change (mainly for partners using default password)
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (supabase.from("professionals" as any) as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!data) {
          navigate("/dashboard");
          return;
        }
        // If profile is already complete, redirect
        if (!isPlaceholderCrefito(data.crefito) && data.city !== "A definir") {
          navigate("/dashboard");
          return;
        }
        setProfessional(data);
        setIsPartner(!!data.is_partner);
        // Auto-expand password field for partners (they likely use default password)
        if (data.is_partner) setShowPasswordField(true);
        setForm({
          full_name: data.full_name === data.email?.split("@")[0] ? "" : data.full_name || "",
          crefito: isPlaceholderCrefito(data.crefito) ? "" : data.crefito || "",
          cpf: data.cpf ? formatCpf(data.cpf) : "",
          city: data.city === "A definir" ? "" : data.city || "",
          state: data.state === "XX" ? "" : data.state || "",
        });
        if (data.terms_accepted_at) setTermsAccepted(true);
        setLoading(false);
      });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !professional) return;

    if (!form.full_name.trim() || !form.city.trim() || !form.state) {
      toast({ title: t("prof.required_fields"), variant: "destructive" });
      return;
    }

    const normalizedCrefito = form.crefito.trim().toUpperCase();
    if (!CREFITO_REGEX.test(normalizedCrefito)) {
      toast({ title: t("prof.crefito_invalid_format"), variant: "destructive" });
      return;
    }

    const cpfDigits = form.cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      toast({
        title: isPt ? "CPF inválido" : "Invalid CPF",
        description: isPt ? "Digite os 11 dígitos do CPF." : "Enter all 11 digits.",
        variant: "destructive",
      });
      return;
    }

    if (!termsAccepted) {
      toast({
        title: isPt ? "Confirmação obrigatória" : "Confirmation required",
        description: isPt
          ? "Você precisa confirmar que os dados são verídicos."
          : "You must confirm the data is truthful.",
        variant: "destructive",
      });
      return;
    }

    const wantsPasswordChange = newPassword.length > 0 || confirmPassword.length > 0;
    if (wantsPasswordChange) {
      if (newPassword.length < 8) {
        toast({
          title: isPt ? "Senha muito curta" : "Password too short",
          description: isPt ? "Mínimo de 8 caracteres." : "Minimum 8 characters.",
          variant: "destructive",
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast({
          title: isPt ? "Senhas não coincidem" : "Passwords don't match",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);
    try {
      // Check duplicate CREFITO
      const { data: dupCheck } = await (supabase.from("professionals" as any) as any)
        .select("id, user_id")
        .eq("crefito", normalizedCrefito)
        .maybeSingle();
      if (dupCheck && dupCheck.user_id !== user.id) {
        toast({ title: t("prof.crefito_already_registered"), variant: "destructive" });
        setSaving(false);
        return;
      }

      // Check duplicate CPF
      const { data: cpfDup } = await (supabase.from("professionals" as any) as any)
        .select("id, user_id")
        .eq("cpf", cpfDigits)
        .maybeSingle();
      if (cpfDup && cpfDup.user_id !== user.id) {
        toast({
          title: isPt ? "CPF já cadastrado" : "CPF already registered",
          description: isPt
            ? "Este CPF já está vinculado a outra conta profissional."
            : "This CPF is already linked to another professional account.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      await (supabase.from("professionals" as any) as any)
        .update({
          full_name: form.full_name.trim(),
          crefito: normalizedCrefito,
          cpf: cpfDigits,
          city: form.city.trim(),
          state: form.state,
          approved: true,
          terms_accepted_at: new Date().toISOString(),
        })
        .eq("id", professional.id);

      // Update password if provided
      if (wantsPasswordChange) {
        const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwdError) {
          toast({
            title: isPt ? "Cadastro salvo, mas senha não foi alterada" : "Profile saved, but password not updated",
            description: pwdError.message,
            variant: "destructive",
          });
          // Continue anyway — profile was saved
        } else {
          // Mark banner as dismissed since password was updated
          try {
            localStorage.setItem(`partner_pwd_banner_dismissed_${user.id}`, "true");
          } catch { /* noop */ }
        }
      }

      toast({ title: t("prof.saved") });
      navigate("/dashboard");
    } catch {
      toast({ title: t("prof.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="text-center">
          <img src={logoAlivia} alt="Aliv.iA" className="h-10 mx-auto mb-2" />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-2">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{t("prof.complete_profile_title")}</CardTitle>
          <CardDescription>{t("prof.complete_profile_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Partner Welcome Banner */}
          {isPartner && (
            <div className="mb-5 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 p-4">
              <div className="flex items-start gap-2.5">
                <div className="shrink-0 mt-0.5 rounded-full bg-primary/15 p-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm">
                    {isPt ? "Bem-vindo(a), parceiro(a) Aliv.iA! 🎉" : "Welcome, Aliv.iA partner! 🎉"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {isPt
                      ? "Seu acesso PRO está liberado. Para começar, complete seu cadastro profissional e — por segurança — defina uma senha pessoal no lugar da senha padrão."
                      : "Your PRO access is active. To get started, complete your professional profile and — for security — set a personal password instead of the default one."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("prof.full_name")} *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("prof.crefito")} *</Label>
              <Input
                value={form.crefito}
                onChange={(e) => setForm({ ...form, crefito: e.target.value.toUpperCase() })}
                placeholder="000000-F"
                maxLength={8}
                required
              />
              <p className="text-xs text-muted-foreground">{t("prof.crefito_invalid_format")}</p>
            </div>

            <div className="space-y-2">
              <Label>CPF *</Label>
              <Input
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: formatCpf(e.target.value) })}
                placeholder="000.000.000-00"
                inputMode="numeric"
                maxLength={14}
                required
              />
              <p className="text-xs text-muted-foreground">
                {isPt
                  ? "Usado apenas para validar identidade e evitar duplicidade. Não é exibido publicamente."
                  : "Used only to validate identity and prevent duplicates. Not publicly displayed."}
              </p>
            </div>


            <div className="space-y-2">
              <Label>{t("prof.city")} *</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("prof.state")} *</Label>
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                required
              >
                <option value="">{t("prof.select_state")}</option>
                {STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Optional password change section */}
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setShowPasswordField((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors w-full"
              >
                <KeyRound className="h-4 w-4" />
                <span className="flex-1 text-left">
                  {isPt ? "Definir nova senha" : "Set new password"}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    {isPartner
                      ? (isPt ? "(recomendado)" : "(recommended)")
                      : (isPt ? "(opcional)" : "(optional)")}
                  </span>
                </span>
                {showPasswordField ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showPasswordField && (
                <div className="mt-3 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">
                      {isPt ? "Nova senha" : "New password"}
                    </Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={isPt ? "Mínimo 8 caracteres" : "Minimum 8 characters"}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">
                      {isPt ? "Confirmar senha" : "Confirm password"}
                    </Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={isPt ? "Repita a senha" : "Repeat password"}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-3">
              <Checkbox
                id="terms-truth"
                checked={termsAccepted}
                onCheckedChange={(c) => setTermsAccepted(c === true)}
                className="mt-0.5"
              />
              <label htmlFor="terms-truth" className="text-xs text-muted-foreground leading-relaxed cursor-pointer flex-1">
                <ShieldCheck className="inline h-3.5 w-3.5 text-primary mr-1 -mt-0.5" />
                {isPt
                  ? "Declaro, sob minha responsabilidade, que todos os dados informados (nome, CREFITO e CPF) são verídicos e correspondem ao meu cadastro profissional ativo. Estou ciente de que informações falsas podem levar à suspensão imediata da conta."
                  : "I declare, under my responsibility, that all data provided (name, CREFITO and CPF) is truthful and matches my active professional registration. I'm aware that false information may lead to immediate account suspension."}
              </label>
            </div>

            <Button type="submit" className="w-full rounded-xl py-5" disabled={saving || !termsAccepted}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t("prof.complete_profile_btn")}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;
