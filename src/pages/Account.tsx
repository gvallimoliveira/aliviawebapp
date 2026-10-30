import { useEffect, useState } from "react";
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
import {
  Loader2,
  KeyRound,
  User,
  Mail,
  ArrowLeft,
  RotateCcw,
  CreditCard,
  Shield,
  Stethoscope,
  HelpCircle,
  FileArchive,
  ChevronDown,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AppVersionBadge from "@/components/AppVersionBadge";
import SignatureManager from "@/components/account/SignatureManager";
import ClinicReportIdentity from "@/components/account/ClinicReportIdentity";
import StudentAccessCard from "@/components/account/StudentAccessCard";
import AcademicPerformanceCard from "@/components/account/AcademicPerformanceCard";
import PasskeyAccountCard from "@/components/account/PasskeyAccountCard";
import PrivacyRightsCard from "@/components/account/PrivacyRightsCard";
import SubscriptionCard from "@/components/account/SubscriptionCard";
import ExportDataCard from "@/components/dashboard/ExportDataCard";
import ImportDataCard from "@/components/dashboard/ImportDataCard";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useIsProfessionalAccount } from "@/hooks/useIsProfessionalAccount";
import NotificationPreferences from "@/components/account/NotificationPreferences";

import InstallAppDialog from "@/components/InstallAppDialog";
import { Bell, BellOff, Send, Smartphone, Download } from "lucide-react";

