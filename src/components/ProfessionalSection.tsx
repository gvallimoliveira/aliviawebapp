import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, FileText, Activity, Stethoscope, ArrowRight, RefreshCw, Dumbbell, Palette } from "lucide-react";
import { PRO_PLAN_PRICE, PRO_PLAN_ANNUAL_PRICE } from "@/constants/pricing";

const ProfessionalSection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  const benefits = [
    { icon: Clock, titleKey: "b2b.benefit_1_title", descKey: "b2b.benefit_1_desc" },
    { icon: Target, titleKey: "b2b.benefit_2_title", descKey: "b2b.benefit_2_desc" },
    { icon: FileText, titleKey: "b2b.benefit_3_title", descKey: "b2b.benefit_3_desc" },
    { icon: Activity, titleKey: "b2b.benefit_4_title", descKey: "b2b.benefit_4_desc" },
  ];

  const price = billing === "monthly" ? PRO_PLAN_PRICE : PRO_PLAN_ANNUAL_PRICE;
  const priceFormatted = billing === "monthly"
    ? `R$${PRO_PLAN_PRICE}`
    : `R$${PRO_PLAN_ANNUAL_PRICE.toFixed(2).replace(".", ",")}`;

  return (
    <section id="profissionais" className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/30" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

      <div className="container relative z-10 max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-primary px-4 py-1.5 text-sm font-medium">
            <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
            {t("b2b.badge")}
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("b2b.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
            {t("b2b.subtitle")}
          </p>
        </div>

        {/* Benefit Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">{t(b.titleKey)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(b.descKey)}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center space-y-4">
          <div className="inline-block rounded-2xl border border-primary/20 bg-card/90 backdrop-blur-sm px-8 py-6 shadow-sm">
            <p className="text-sm text-muted-foreground mb-3">{t("b2b.cta_desc")}</p>

            {/* Toggle mensal / anual */}
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
                    ? "bg-white/20 text-white border-white/30"
                    : "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                }`}>
                  {t("b2b.save_30")}
                </Badge>
              </button>
            </div>

            <div className="text-3xl font-bold text-foreground mb-1">
              {priceFormatted}<span className="text-lg font-normal text-muted-foreground">/{t("b2b.per_month")}</span>
            </div>
            {billing === "annual" && (
              <p className="text-xs text-muted-foreground mb-1">{t("b2b.billed_annually")}</p>
            )}
            <p className="text-xs text-muted-foreground mb-5">
              {billing === "monthly" ? t("b2b.cta_cancel") : t("b2b.annual_no_refund")}
            </p>
            <Button
              onClick={() => navigate("/profissionais")}
              size="lg"
              className="rounded-xl gap-2 px-8"
            >
              {t("b2b.cta_button")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProfessionalSection;
