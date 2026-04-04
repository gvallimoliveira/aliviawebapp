import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

const testimonials = [
  { key: "t1", initials: "MF", color: "bg-primary/20 text-primary" },
  { key: "t2", initials: "CS", color: "bg-accent text-accent-foreground" },
  { key: "t3", initials: "RL", color: "bg-secondary text-secondary-foreground" },
];

const TestimonialsSection = () => {
  const { t } = useLanguage();

  return (
    <section className="bg-muted/30 py-20 md:py-28">
      <div className="container">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl"
        >
          {t("testimonials.title")}
        </motion.h2>

        <div className="mx-auto max-w-5xl">
          <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible md:snap-none md:pb-0 md:gap-6">
            {testimonials.map((item, i) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="snap-start shrink-0 w-[75%] sm:w-[60%] md:w-auto md:shrink"
              >
                <Card className="h-full rounded-2xl border-border/50">
                  <CardContent className="flex flex-col gap-4 p-6">
                    <Quote className="h-6 w-6 text-primary/40" />
                    <p className="flex-1 text-sm italic leading-relaxed text-muted-foreground">
                      "{t(`testimonials.${item.key}.text`)}"
                    </p>
                    <div className="flex items-center gap-3 pt-2">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className={item.color}>{item.initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t(`testimonials.${item.key}.name`)}</p>
                        <p className="text-xs text-muted-foreground">{t(`testimonials.${item.key}.role`)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
