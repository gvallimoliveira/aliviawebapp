import { useLanguage } from "@/contexts/LanguageContext";

/** Complement quote + kinetic reasoning statement. */
const ReasoningSection = () => {
  const { language } = useLanguage();

  return (
    <>
      <section className="py-10 md:py-14 bg-primary/10">
        <div className="container max-w-3xl mx-auto px-4 text-center">
            <p className="text-lg md:text-xl font-semibold text-primary italic">
              "O Aliv.iA não compete com o fisioterapeuta — nós o complementamos."
            </p>
        </div>
      </section>

      <section className="bg-background py-16 md:py-20">
        <div className="container max-w-3xl">
          <p className="mb-4 text-xs font-medium text-primary">
            {language === "en" ? "Clinical reasoning" : language === "es" ? "Razonamiento clínico" : "Raciocínio clínico"}
          </p>
          <p className="text-2xl md:text-4xl font-semibold leading-snug text-foreground">
          {
          language === "en"
            ? "You did not study physiotherapy to fill in forms. Aliv.iA collects, organizes and structures the case so you can do what only you can: reason, decide and treat."
            : language === "es"
            ? "No estudiaste fisioterapia para llenar formularios. Aliv.iA recoge, organiza y estructura el caso para que hagas lo que solo tú puedes: razonar, decidir y tratar."
            : "Você não estudou fisioterapia para preencher formulários. O Aliv.iA coleta, organiza e estrutura o caso para você fazer o que só você faz: raciocinar, decidir e tratar."
          }
          </p>
        </div>
      </section>
    </>
  );
};

export default ReasoningSection;
