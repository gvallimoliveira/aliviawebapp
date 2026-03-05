import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, FileText, TrendingUp, Stethoscope, ArrowRight } from "lucide-react";

const ProfessionalSection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const benefits = [
    { icon: Clock, titleKey: "b2b.benefit_1_title", descKey: "b2b.benefit_1_desc" },
    { icon: Target, titleKey: "b2b.benefit_2_title", descKey: "b2b.benefit_2_desc" },
    { icon: FileText, titleKey: "b2b.benefit_3_title", descKey: "b2b.benefit_3_desc" },
    { icon: TrendingUp, titleKey: "b2b.benefit_4_title", descKey: "b2b.benefit_4_desc" },
  ];

  return (
    <section id="profissionais" className="py-20 relative overflow-hidden">
      {/* Background gradient */}
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
            <div className="text-3xl font-bold text-foreground mb-1">
              R$49<span className="text-lg font-normal text-muted-foreground">/mês</span>
            </div>
            <p className="text-xs text-muted-foreground mb-5">{t("b2b.cta_cancel")}</p>
            <Button
              onClick={() => navigate("/professional/register")}
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
