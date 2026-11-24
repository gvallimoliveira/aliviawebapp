import { motion } from "framer-motion";
import { BookOpen, Filter, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { EVIDENCE_NICHES, fadeUp } from "../content";

const EvidenceLibrarySection = () => {
  const { language, t } = useLanguage();

  return (
    <section className="py-14 md:py-20">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.div
          initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={fadeUp} custom={0}
          className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 p-6 md:p-10"
        >
          <div className="blur-blob absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative grid md:grid-cols-[1.2fr_1fr] gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 mb-4">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary tracking-wide uppercase">
                  {language === "pt" ? "Novidade PRO · Beta" : language === "es" ? "Novedad PRO · Beta" : "PRO update · Beta"}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3 leading-tight">
                {language === "pt"
                  ? "Biblioteca de Evidências por Nicho — direto dentro do Agente Clínico"
                  : language === "es"
                  ? "Biblioteca de Evidencia por Nicho — dentro del Agente Clínico"
                  : "Evidence Library by Niche — inside the Clinical Agent"}
              </h2>
              <p className="text-base text-muted-foreground leading-relaxed mb-5">
                {language === "pt"
                  ? "Consulte, filtre e favorite artigos selecionados por nicho clínico dentro do Agente. A biblioteca reúne referências para aprofundar a leitura e apoiar a discussão de casos, com filtros de ano e nota PEDro."
                  : language === "es"
                  ? "Consulta, filtra y marca como favoritos artículos seleccionados por especialidad dentro del Agente. La biblioteca reúne referencias para profundizar la lectura y apoyar la discusión de casos, con filtros de año y puntuación PEDro."
                  : "Browse, filter and favorite papers selected by clinical niche inside the Agent. The library brings together references for further reading and case discussions, with year and PEDro score filters."}
                <span className="block text-sm mt-3">{t("evidence.pedro_note")}</span>
              </p>
              <ul className="grid sm:grid-cols-2 gap-2.5 text-sm text-foreground">
                <li className="flex items-start gap-2"><BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />{language === "pt" ? "Segmentado por nicho clínico" : language === "es" ? "Segmentado por nicho clínico" : "Sorted by clinical niche"}</li>
                <li className="flex items-start gap-2"><Filter className="h-4 w-4 text-primary mt-0.5 shrink-0" />{language === "pt" ? "Filtros de ano e nota PEDro" : language === "es" ? "Filtros de año y nota PEDro" : "Year and PEDro score filters"}</li>
                <li className="flex items-start gap-2"><Star className="h-4 w-4 text-primary mt-0.5 shrink-0" />{language === "pt" ? "Favorite estudos para acesso rápido" : language === "es" ? "Marca favoritos para acceso rápido" : "Favorite studies for quick access"}</li>
                <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />{language === "pt" ? "Referências para discutir com o Agente" : language === "es" ? "Referencias para discutir con el Agente" : "References to discuss with the Agent"}</li>
              </ul>
            </div>
            <div>
              <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {language === "pt" ? "Nichos atuais" : language === "es" ? "Nichos actuales" : "Current niches"}
                  </span>
                  <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">BETA</Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {EVIDENCE_NICHES.map((n) => (
                    <span key={n} className="rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1">{n}</span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                  {language === "pt"
                    ? "Novos nichos entram conforme novos artigos são aprovados na curadoria."
                    : language === "es"
                    ? "Nuevos nichos se incorporan a medida que se aprueban más artículos."
                    : "New niches are added as more studies clear curation."}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default EvidenceLibrarySection;
