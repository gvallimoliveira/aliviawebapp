import { motion } from "framer-motion";
import { Check, X, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

const ComparisonSection = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

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
    { key: "history", basic: false, premium: true },
    { key: "pdf_export", basic: false, premium: true },
    { key: "redo", basic: false, premium: true },
    { key: "login", basic: false, premium: true },
  ];

  const renderCell = (value: boolean | string) => {
    if (typeof value === "string") {
      return <span className="text-sm text-foreground">{value}</span>;
    }
    return value ? (
      <Check className="mx-auto h-5 w-5 text-primary" />
    ) : (
      <X className="mx-auto h-5 w-5 text-muted-foreground/40" />
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
          <p className="text-lg text-muted-foreground">{t("compare.subtitle")}</p>
        </motion.div>

        {/* Cards layout for mobile, table-like for desktop */}
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          {/* Basic Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <Card className="h-full rounded-2xl border-border/60">
              <CardHeader className="pb-2 text-center">
                <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  {t("compare.basic")}
                </p>
                <p className="text-3xl font-bold text-foreground">{t("compare.basic.price")}</p>
                <p className="text-sm text-muted-foreground">{t("compare.basic.desc")}</p>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {features.map((f) => (
                  <div key={f.key} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
                    <span className="text-sm text-muted-foreground">{t(`compare.${f.key}`)}</span>
                    <div className="min-w-[100px] text-center">{renderCell(f.basic)}</div>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full rounded-xl py-5" onClick={() => navigate("/assessment/basic")}>
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
                <p className="text-3xl font-bold text-foreground">{t("compare.premium.price")}</p>
                <p className="text-sm text-muted-foreground">{t("compare.premium.desc")}</p>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {features.map((f) => (
                  <div key={f.key} className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0">
                    <span className="text-sm text-muted-foreground">{t(`compare.${f.key}`)}</span>
                    <div className="min-w-[100px] text-center">{renderCell(f.premium)}</div>
                  </div>
                ))}
              </CardContent>
              <CardFooter>
                <Button className="w-full rounded-xl py-5 gap-2" onClick={() => navigate("/assessment/premium")}>
                  {t("compare.start.premium")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10 text-center text-lg font-medium italic text-muted-foreground"
        >
          "Unimos a visão do especialista com a precisão e agilidade da IA."
        </motion.p>
      </div>
    </section>
  );
};

export default ComparisonSection;
