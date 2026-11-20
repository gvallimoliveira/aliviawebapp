import { useLanguage } from "@/contexts/LanguageContext";
import { FEATURES } from "../content";

const PanelShowcaseSection = () => {
  const { t, language } = useLanguage();

  return (
    <section className="bg-accent/30 py-16 md:py-20">
      <div className="container">
        <p className="mb-2 text-xs font-medium text-primary">
          {language === "en" ? "Inside the panel" : language === "es" ? "Dentro del panel" : "Dentro do painel"}
        </p>
        <h2 className="mb-8 max-w-2xl text-2xl md:text-4xl font-bold text-foreground">{t("b2b.features_title")}</h2>
        <div tabIndex={0} role="region" aria-label={t("b2b.features_title")} className="flex gap-5 overflow-x-auto snap-x snap-mandatory pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {FEATURES.slice(0, 8).map((f) => (
            <article key={f.key} className="w-[76vw] sm:w-80 shrink-0 snap-start rounded-xl border border-border bg-card p-6">
              <span className="mb-6 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-semibold text-foreground">{t(f.key)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(f.descKey)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PanelShowcaseSection;
