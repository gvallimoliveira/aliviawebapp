import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, KeyRound, User, Mail, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AppVersionBadge from "@/components/AppVersionBadge";
import SignatureManager from "@/components/account/SignatureManager";
import StudentAccessCard from "@/components/account/StudentAccessCard";
import AcademicPerformanceCard from "@/components/account/AcademicPerformanceCard";

const Account = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isPt = language === "pt";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const t = isPt ? {
    title: "Minha Conta",
    desc: "Gerencie suas informações de acesso",
    profile: "Perfil",
    email: "E-mail",
    change_password: "Alterar Senha",
    change_password_desc: "Defina uma nova senha de acesso ao painel",
    new_password: "Nova senha",
    confirm_password: "Confirmar nova senha",
    placeholder: "Mínimo 8 caracteres",
    save: "Salvar nova senha",
    saved: "Senha alterada com sucesso!",
    mismatch: "As senhas não coincidem.",
    too_short: "A senha precisa ter ao menos 8 caracteres.",
    error: "Erro",
    back: "Voltar",
    not_signed: "Você precisa estar logado para acessar esta página.",
    sign_in: "Fazer login",
  } : {
    title: "My Account",
    desc: "Manage your access information",
    profile: "Profile",
    email: "Email",
    change_password: "Change Password",
    change_password_desc: "Set a new password to access the dashboard",
    new_password: "New password",
    confirm_password: "Confirm new password",
    placeholder: "Minimum 8 characters",
    save: "Save new password",
    saved: "Password changed successfully!",
    mismatch: "Passwords do not match.",
    too_short: "Password must be at least 8 characters.",
    error: "Error",
    back: "Back",
    not_signed: "You must be signed in to access this page.",
    sign_in: "Sign in",
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: t.error, description: t.too_short, variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: t.error, description: t.mismatch, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast({ title: t.error, description: error.message, variant: "destructive" });
      return;
    }
    setPassword("");
    setConfirmPassword("");
    toast({ title: "✅", description: t.saved });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container py-16 text-center flex-1">
          <p className="text-muted-foreground mb-4">{t.not_signed}</p>
          <Button onClick={() => navigate("/auth")}>{t.sign_in}</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container py-10 max-w-2xl flex-1">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t.back}
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <User className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.desc}</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {t.profile}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t.email}</Label>
              <p className="text-foreground font-medium">{user.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              {t.change_password}
            </CardTitle>
            <CardDescription>{t.change_password_desc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t.new_password}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.placeholder}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t.confirm_password}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.placeholder}
                  autoComplete="new-password"
                  required
                />
              </div>
              <Button type="submit" disabled={saving || !password || !confirmPassword} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t.save}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6">
          <SignatureManager />
        </div>

        <div className="mt-6">
          <StudentAccessCard />
        </div>

        <div className="mt-6">
          <AcademicPerformanceCard />
        </div>

        <div className="mt-6 flex justify-center">
          <AppVersionBadge />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Account;
