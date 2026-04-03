import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, UserPlus, Rocket, ArrowRight, ArrowLeft, Shield, Sparkles, Gift, ClipboardList, Target, Lock, Calendar, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { PREMIUM_SINGLE_PRICE_FORMATTED, PREMIUM_PRICE_FORMATTED } from "@/constants/pricing";

const DISCOUNTED_PRICE = "R$ 98,10";

const UpgradeWelcome = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const state = (location.state as { redirectTo?: string; planType?: string; paymentType?: string }) || {};
  const planType = state.planType || "single";
  const redirectTo = state.redirectTo || "/assessment/premium";
  const [selectedPayment, setSelectedPayment] = useState<"monthly" | "single">(
    (state.paymentType as "monthly" | "single") || "single"
  );

  const isReferral = planType === "referral";
  const isDirectPremium = planType === "direct-premium";
  const isDirectFlow = isReferral || isDirectPremium;
  const isFromBasic = !isDirectFlow;

  // Title & subtitle
  const title = isReferral
    ? t("upgrade_welcome.title_referral")
    : isDirectPremium
    ? t("upgrade_welcome.title_direct")
    : t("upgrade_welcome.title");

  const subtitle = isReferral
    ? t("upgrade_welcome.subtitle_referral")
    : isDirectPremium
    ? t("upgrade_welcome.subtitle_direct")
    : t("upgrade_welcome.subtitle");

  // Plan label & price — driven by selectedPayment toggle
  const isMonthly = selectedPayment === "monthly";

  const planLabel = isReferral
    ? (isMonthly ? t("upgrade_welcome.plan_monthly") : t("upgrade_welcome.plan_referral"))
    : isMonthly
    ? t("upgrade_welcome.plan_monthly")
    : planType === "exit-discount"
    ? t("upgrade_welcome.plan_discount")
    : t("upgrade_welcome.plan_single");

  const planPrice = isMonthly
    ? PREMIUM_PRICE_FORMATTED
    : isReferral
    ? DISCOUNTED_PRICE
    : planType === "exit-discount"
    ? DISCOUNTED_PRICE
    : PREMIUM_SINGLE_PRICE_FORMATTED;

  // Steps vary by context
  const steps = isDirectFlow
    ? [
        {
          icon: Lock,
          color: "text-primary",
          bg: "bg-primary/5 border-primary/20",
          titleKey: "upgrade_welcome.step1_title_direct",
          descKey: "upgrade_welcome.step1_desc_direct",
          done: false,
        },
        {
          icon: Shield,
          color: "text-primary",
          bg: "bg-primary/5 border-primary/20",
          titleKey: "upgrade_welcome.step2_title",
          descKey: "upgrade_welcome.step2_desc",
          done: false,
        },
        {
          icon: Target,
          color: "text-amber-600",
          bg: "bg-accent border-accent",
          titleKey: "upgrade_welcome.step3_title_direct",
          descKey: "upgrade_welcome.step3_desc_direct",
          done: false,
        },
      ]
    : [
        {
          icon: CheckCircle,
          color: "text-green-600",
          bg: "bg-green-50 border-green-200",
          titleKey: "upgrade_welcome.step1_title",
          descKey: "upgrade_welcome.step1_desc",
          done: true,
        },
        {
          icon: UserPlus,
          color: "text-primary",
          bg: "bg-primary/5 border-primary/20",
          titleKey: "upgrade_welcome.step2_title",
          descKey: "upgrade_welcome.step2_desc",
          done: false,
        },
        {
          icon: Rocket,
          color: "text-amber-600",
          bg: "bg-accent border-accent",
          titleKey: "upgrade_welcome.step3_title",
          descKey: "upgrade_welcome.step3_desc",
          done: false,
        },
      ];

  const headerIcon = isReferral ? Gift : Rocket;
  const dataSafeText = isDirectFlow ? t("upgrade_welcome.data_safe_direct") : t("upgrade_welcome.data_safe");
  const backLabel = isDirectFlow ? t("upgrade_welcome.back_generic") : t("upgrade_welcome.back");

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-lg space-y-6"
      >
        {/* Progress — only for upgrade from basic */}
        {isFromBasic && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">{t("upgrade_welcome.progress_label")}</span>
              <span>1/3</span>
            </div>
            <Progress value={33} className="h-2" />
          </motion.div>
        )}

        {/* Header */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
            className="relative inline-flex items-center justify-center h-20 w-20 rounded-full bg-primary/10 mx-auto"
          >
            {(() => { const Icon = headerIcon; return <Icon className="h-10 w-10 text-primary" />; })()}
            <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="absolute -top-1 -right-1">
              <Sparkles className="h-5 w-5 text-amber-500" />
            </motion.div>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="text-2xl font-bold text-foreground">
            {title}
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
            {subtitle}
          </motion.p>
        </div>

        {/* Plan toggle + chip */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: "spring" }} className="space-y-3">
          {/* Toggle mensal/avulso */}
          {isDirectFlow && (
            <div className="flex items-center justify-center gap-3">
              <span className={`text-sm font-medium transition-colors ${isMonthly ? "text-primary" : "text-muted-foreground"}`}>
                <Calendar className="inline h-3.5 w-3.5 mr-1" />
                {t("upgrade_welcome.toggle_monthly")}
              </span>
              <Switch
                checked={!isMonthly}
                onCheckedChange={(checked) => setSelectedPayment(checked ? "single" : "monthly")}
              />
              <span className={`text-sm font-medium transition-colors ${!isMonthly ? "text-primary" : "text-muted-foreground"}`}>
                <Zap className="inline h-3.5 w-3.5 mr-1" />
                {t("upgrade_welcome.toggle_single")}
              </span>
            </div>
          )}
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-primary/10 text-primary text-sm font-semibold shadow-sm ring-1 ring-primary/20">
              {planLabel} — {isReferral && !isMonthly && (
                <span className="line-through text-muted-foreground mr-1">{PREMIUM_SINGLE_PRICE_FORMATTED}</span>
              )}
              {planPrice}
            </span>
          </div>
        </motion.div>

        {/* Steps */}
        <div className="relative space-y-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.15, type: "spring", stiffness: 120 }}>
                <Card className={`rounded-xl border ${step.bg} transition-shadow hover:shadow-md ${step.done ? "ring-1 ring-green-300" : ""}`}>
                  <CardContent className="flex items-start gap-3 py-4 px-4">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7 + i * 0.15, type: "spring", stiffness: 300 }} className="flex items-center justify-center h-9 w-9 rounded-full bg-background shrink-0 mt-0.5 shadow-sm">
                      <Icon className={`h-5 w-5 ${step.color}`} />
                    </motion.div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{t(step.titleKey)}</p>
                        {step.done && (
                          <motion.span initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9 }} className="text-[10px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                            ✓
                          </motion.span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t(step.descKey)}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Security */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          {dataSafeText}
        </motion.div>

        {/* Brand slogan */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.15 }} className="bg-primary/5 rounded-xl p-4 text-center">
          <p className="text-sm italic text-primary/80 leading-relaxed">
            {t("brand.slogan")}
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="space-y-3 pt-2">
          <Button
            size="lg"
            className="w-full rounded-xl gap-2 py-6 text-base shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
            onClick={() => {
              if (planType === "exit-discount") {
                sessionStorage.setItem("exit-intent-discount-pending", "true");
              }
              sessionStorage.setItem("premium_payment_type", selectedPayment);
              navigate("/auth", { state: { redirectTo } });
            }}
          >
            {t("upgrade_welcome.cta")}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full gap-2 text-muted-foreground" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default UpgradeWelcome;
