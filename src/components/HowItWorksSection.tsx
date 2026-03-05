import { motion } from "framer-motion";
import { ClipboardList, MapPin, FileText, Activity, Stethoscope, CalendarCheck, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import stepAnamnesis from "@/assets/step-anamnesis.jpg";
import stepPainmap from "@/assets/step-painmap.jpg";
import stepQuestionnaires from "@/assets/step-questionnaires.jpg";
import stepTests from "@/assets/step-tests.jpg";
import stepDiagnosis from "@/assets/step-diagnosis.jpg";
import stepTreatment from "@/assets/step-treatment.jpg";
import stepReport from "@/assets/step-report.jpg";
import stepDiary from "@/assets/step-diary.jpg";

const steps = [
  { icon: ClipboardList, key: "step1", image: stepAnamnesis },
  { icon: MapPin, key: "step2", image: stepPainmap },
  { icon: FileText, key: "step3", image: stepQuestionnaires },
  { icon: Activity, key: "step4", image: stepTests },
  { icon: Stethoscope, key: "step5", image: stepDiagnosis },
  { icon: CalendarCheck, key: "step6", image: stepTreatment },
];

const bonusItems = [
  { key: "report", image: stepReport },
  { key: "diary", image: stepDiary },
];

const HowItWorksSection = () => {
  const { t } = useLanguage();

  return (
    <section id="how" className="bg-muted/30 py-20 md:py-28">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-4 text-center"
        >
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            {t("how.title")}
          </h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 text-center text-lg text-primary font-medium"
        >
          {t("how.subtitle")}
        </motion.p>

        {/* 6-step grid */}
        <div className="mx-auto grid max-w-5xl gap-6 grid-cols-2 md:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center text-center"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {i + 1}
              </div>
              <h3 className="mb-1 text-sm font-semibold text-foreground md:text-base">
                {t(`how.${step.key}.title`)}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground mb-3 md:text-sm">
                {t(`how.${step.key}.desc`)}
              </p>
              <div className="overflow-hidden rounded-xl border border-border/50 shadow-lg">
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

        {/* Bonus Premium section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <div className="mx-auto grid max-w-3xl gap-6 grid-cols-2">
            {bonusItems.map((item, i) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="absolute -top-3 z-10 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground whitespace-nowrap">
                    <Star className="h-3 w-3" />
                    {t("how.bonus.premium_label")}
                  </span>
                </div>
                <div className="overflow-hidden rounded-xl border-2 border-primary/30 shadow-lg shadow-primary/10 pt-3">
                  <p className="text-sm font-semibold text-foreground mb-2 mt-2">
                    {t(`how.bonus.${item.key}`)}
                  </p>
                  <img
                    src={item.image}
                    alt={t(`how.bonus.${item.key}`)}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
