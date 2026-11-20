import { useLanguage } from "@/contexts/LanguageContext";

const StatementSection = () => {
  const { language } = useLanguage();

  return (
    <section className="bg-foreground text-background py-16 md:py-20">
      <div className="container max-w-3xl text-center">
        <p className="mb-4 text-sm font-medium text-background/80">
          {language === "en" ? "Less time writing" : language === "es" ? "Menos tiempo anotando" : "Menos tempo anotando"}
        </p>
        <h2 className="text-3xl md:text-5xl font-semibold leading-tight">
          {language === "en" ? "More time examining" : language === "es" ? "Más tiempo examinando" : "Mais tempo examinando"}
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-background/80">
        {
        language === "en"
          ? "The time you get back on every visit when anamnesis, pain map and questionnaires arrive already done."
          : language === "es"
          ? "El tiempo que recuperas en cada consulta cuando la anamnesis, el mapa de dolor y los cuestionarios ya llegan listos."
          : "O tempo que você recupera em cada atendimento quando anamnese, mapa de dor e questionários chegam prontos."
        }
        </p>
      </div>
    </section>
  );
};

export default StatementSection;
