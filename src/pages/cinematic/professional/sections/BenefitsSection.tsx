import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { BENEFITS, fadeUp } from "../content";

const BenefitsSection = () => {
  const { t, language } = useLanguage();

  return (
    <section className="py-16 md:py-20">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.h2
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          className="text-3xl md:text-4xl font-bold text-foreground text-center mb-12"
        >
          {t("b2b.benefits_title")}
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.titleKey}
              initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} custom={i}
              className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <b.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">{t(b.titleKey)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(b.descKey)}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}
          className="mt-10 mx-auto max-w-2xl text-center"
        >
          <div className="inline-flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-6 py-4">
            <GraduationCap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground leading-relaxed italic">{t("b2b.grad_cta")}</p>
          </div>
        </motion.div>

        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={2}
          className="mt-6 mx-auto max-w-2xl"
        >
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-6 py-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <GraduationCap className="h-5 w-5 text-amber-600" />
              <p className="text-sm font-semibold text-amber-800">
                {language === "pt" ? "Ainda é aluno de fisioterapia?" : language === "es" ? "¿Aún eres estudiante de fisioterapia?" : "Still a physiotherapy student?"}
              </p>
            </div>
            <p className="text-sm text-amber-700/90 leading-relaxed">
              {language === "pt"
                ? "Ao assinar o Plano Profissional, você pode ativar o modo Aliv.iA Acadêmico e usar todas as ferramentas PRO com selo acadêmico — ideal para prática supervisionada e estágios."
                : language === "es"
                ? "Al suscribirte al Plan Profesional, puedes activar el modo Aliv.iA Académico y usar todas las herramientas PRO con sello académico — ideal para práctica supervisada y pasantías."
                : "By subscribing to the Professional Plan, you can activate Aliv.iA Academic mode and use all PRO tools with an academic seal — ideal for supervised practice and internships."}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default BenefitsSection;