const SectionTitle = ({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) => (
  <h2 className="mt-10 mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    <Icon className="h-3.5 w-3.5" />
    {children}
  </h2>
);



const Account = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isPt = language === "pt";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [testingPush, setTestingPush] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const push = usePushNotifications();
  const isProfessional = useIsProfessionalAccount();
  const personalOnly = isProfessional === false;

  // Perfil profissional (id da tabela professionals) para backup/exportação de dados.
  const [proBackup, setProBackup] = useState<{ id: string; full_name: string | null } | null>(null);
  useEffect(() => {
    if (isProfessional !== true || !user) return;
    (supabase.from("professionals") as any)
      .select("id, full_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => setProBackup(data || null));
  }, [isProfessional, user]);


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
    notifications: "Notificações",
    notifications_desc: "Controle os avisos de mensagens, avaliações e videochamadas neste dispositivo.",
    notifications_desc_personal: "Controle os lembretes do seu tratamento, avaliações e mensagens neste dispositivo.",
    push_bg_desc_personal: "Lembretes dos seus exercícios, diário de dor, resultado da avaliação, mensagens do seu fisioterapeuta e pagamentos chegam mesmo com o Aliv.iA fechado ou minimizado — desde que o app esteja instalado na tela de início do celular.",

    push_enabled: "Ativas neste dispositivo",
    push_disabled: "Inativas neste dispositivo",
    push_unsupported: "Este navegador não suporta notificações push.",
    push_denied: "A permissão foi bloqueada no navegador. Libere nas configurações do site/celular e volte aqui.",
    push_ios_install: "No iPhone, instale o app na Tela de Início e abra pelo ícone para ativar notificações em segundo plano.",
    push_bg_title: "Avisos com o app fechado",
    push_bg_desc: "Mensagens, chamadas de vídeo, novas avaliações, red flags, questionários e cobrança chegam mesmo com o Aliv.iA fechado ou minimizado — desde que o app esteja instalado na tela de início do celular.",
    push_bg_installed: "App instalado na tela de início: você recebe os avisos com o app fechado.",
    push_install_cta: "Como instalar o app",
    enable_push: "Ativar notificações",
    disable_push: "Desativar",
    test_push: "Enviar teste",
    test_sent: "Notificação de teste enviada.",
    test_error: "Não foi possível enviar o teste agora.",
    sec_account: "Conta",
    sec_billing: "Assinatura e cobrança",
    sec_notifications: "Notificações",
    sec_professional: "Perfil profissional",
    sec_privacy: "Privacidade e dados",
    sec_help: "Ajuda",

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
    notifications: "Notifications",
    notifications_desc: "Control message, assessment and video-call alerts on this device.",
    notifications_desc_personal: "Control your treatment reminders, assessment and message alerts on this device.",
    push_bg_desc_personal: "Exercise reminders, pain diary, assessment results, messages from your physio and payment alerts arrive even with Aliv.iA closed or minimized — as long as the app is installed on your phone's home screen.",

    push_enabled: "Enabled on this device",
    push_disabled: "Disabled on this device",
    push_unsupported: "This browser does not support push notifications.",
    push_denied: "Permission was blocked in the browser. Allow it in site/device settings and come back here.",
    push_ios_install: "On iPhone, install the app to the Home Screen and open it from the icon to enable background notifications.",
    push_bg_title: "Alerts while the app is closed",
    push_bg_desc: "Messages, video calls, new assessments, red flags, questionnaires and billing alerts arrive even with Aliv.iA closed or minimized — as long as the app is installed on your phone's home screen.",
    push_bg_installed: "App installed on the home screen: you receive alerts while the app is closed.",
    push_install_cta: "How to install the app",
    enable_push: "Enable notifications",
    disable_push: "Disable",
    test_push: "Send test",
    test_sent: "Test notification sent.",
    test_error: "Could not send the test right now.",
    sec_account: "Account",
    sec_billing: "Subscription & billing",
    sec_notifications: "Notifications",
    sec_professional: "Professional profile",
    sec_privacy: "Privacy & data",
    sec_help: "Help",

  };

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true);
  const iosNeedsInstall = isIOS && !isStandalone;

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

  const handleTestPush = async () => {
    if (!user) return;
    setTestingPush(true);
    try {
      const { error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: user.id,
          title: "Aliv.iA",
          body: "Teste de notificação recebido com sucesso.",
          url: "/dashboard",
          kind: "test",
          tag: `push-test-${user.id}`,
        },
      });
      if (error) throw error;
      toast({ title: "✅", description: t.test_sent });
    } catch (error) {
      console.error("Push test failed:", error);
      toast({ title: t.error, description: t.test_error, variant: "destructive" });
    } finally {
      setTestingPush(false);
    }
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

        <SectionTitle icon={User}>{t.sec_account}</SectionTitle>

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
          <PasskeyAccountCard />
        </div>

        <SectionTitle icon={CreditCard}>{t.sec_billing}</SectionTitle>
        <SubscriptionCard />

        <SectionTitle icon={Bell}>{t.sec_notifications}</SectionTitle>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {push.subscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              {t.notifications}
            </CardTitle>
            <CardDescription>
              {personalOnly ? t.notifications_desc_personal : t.notifications_desc}
            </CardDescription>

          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <Smartphone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">
                  {push.subscribed ? t.push_enabled : t.push_disabled}
                </p>
                {push.permission === "denied" && (
                  <p className="text-xs text-muted-foreground">{t.push_denied}</p>
                )}
                {iosNeedsInstall && (
                  <p className="text-xs text-muted-foreground">{t.push_ios_install}</p>
                )}
                {!push.isSupported && !iosNeedsInstall && (
                  <p className="text-xs text-muted-foreground">{t.push_unsupported}</p>
                )}
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
              <Download className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">{t.push_bg_title}</p>
                <p className="text-xs text-muted-foreground">
                  {isStandalone
                    ? t.push_bg_installed
                    : personalOnly
                      ? t.push_bg_desc_personal
                      : t.push_bg_desc}

                </p>
                {!isStandalone && (
                  <Button
                    size="sm"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => setInstallOpen(true)}
                  >
                    {t.push_install_cta}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!push.subscribed ? (
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={async () => {
                    const ok = await push.subscribe();
                    if (ok) toast({ title: "✅", description: t.push_enabled });
                  }}
                  disabled={push.loading || push.permission === "denied" || iosNeedsInstall || !push.isSupported}
                >
                  {push.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                  {t.enable_push}
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="gap-2" onClick={push.unsubscribe} disabled={push.loading}>
                  {push.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
                  {t.disable_push}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={handleTestPush}
                disabled={!push.subscribed || testingPush}
              >
                {testingPush ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {t.test_push}
              </Button>
            </div>
            <NotificationPreferences variant={personalOnly ? "patient" : "professional"} />
            <InstallAppDialog open={installOpen} onOpenChange={setInstallOpen} />
          </CardContent>
        </Card>

        <SectionTitle icon={Stethoscope}>{t.sec_professional}</SectionTitle>
        <ClinicReportIdentity />
        <SignatureManager />

        <div className="mt-6">
          <StudentAccessCard />
        </div>

        <div className="mt-6">
          <AcademicPerformanceCard />
        </div>

        <SectionTitle icon={Shield}>{t.sec_privacy}</SectionTitle>
        <PrivacyRightsCard />

        {/* Backup/exportação de dados do consultório — migrado do dashboard PRO */}
        {isProfessional === true && proBackup && (
          <details className="group mt-4 rounded-xl border border-border/60 bg-muted/20">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground transition">
              <span className="flex items-center gap-2">
                <FileArchive className="h-3.5 w-3.5" />
                {isPt ? "Backup, exportação e importação de dados" : language === "es" ? "Copia de seguridad, exportación e importación de datos" : "Data backup, export & import"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            </summary>
            <div className="px-2 pb-2 space-y-3">
              <ExportDataCard mode="professional" professionalId={proBackup.id} entityName={proBackup.full_name || user?.email || ""} />
              <ImportDataCard mode="professional" professionalId={proBackup.id} entityName={proBackup.full_name || ""} />
            </div>
          </details>
        )}

        <SectionTitle icon={HelpCircle}>{t.sec_help}</SectionTitle>


        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Tour de boas-vindas
            </CardTitle>
            <CardDescription>
              Refazer o tour guiado do painel para revisar os principais recursos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                try {
                  Object.keys(localStorage)
                    .filter((k) => k.startsWith("onboarding_") && k.endsWith("_completed_v2"))
                    .forEach((k) => localStorage.removeItem(k));
                  toast({ title: "Tour reiniciado", description: "Abrindo o painel..." });
                } catch {}
                navigate("/dashboard");
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reiniciar tour
            </Button>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-center">
          <AppVersionBadge />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Account;
