import { motion } from "framer-motion";
import { User, Stethoscope, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";

const DualAudienceSection = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const patientBullets = [
    t("dual.patient.bullet1"),
    t("dual.patient.bullet2"),
    t("dual.patient.bullet3"),
    t("dual.patient.bullet4"),
  ];

  const proBullets = [
    t("dual.pro.bullet1"),
    t("dual.pro.bullet2"),
    t("dual.pro.bullet3"),
    t("dual.pro.bullet4"),
  ];

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />

      <div className="container relative z-10 max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            {t("dual.title")}
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto">
            {t("dual.subtitle")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Paciente */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-8 hover:shadow-xl hover:border-primary/20 transition-all duration-300 flex flex-col"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <User className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-4">
              {t("dual.patient.title")}
            </h3>
            <ul className="space-y-3 mb-8 flex-1">
              {patientBullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 w-full">
              <Button
                onClick={() => navigate("/assessment/basic")}
                variant="outline"
                className="flex-1 rounded-xl"
              >
                {t("hero.cta.basic")}
              </Button>
              <Button
                onClick={() => navigate("/assessment/premium")}
                className="flex-1 rounded-xl gap-1"
              >
                {t("hero.cta.premium")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* Card Profissional */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-2xl border border-primary/30 bg-primary/5 backdrop-blur-sm p-8 hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex flex-col"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 mb-6">
              <Stethoscope className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-4">
              {t("dual.pro.title")}
            </h3>
            <ul className="space-y-3 mb-8 flex-1">
              {proBullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => navigate("/profissionais")}
              variant="outline"
              className="w-full rounded-xl gap-2 border-primary/30 text-primary hover:bg-primary/10"
              size="lg"
            >
              {t("dual.pro.cta")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DualAudienceSection;
