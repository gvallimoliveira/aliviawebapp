import KineticStatement from "@/components/scroll/KineticStatement";
import { useLanguage } from "@/contexts/LanguageContext";

const StatementSection = () => {
  const { language } = useLanguage();

  return (
    <KineticStatement
      kicker={language === "en" ? "Less time writing" : language === "es" ? "Menos tiempo anotando" : "Menos tempo anotando"}
      word={language === "en" ? "More time examining" : language === "es" ? "Más tiempo examinando" : "Mais tempo examinando"}
      caption={
        language === "en"
          ? "The time you get back on every visit when anamnesis, pain map and questionnaires arrive already done."
          : language === "es"
          ? "El tiempo que recuperas en cada consulta cuando la anamnesis, el mapa de dolor y los cuestionarios ya llegan listos."
          : "O tempo que você recupera em cada atendimento quando anamnese, mapa de dor e questionários chegam prontos."
      }
    />
  );
};

export default StatementSection;
