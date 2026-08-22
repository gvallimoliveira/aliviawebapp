import KineticStatement from "@/components/scroll/KineticStatement";
import { useLanguage } from "@/contexts/LanguageContext";

const PatientStatement = () => {
  const { t } = useLanguage();
  return (
    <KineticStatement
      kicker={t("cine.statement.kicker")}
      word={t("cine.statement.word")}
      caption={t("cine.statement.caption")}
    />
  );
};

export default PatientStatement;
