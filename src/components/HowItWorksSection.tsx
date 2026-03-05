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

        {/* 6-step grid — phone mockup cards */}
        <div className="mx-auto grid max-w-6xl gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group flex flex-col items-center text-center"
            >
              {/* Step badge + title */}
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md">
                  {i + 1}
                </div>
                <h3 className="text-sm font-semibold text-foreground md:text-base">
                  {t(`how.${step.key}.title`)}
                </h3>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground mb-4 max-w-[260px] md:text-sm">
                {t(`how.${step.key}.desc`)}
              </p>

              {/* Phone mockup frame */}
              <div className="relative w-full max-w-[280px] mx-auto">
                {/* Phone bezel */}
                <div className="rounded-[24px] border-[3px] border-foreground/10 bg-background shadow-2xl shadow-foreground/5 overflow-hidden transition-shadow duration-300 group-hover:shadow-primary/10 group-hover:border-primary/20">
                  {/* Status bar */}
                  <div className="h-6 bg-muted/50 flex items-center justify-center">
                    <div className="w-16 h-1 rounded-full bg-foreground/10" />
                  </div>
                  {/* Screen content — full image, no crop */}
                  <img
                    src={step.image}
                    alt={t(`how.${step.key}.title`)}
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bonus Premium section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-20"
        >
          <p className="text-center text-sm font-medium text-muted-foreground mb-8 tracking-wide uppercase">
            {t("how.bonus.see_inside")}
          </p>

          <div className="mx-auto grid max-w-4xl gap-8 grid-cols-1 sm:grid-cols-2">
            {bonusItems.map((item, i) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="group relative flex flex-col items-center text-center"
              >
                {/* Premium label */}
                <div className="absolute -top-3 z-10 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3.5 py-1 text-xs font-semibold text-primary-foreground whitespace-nowrap shadow-lg shadow-primary/20">
                    <Star className="h-3 w-3" />
                    {t("how.bonus.premium_label")}
                  </span>
                </div>

                {/* Card frame */}
                <div className="w-full rounded-[20px] border-2 border-primary/20 bg-background shadow-xl shadow-primary/5 overflow-hidden pt-5 transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-primary/10">
                  <p className="text-sm font-semibold text-foreground mb-3 px-4">
                    {t(`how.bonus.${item.key}`)}
                  </p>
                  <img
                    src={item.image}
                    alt={t(`how.bonus.${item.key}`)}
                    className="w-full h-auto block"
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
