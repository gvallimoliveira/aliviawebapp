import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { STEPS, fadeUp } from "../content";

const HowItWorksSection = () => {
  const { t } = useLanguage();
  const LastIcon = STEPS[6].icon;

  return (
    <section id="how" className="py-16 md:py-20 bg-muted/30">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12"
        >
          {t("b2b.how_title")}
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {STEPS.slice(0, 6).map((s, i) => (
            <motion.div
              key={s.titleKey}
              initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} custom={i}
              className="text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 relative">
                <s.icon className="h-6 w-6 text-primary" />
                <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-semibold text-foreground mb-1">{t(s.titleKey)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(s.descKey)}</p>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} custom={1}
          className="mt-6 flex justify-center"
        >
          <div className="text-center max-w-xs">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 relative">
              <LastIcon className="h-6 w-6 text-primary" />
              <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                7
              </span>
            </div>
            <h3 className="font-semibold text-foreground mb-1">{t(STEPS[6].titleKey)}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t(STEPS[6].descKey)}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
