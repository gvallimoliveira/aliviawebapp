import { useState } from "react";
import CreditsSufficiency from "@/components/CreditsSufficiency";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { PRO_PLAN_ANNUAL_PRICE, PRO_PLAN_PRICE } from "@/constants/pricing";
import { PRICING_INCLUDES, fadeUp } from "../content";
import { useProfessionalCta } from "../useProfessionalCta";

const PricingSection = () => {
  const { t } = useLanguage();
  const { handleCTA } = useProfessionalCta();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [loading, setLoading] = useState<null | "trial" | "now">(null);
  const go = (trial: boolean) => {
    setLoading(trial ? "trial" : "now");
    void handleCTA(billing, trial).finally(() => setLoading(null));
  };

  const priceFormatted = billing === "monthly"
    ? `R$${PRO_PLAN_PRICE}`
    : `R$${PRO_PLAN_ANNUAL_PRICE.toFixed(2).replace(".", ",")}`;

  return (
    <section id="pricing" className="py-16 md:py-20 bg-muted/30">
      <div className="container max-w-xl mx-auto px-4">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12"
        >
          {t("b2b.pricing_title")}
        </motion.h2>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={fadeUp} custom={1}>
          <Card className="border-primary/30 shadow-lg relative bg-primary/[0.02]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                {t("b2b.early_cta_desc")}
              </span>
            </div>

            <CardContent className="p-6 md:p-8 pt-8 text-center">
              <div className="inline-flex items-center rounded-full border border-border bg-muted/50 p-1 mb-5">
                <button
                  onClick={() => setBilling("monthly")}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    billing === "monthly"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("b2b.plan_monthly")}
                </button>
                <button
                  onClick={() => setBilling("annual")}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all flex items-center gap-1.5 ${
                    billing === "annual"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("b2b.plan_annual")}
                  <Badge className={`text-[10px] px-1.5 py-0 ${
                    billing === "annual"
                      ? "bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30"
                      : "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                  }`}>
                    {t("b2b.save_30")}
                  </Badge>
                </button>
              </div>

              <div className="text-4xl font-bold text-foreground mb-1">
                {priceFormatted}
                <span className="text-lg font-normal text-muted-foreground">/{t("b2b.per_month")}</span>
              </div>
              {billing === "annual" && (
                <p className="text-xs text-muted-foreground mb-1">{t("b2b.billed_annually")}</p>
              )}
              <p className="text-xs text-muted-foreground mb-6">
                {billing === "monthly" ? t("b2b.cta_cancel") : t("b2b.annual_no_refund")}
              </p>

              <CreditsSufficiency plan="pro" annual={billing === "annual"} className="mb-6" />
              <ul className="text-left space-y-3 mb-8">
                {PRICING_INCLUDES.map((key, i) => (
                  <motion.li
                    key={key}
                    initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.6 }} variants={fadeUp} custom={i}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {t(key)}
                  </motion.li>
                ))}
              </ul>

              <Button type="button" onClick={() => go(false)} disabled={loading !== null} size="lg" className="w-full rounded-xl gap-2 text-base">
                {t("b2b.subscribe_now_cta")}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground mt-2 mb-4">{t("b2b.subscribe_now_note")}</p>
              <Button type="button" variant="outline" onClick={() => go(true)} disabled={loading !== null} className="w-full rounded-xl h-auto min-h-10 whitespace-normal py-2">
                {t("b2b.trial_cta")}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">{t("b2b.trial_cta_note")}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
