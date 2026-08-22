import HorizontalShowcase from "@/components/scroll/HorizontalShowcase";
import { useLanguage } from "@/contexts/LanguageContext";
import { FEATURES } from "../content";

const PanelShowcaseSection = () => {
  const { t, language } = useLanguage();

  return (
    <HorizontalShowcase
      kicker={language === "en" ? "Inside the panel" : language === "es" ? "Dentro del panel" : "Dentro do painel"}
      heading={t("b2b.features_title")}
      items={FEATURES.slice(0, 8).map((f) => ({
        icon: f.icon,
        title: t(f.key),
        description: t(f.descKey),
      }))}
    />
  );
};

export default PanelShowcaseSection;
