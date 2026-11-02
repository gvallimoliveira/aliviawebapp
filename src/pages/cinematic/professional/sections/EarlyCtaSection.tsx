import CreditsSufficiency from "@/components/CreditsSufficiency";
import AnnualRefundDisclaimer from "@/components/AnnualRefundDisclaimer";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { PRO_PLAN_ANNUAL_PRICE, PRO_PLAN_PRICE } from "@/constants/pricing";
import { fadeUp } from "../content";
import { useProfessionalCta } from "../useProfessionalCta";

const EarlyCtaSection = () => {
  const { t } = useLanguage();
  const { handleCTA, scrollToPricing } = useProfessionalCta();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  const priceFormatted = billing === "monthly"
    ? `R$${PRO_PLAN_PRICE}`
    : `R$${PRO_PLAN_ANNUAL_PRICE.toFixed(2).replace(".", ",")}`;

  return (
    <section className="py-10 md:py-14">
      <div className="container max-w-lg mx-auto px-4">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          className="rounded-2xl border border-primary/20 bg-card/90 backdrop-blur-sm p-6 md:p-8 text-center shadow-sm"
        >
          <p className="text-sm font-medium text-muted-foreground mb-3">{t("b2b.early_cta_desc")}</p>

          <div className="inline-flex items-center rounded-full border border-border bg-muted/50 p-1 mb-4">
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

          <div className="text-3xl font-bold text-foreground mb-1">
            {priceFormatted}
            <span className="text-lg font-normal text-muted-foreground">/{t("b2b.per_month")}</span>
          </div>
          {billing === "annual" && (
            <p className="text-xs text-muted-foreground mb-1">{t("b2b.billed_annually")}</p>
          )}

          <AnnualRefundDisclaimer annual={billing === "annual"} />
          <CreditsSufficiency plan="pro" className="mt-4" />

          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-5">
            <Button onClick={handleCTA} size="lg" className="rounded-xl gap-2 px-8">
              {t("b2b.hero_cta")}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="lg" className="rounded-xl gap-2 text-muted-foreground" onClick={scrollToPricing}>
              {t("b2b.see_plans")}
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default EarlyCtaSection;
