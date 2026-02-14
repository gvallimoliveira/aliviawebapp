import { motion } from "framer-motion";
import { ClipboardList, Activity, FileCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import stepAnamnesis from "@/assets/step-anamnesis.jpg";
import stepTests from "@/assets/step-tests.jpg";
import stepReport from "@/assets/step-report.jpg";

const steps = [
  { icon: ClipboardList, color: "bg-primary/10 text-primary", key: "step1", image: stepAnamnesis },
  { icon: Activity, color: "bg-accent/20 text-accent-foreground", key: "step2", image: stepTests },
  { icon: FileCheck, color: "bg-secondary text-secondary-foreground", key: "step3", image: stepReport },
];

const HowItWorksSection = () => {
  const { t } = useLanguage();

  return (
    <section id="how" className="bg-muted/30 py-20 md:py-28">
      <div className="container">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center text-3xl font-bold text-foreground md:text-4xl"
        >
          {t("how.title")}
        </motion.h2>

        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="flex flex-col items-center text-center"
            >
              <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${step.color}`}>
                <step.icon className="h-7 w-7" />
              </div>
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {t(`how.${step.key}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground mb-4">
                {t(`how.${step.key}.desc`)}
              </p>
              <div className="overflow-hidden rounded-xl border border-border/50 shadow-md">
                <img
                  src={step.image}
                  alt={t(`how.${step.key}.title`)}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
