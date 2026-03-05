import { motion } from "framer-motion";
import { ClipboardCheck, Star, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCountUp } from "@/hooks/useCountUp";

const AnimatedStat = ({ icon: Icon, target, prefix, labelKey }: { icon: any; target: number; prefix: string; labelKey: string }) => {
  const { t } = useLanguage();
  const { count, ref } = useCountUp(target, 2200);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 rounded-2xl border border-border/50 bg-card p-6 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <span className="text-3xl font-bold text-foreground">{prefix}{count.toLocaleString("pt-BR")}+</span>
      <span className="text-sm text-muted-foreground">{t(labelKey)}</span>
    </div>
  );
};

const StatsSection = () => {
  const stats = [
    { icon: ClipboardCheck, target: 1200, prefix: "", labelKey: "stats.basic" },
    { icon: Star, target: 480, prefix: "", labelKey: "stats.premium" },
    { icon: Users, target: 1680, prefix: "", labelKey: "stats.total" },
  ];

  return (
    <section className="py-16 md:py-20">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto grid max-w-3xl gap-8 md:grid-cols-3"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.labelKey}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <AnimatedStat {...stat} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default StatsSection;
