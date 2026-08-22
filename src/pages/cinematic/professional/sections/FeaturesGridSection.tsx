import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";
import { FEATURES, fadeUp } from "../content";

const FeaturesGridSection = () => {
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-20">
      <div className="container max-w-4xl mx-auto px-4">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12"
        >
          {t("b2b.features_title")}
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <Tooltip key={f.key}>
              <TooltipTrigger asChild>
                <motion.div
                  initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} custom={i}
                  className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/60 p-4 cursor-default hover:border-primary/30 hover:shadow-md hover:bg-card/90 transition-all duration-200"
                >
                  <f.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{t(f.key)}</span>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {t(f.descKey)}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGridSection;
