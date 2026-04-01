import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, Clock, Sparkles, Bell, X, Loader2, Stethoscope } from "lucide-react";

interface PremiumAccess {
  has_access: boolean;
  can_redo: boolean;
  assessments_used?: number;
  max_assessments?: number;
  paid_at?: string;
  subscription_type?: "monthly" | "single" | null;
  available_discount?: { discount_percent: number } | null;
}

interface UpgradeBannerProps {
  premiumAccess: PremiumAccess | null;
  premiumLoading: boolean;
  professional?: any;
  push: {
    isSupported: boolean;
    subscribed: boolean;
    dismissed: boolean;
    permission: string;
    loading: boolean;
    subscribe: () => void;
    dismiss: () => void;
  };
}

const UpgradeBanner = ({ premiumAccess, premiumLoading, professional, push }: UpgradeBannerProps) => {
  const { t } = useLanguage();
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const getExpirationDate = () => {
    if (!premiumAccess?.paid_at) return null;
    const expDate = new Date(premiumAccess.paid_at);
    expDate.setDate(expDate.getDate() + 7);
    return expDate;
  };

  const getDaysRemaining = () => {
    const exp = getExpirationDate();
    if (!exp) return 0;
    const now = new Date();
    const diff = exp.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const usedCount = premiumAccess?.assessments_used ?? 0;
  const maxCount = premiumAccess?.max_assessments ?? 2;
  const remaining = Math.max(0, maxCount - usedCount);
  const daysLeft = getDaysRemaining();

  return (
    <>
      {/* Referral Discount Banner */}
      {!premiumLoading && premiumAccess?.available_discount && (
        <Card className="border-emerald-300 bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 dark:border-emerald-700/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 shrink-0">
                <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  {t("referral.banner_title")}
                </p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                  {(t("referral.banner_desc") || "").replace("{percent}", String(premiumAccess.available_discount.discount_percent))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Premium Access Indicator */}
      {!premiumLoading && premiumAccess?.paid_at && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/5 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardContent className="py-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    Premium
                    {premiumAccess.has_access ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px] px-1.5">
                        {t("dashboard.active") || "Ativo"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] px-1.5">
                        {t("dashboard.expired") || "Expirado"}
                      </Badge>
                    )}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                    <Clock className="h-3.5 w-3.5" />
                    {daysLeft > 0
                      ? `${daysLeft} ${daysLeft === 1 ? (t("dashboard.day_left") || "dia restante") : (t("dashboard.days_left") || "dias restantes")}`
                      : (t("dashboard.access_expired") || "Acesso expirado")}
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("dashboard.assessments_used") || "Avaliações utilizadas"}</span>
                  <span className="font-semibold text-foreground">{usedCount}/{maxCount}</span>
                </div>
                <Progress value={(usedCount / maxCount) * 100} className="h-2.5" />
                <p className="text-xs text-muted-foreground">
                  {remaining > 0
                    ? `${remaining} ${remaining === 1 ? (t("dashboard.assessment_remaining") || "avaliação restante") : (t("dashboard.assessments_remaining") || "avaliações restantes")}`
                    : (t("dashboard.no_assessments_remaining") || "Nenhuma avaliação restante neste período")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single Purchase Upgrade Banner */}
      {!premiumLoading && premiumAccess?.subscription_type === "single" && (
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="py-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-foreground leading-relaxed">
                  {t("dashboard.single_purchase_banner")}
                </p>
              </div>
              <Button
                onClick={async () => {
                  setUpgradeLoading(true);
                  try {
                    const { data, error } = await supabase.functions.invoke("create-payment", {
                      body: { payment_type: "monthly" },
                    });
                    if (error) throw error;
                    if (data?.url) window.location.href = data.url;
                  } catch (e) {
                    console.error("Upgrade error:", e);
                  } finally {
                    setUpgradeLoading(false);
                  }
                }}
                size="sm"
                className="gap-1.5 shrink-0"
                disabled={upgradeLoading}
              >
                {upgradeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
                {t("dashboard.upgrade_to_monthly")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Push Notification Opt-in */}
      {push.isSupported && !push.subscribed && !push.dismissed && push.permission !== "denied" && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t("push.opt_in_title")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("push.opt_in_desc")}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" onClick={() => push.subscribe()} disabled={push.loading} className="gap-1.5">
                  <Bell className="h-3.5 w-3.5" />
                  {t("push.enable")}
                </Button>
                <Button variant="ghost" size="icon" onClick={push.dismiss} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default UpgradeBanner;
