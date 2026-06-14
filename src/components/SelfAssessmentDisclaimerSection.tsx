import { motion } from "framer-motion";
import { Info, UserCheck, FileText, PhoneCall } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Legal / liability disclaimer surfaced on the patient landing.
 * Makes it explicit that the assessment is a SELF-assessment — filled out
 * by the user and guided by the app's methodology — and not a clinical
 * consultation performed by a physiotherapist on the user's behalf.
 */
const SelfAssessmentDisclaimerSection = () => {
  const { t } = useLanguage();

  const title = t("selfassess.title") || "Como funciona a autoavaliação";
  const intro =
    t("selfassess.intro") ||
    "O Aliv.iA é uma ferramenta de autoavaliação musculoesquelética: você mesmo preenche as respostas, guiado(a) pelo método clínico embutido no aplicativo. Não há atendimento clínico individualizado, presencial ou à distância, realizado por um profissional sobre o seu caso.";

  const items = [
    {
      icon: UserCheck,
      title:
        t("selfassess.item1.title") || "Preenchimento feito por você",
      desc:
        t("selfassess.item1.desc") ||
        "Todas as respostas são fornecidas pelo próprio usuário. A precisão do resultado depende diretamente da honestidade e clareza das informações preenchidas.",
    },
    {
      icon: Info,
      title: t("selfassess.item2.title") || "Guiado por método clínico",
      desc:
        t("selfassess.item2.desc") ||
        "O processo é orientado por um método de raciocínio clínico baseado em evidência, formulado por fisioterapeuta especialista. O sistema apresenta hipóteses e orientações educacionais — não um diagnóstico médico.",
    },
    {
      icon: FileText,
      title:
        t("selfassess.item3.title") || "Não substitui consulta presencial",
      desc:
        t("selfassess.item3.desc") ||
        "A autoavaliação é uma ferramenta de triagem e educação em saúde. Ela não substitui consulta médica ou fisioterapêutica presencial, não estabelece relação clínica profissional-paciente e não deve ser usada em situações de emergência.",
    },
  ];

  const legal =
    t("selfassess.legal") ||
    "Ao utilizar a plataforma, você reconhece que o resultado é gerado a partir das suas próprias respostas, processadas por um sistema automatizado. A Aliv.iA, seus desenvolvedores e profissionais consultores não se responsabilizam por decisões clínicas tomadas exclusivamente com base no conteúdo gerado. Em caso de sinais de alerta, dor intensa, trauma recente, piora progressiva ou dúvida, procure atendimento presencial.";

  return (
    <section className="py-14 md:py-20" aria-labelledby="selfassess-title">
      <div className="container max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-primary/20 bg-primary/[0.03] p-6 md:p-10"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
              <Info className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <h2
              id="selfassess-title"
              className="text-2xl md:text-3xl font-bold text-foreground"
            >
              {title}
            </h2>
          </div>

          <p className="mb-8 text-base leading-relaxed text-muted-foreground">
            {intro}
          </p>

          <div className="grid gap-5 md:grid-cols-3">
            {items.map(({ icon: Icon, title: itemTitle, desc }) => (
              <div
                key={itemTitle}
                className="rounded-2xl border border-border/60 bg-background p-5"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold text-foreground">
                  {itemTitle}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-xs leading-relaxed text-muted-foreground/80">
            {legal}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default SelfAssessmentDisclaimerSection;
