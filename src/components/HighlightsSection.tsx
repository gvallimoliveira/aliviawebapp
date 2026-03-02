import { motion } from "framer-motion";
import { BookOpen, ClipboardCheck, HeartPulse, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

const HighlightsSection = () => {
  const { t } = useLanguage();

  const highlights = [
    {
      icon: HeartPulse,
      titleKey: "highlights.diary.title",
      descKey: "highlights.diary.desc",
    },
    {
      icon: ClipboardCheck,
      titleKey: "highlights.questionnaires.title",
      descKey: "highlights.questionnaires.desc",
    },
    {
      icon: BookOpen,
      titleKey: "highlights.evidence.title",
      descKey: "highlights.evidence.desc",
    },
    {
      icon: Users,
      titleKey: "highlights.professional.title",
      descKey: "highlights.professional.desc",
    },
  ];

  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
            {t("highlights.title")}
          </h2>
          <p className="text-lg text-muted-foreground">
            {t("highlights.subtitle")}
          </p>
        </motion.div>

        <div className="mx-auto grid max-w-5xl gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((h, i) => {
            const Icon = h.icon;
            return (
              <motion.div
                key={h.titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full rounded-2xl border-border/60 hover:border-primary/40 hover:shadow-md transition-all">
                  <CardContent className="pt-6 pb-5 px-5 text-center space-y-3">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground">
                      {t(h.titleKey)}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(h.descKey)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HighlightsSection;
