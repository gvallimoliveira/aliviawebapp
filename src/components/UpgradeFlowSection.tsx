import { motion } from "framer-motion";
import { ClipboardList, UserPlus, Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const UpgradeFlowSection = () => {
  const { t } = useLanguage();

  const steps = [
    {
      icon: ClipboardList,
      title: t("upgrade_flow.step1_title"),
      desc: t("upgrade_flow.step1_desc"),
    },
    {
      icon: UserPlus,
      title: t("upgrade_flow.step2_title"),
      desc: t("upgrade_flow.step2_desc"),
    },
    {
      icon: Zap,
      title: t("upgrade_flow.step3_title"),
      desc: t("upgrade_flow.step3_desc"),
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t("upgrade_flow.title")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("upgrade_flow.subtitle")}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-primary/30" />
              )}

              <div className="rounded-2xl bg-primary/10 p-4 mb-4 relative z-10">
                <step.icon className="h-7 w-7 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary mb-2">
                {t("upgrade_flow.step_label")} {i + 1}
              </span>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-primary font-medium mt-10"
        >
          {t("upgrade_flow.highlight")}
        </motion.p>
      </div>
    </section>
  );
};

export default UpgradeFlowSection;
