import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X, ArrowRight, Star, Calendar, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import {
  PREMIUM_PRICE_FORMATTED,
  PREMIUM_SINGLE_PRICE_FORMATTED,
} from "@/constants/pricing";

const ComparisonSection = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isMonthly, setIsMonthly] = useState(false);

  const features = [
    { key: "redflags", basic: true, premium: true },
    { key: "painmap", basic: true, premium: true },
    {
      key: "anamnesis",
      basic: t("compare.anamnesis.basic"),
      premium: t("compare.anamnesis.premium"),
    },
    { key: "questionnaires", basic: false, premium: true },
    { key: "tests", basic: false, premium: true },
    {
      key: "diagnosis",
      basic: t("compare.diagnosis.basic"),
      premium: t("compare.diagnosis.premium"),
    },
    { key: "treatment", basic: false, premium: t("compare.treatment.phases") },
    { key: "exercises", basic: false, premium: true },
    { key: "pain_diary", basic: false, premium: isMonthly },
    { key: "before_after", basic: false, premium: isMonthly },
    { key: "professional_referral", basic: false, premium: true },
    { key: "history", basic: false, premium: isMonthly },
    { key: "pdf_export", basic: t("compare.pdf_export.basic"), premium: t("compare.pdf_export.premium") },
    { key: "redo", basic: false, premium: isMonthly },
    { key: "login", basic: false, premium: true },
  ];

  const renderCell = (value: boolean | string) => {
    if (typeof value === "string") {
      return <span className="text-sm text-foreground">{value}</span>;
    }
    return value ? (
      <Check className="mx-auto h-5 w-5 text-primary" />
    ) : (
      <X className="mx-auto h-5 w-5 text-destructive/60" />
    );
  };

  return (
    <section id="compare" className="py-20 md:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center"
        >
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
            {t("compare.title")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("compare.subtitle")}
          </p>
          <p className="mt-4 text-base font-medium text-primary">
            {t("compare.anchor")}{" "}
            <span className="font-bold">{PREMIUM_PRICE_FORMATTED}</span>.
          </p>
        </motion.div>

        <div className="mx-auto max-w-4xl">
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide md:grid md:grid-cols-2 md:overflow-visible md:snap-none md:pb-0 md:gap-6">
          {/* Basic Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="snap-start shrink-0 w-[85%] md:w-auto md:shrink"
          >
            <Card className="h-full rounded-2xl border-border/60">
              <CardHeader className="pb-2 text-center">
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  {t("compare.basic")}
                </p>
                <p className="text-3xl font-bold text-foreground">
                  {t("compare.basic.price")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("compare.basic.desc")}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {features.map((f) => (
                  <div
                    key={f.key}
                    className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0"
                  >
                    <span className="text-sm text-muted-foreground">
                      {t(`compare.${f.key}`)}
                    </span>
                    <div className="min-w-[100px] text-center">
                      {renderCell(f.basic)}
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button
                  variant="outline"
                  className="w-full rounded-xl py-5"
                  onClick={() => navigate("/assessment/basic")}
                >
                  {t("compare.start.basic")}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Premium Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="snap-start shrink-0 w-[85%] md:w-auto md:shrink"
          >
            <Card className="relative h-full rounded-2xl border-primary/30 bg-primary/[0.02] shadow-lg shadow-primary/5">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  <Star className="h-3 w-3" /> Premium
                </span>
              </div>

              <CardHeader className="pb-2 pt-8 text-center">
                <p className="text-sm font-medium uppercase tracking-wider text-primary">
                  {t("compare.premium")}
                </p>

                {/* Switch toggle */}
                <div className="flex items-center justify-center gap-3 py-3">
                  <span
                    className={`text-sm font-medium transition-colors ${
                      isMonthly
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Calendar className="inline h-3.5 w-3.5 mr-1" />
                    {t("compare.toggle.monthly")}
                  </span>
                  <Switch
                    checked={!isMonthly}
                    onCheckedChange={(checked) => setIsMonthly(!checked)}
                  />
                  <span
                    className={`text-sm font-medium transition-colors ${
                      !isMonthly
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Zap className="inline h-3.5 w-3.5 mr-1" />
                    {t("compare.toggle.single")}
                  </span>
                </div>

                <p className="text-3xl font-bold text-foreground">
                  {isMonthly ? PREMIUM_PRICE_FORMATTED : PREMIUM_SINGLE_PRICE_FORMATTED}
                </p>

                {isMonthly && (
                  <Badge variant="outline" className="mx-auto mt-1 border-primary/30 text-primary text-xs">
                    {t("compare.monthly.best_value")}
                  </Badge>
                )}

                <p className="text-sm text-muted-foreground mt-1">
                  {isMonthly
                    ? t("compare.premium.monthly_desc")
                    : t("compare.premium.single_desc")}
                </p>
              </CardHeader>

              <CardContent className="space-y-3 pt-4">
                {features.map((f) => (
                  <div
                    key={f.key}
                    className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0"
                  >
                    <span className="text-sm text-muted-foreground">
                      {t(`compare.${f.key}`)}
                    </span>
                    <div className="min-w-[100px] text-center">
                      {renderCell(f.premium)}
                    </div>
                  </div>
                ))}

                {isMonthly && (
                  <div className="mt-3 rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-primary text-sm">{t("compare.monthly.benefits_title")}</p>
                    <p>• {t("compare.monthly.benefit_1")}</p>
                    <p>• {t("compare.monthly.benefit_2")}</p>
                    <p>• {t("compare.monthly.benefit_3")}</p>
                    <p>• {t("compare.monthly.benefit_4")}</p>
                  </div>
                )}
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full rounded-xl py-5 gap-2"
                  onClick={() => {
                    const hasReferral = !!localStorage.getItem("alivia_referral_code");
                    navigate("/upgrade-welcome", {
                      state: {
                        redirectTo: "/assessment/premium",
                        planType: hasReferral ? "referral" : "direct-premium",
                        paymentType: isMonthly ? "monthly" : "single",
                      },
                    });
                  }}
                >
                  {t("compare.start.premium")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
          </div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10 text-center italic text-xl text-primary font-semibold"
        >
          {t("compare.quote")}
        </motion.p>
      </div>
    </section>
  );
};

export default ComparisonSection;
