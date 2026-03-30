import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, ArrowLeft, Mail, Lock, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logoAlivia from "@/assets/logo-alivia.png";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const { t, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as any)?.redirectTo || "/dashboard";
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isForgotPassword) {
      const { error } = await resetPassword(email);
      if (error) {
        toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
      } else {
        toast({ title: t("auth.reset_sent"), description: t("auth.reset_sent_desc") });
        setIsForgotPassword(false);
      }
    } else if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
      } else {
        navigate(redirectTo);
      }
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({ title: t("auth.error"), description: error.message, variant: "destructive" });
      } else {
        toast({ title: t("auth.check_email"), description: t("auth.check_email_desc") });
      }
    }
    setLoading(false);
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
        <Card className="w-full max-w-md border-border/50 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {isForgotPassword ? t("auth.forgot_title") : isLogin ? t("auth.login_title") : t("auth.signup_title")}
            </CardTitle>
            <CardDescription>
              {isForgotPassword ? t("auth.forgot_desc") : isLogin ? t("auth.login_desc") : t("auth.signup_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      required
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
                    required
                  />
                </div>
              </div>
              {!isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("auth.password_placeholder")}
                      className="pl-10"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
              )}
              {isLogin && !isForgotPassword && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    {t("auth.forgot_password")}
                  </button>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "..." : isForgotPassword ? t("auth.send_reset") : isLogin ? t("auth.login_button") : t("auth.signup_button")}
              </Button>
            </form>
            <div className="mt-6 text-center space-y-2">
              {isForgotPassword ? (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-sm text-primary hover:underline"
                >
                  {t("auth.back_to_login")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-primary hover:underline"
                >
                  {isLogin ? t("auth.no_account") : t("auth.has_account")}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Auth;
