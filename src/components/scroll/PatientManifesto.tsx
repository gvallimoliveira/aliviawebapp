import ScrollWords from "@/components/scroll/ScrollWords";
import { useLanguage } from "@/contexts/LanguageContext";

const PatientManifesto = () => {
  const { t } = useLanguage();
  return (
    <ScrollWords
      kicker={t("cine.manifesto.kicker")}
      text={t("cine.manifesto.text")}
      footnote={t("cine.manifesto.footnote")}
    />
  );
};

export default PatientManifesto;
