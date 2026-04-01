import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, UserPlus, Rocket, ArrowRight, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { PREMIUM_SINGLE_PRICE_FORMATTED, PREMIUM_PRICE_FORMATTED } from "@/constants/pricing";

const DISCOUNTED_PRICE = "R$ 98,10";

const UpgradeWelcome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const state = (location.state as { redirectTo?: string; planType?: string }) || {};
  const planType = state.planType || "single";
  const redirectTo = state.redirectTo || "/assessment/premium";

  const planLabel =
    planType === "monthly"
      ? t("upgrade_welcome.plan_monthly")
      : planType === "exit-discount"
      ? t("upgrade_welcome.plan_discount")
      : t("upgrade_welcome.plan_single");

  const planPrice =
    planType === "monthly"
      ? PREMIUM_PRICE_FORMATTED
      : planType === "exit-discount"
      ? DISCOUNTED_PRICE
      : PREMIUM_SINGLE_PRICE_FORMATTED;

  const steps = [
    {
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
      titleKey: "upgrade_welcome.step1_title",
      descKey: "upgrade_welcome.step1_desc",
    },
    {
      icon: UserPlus,
      color: "text-primary",
      bg: "bg-primary/5 border-primary/20",
      titleKey: "upgrade_welcome.step2_title",
      descKey: "upgrade_welcome.step2_desc",
    },
    {
      icon: Rocket,
      color: "text-amber-600",
      bg: "bg-accent border-accent",
      titleKey: "upgrade_welcome.step3_title",
      descKey: "upgrade_welcome.step3_desc",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10 mx-auto"
          >
            <Rocket className="h-8 w-8 text-primary" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">
            {t("upgrade_welcome.title")}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
            {t("upgrade_welcome.subtitle")}
          </p>
        </div>

        {/* Plan chip */}
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
            {planLabel} — {planPrice}
          </span>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.12 }}
              >
                <Card className={`rounded-xl border ${step.bg}`}>
                  <CardContent className="flex items-start gap-3 py-4 px-4">
                    <div className="flex items-center justify-center h-9 w-9 rounded-full bg-background shrink-0 mt-0.5">
                      <Icon className={`h-5 w-5 ${step.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t(step.titleKey)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t(step.descKey)}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Security note */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          {t("upgrade_welcome.data_safe")}
        </div>

        {/* CTAs */}
        <div className="space-y-3 pt-2">
          <Button
            size="lg"
            className="w-full rounded-xl gap-2 py-6 text-base"
            onClick={() => {
              if (planType === "exit-discount") {
                sessionStorage.setItem("exit-intent-discount-pending", "true");
              }
              navigate("/auth", { state: { redirectTo } });
            }}
          >
            {t("upgrade_welcome.cta")}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="w-full gap-2 text-muted-foreground"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("upgrade_welcome.back")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default UpgradeWelcome;
