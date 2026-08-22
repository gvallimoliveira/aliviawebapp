import Reveal from "@/components/scroll/Reveal";
import ScrollWords from "@/components/scroll/ScrollWords";
import { useLanguage } from "@/contexts/LanguageContext";

/** Complement quote + kinetic reasoning statement. */
const ReasoningSection = () => {
  const { language } = useLanguage();

  return (
    <>
      <section className="py-10 md:py-14 bg-primary/10">
        <div className="container max-w-3xl mx-auto px-4 text-center">
          <Reveal y={18}>
            <p className="text-lg md:text-xl font-semibold text-primary italic">
              "O Aliv.iA não compete com o fisioterapeuta — nós o complementamos."
            </p>
          </Reveal>
        </div>
      </section>

      <ScrollWords
        kicker={language === "en" ? "Clinical reasoning" : language === "es" ? "Razonamiento clínico" : "Raciocínio clínico"}
        text={
          language === "en"
            ? "You did not study physiotherapy to fill in forms. Aliv.iA collects, organizes and structures the case so you can do what only you can: reason, decide and treat."
            : language === "es"
            ? "No estudiaste fisioterapia para llenar formularios. Aliv.iA recoge, organiza y estructura el caso para que hagas lo que solo tú puedes: razonar, decidir y tratar."
            : "Você não estudou fisioterapia para preencher formulários. O Aliv.iA coleta, organiza e estrutura o caso para você fazer o que só você faz: raciocinar, decidir e tratar."
        }
      />
    </>
  );
};

export default ReasoningSection;
