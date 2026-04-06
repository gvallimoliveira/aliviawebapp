import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const LgpdBadge = () => {
  const { t } = useLanguage();

  return (
    <section className="py-10 md:py-14">
      <div className="container max-w-3xl mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-6 md:p-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 text-center sm:text-left"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 shrink-0">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
              <h3 className="font-semibold text-foreground">{t("b2b.lgpd_title")}</h3>
              <Badge variant="outline" className="border-primary/30 text-primary text-[10px] px-2">
                {t("b2b.lgpd_badge")}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("b2b.lgpd_desc")}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LgpdBadge;
