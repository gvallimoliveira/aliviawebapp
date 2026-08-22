import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { ROI_ITEMS, fadeUp } from "../content";

const RoiSection = () => {
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container max-w-4xl mx-auto px-4">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{t("b2b.roi_title")}</h2>
          <p className="text-muted-foreground text-base md:text-lg">{t("b2b.roi_subtitle")}</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {ROI_ITEMS.map((item, i) => (
            <motion.div
              key={item.title}
              initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} variants={fadeUp} custom={i}
              className="rounded-xl border border-border/60 bg-card/80 p-5 text-center"
            >
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-3">
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="font-bold text-foreground text-lg mb-1">{t(item.title)}</p>
              <p className="text-sm text-muted-foreground">{t(item.desc)}</p>
            </motion.div>
          ))}
        </div>
        <motion.p
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={4}
          className="text-center text-sm font-medium text-primary italic"
        >
          {t("b2b.roi_conclusion")}
        </motion.p>
      </div>
    </section>
  );
};

export default RoiSection;
