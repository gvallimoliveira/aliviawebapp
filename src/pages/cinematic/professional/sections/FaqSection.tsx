import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/contexts/LanguageContext";
import { FAQ_KEYS, fadeUp } from "../content";

const FaqSection = () => {
  const { t } = useLanguage();

  return (
    <section className="py-16 md:py-20">
      <div className="container max-w-2xl mx-auto px-4">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          className="text-3xl font-bold text-foreground text-center mb-10"
        >
          {t("b2b.faq_title")}
        </motion.h2>
        <Accordion type="single" collapsible className="w-full">
          {FAQ_KEYS.map((key, i) => (
            <motion.div
              key={key}
              initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.6 }} variants={fadeUp} custom={i}
            >
              <AccordionItem value={key}>
                <AccordionTrigger className="text-left text-base font-medium text-foreground">
                  {t(`${key}.q`)}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {t(`${key}.a`)}
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FaqSection;
