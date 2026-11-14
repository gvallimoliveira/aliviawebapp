import CinematicClosing from "@/components/scroll/CinematicClosing";
import Footer from "@/components/Footer";
import InstallAppSection from "@/components/InstallAppSection";
import Reveal from "@/components/scroll/Reveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfessionalCta } from "../useProfessionalCta";

const ClosingSection = () => {
  const { t, language } = useLanguage();
  const { handleCTA, scrollToPricing } = useProfessionalCta();

  return (
    <>
      <CinematicClosing
        kicker={language === "en" ? "Ready when you are" : language === "es" ? "Cuando quieras" : "Quando você quiser"}
        heading={
          language === "en"
            ? "Start your next appointment with the case already read"
            : language === "es"
            ? "Empieza tu próxima consulta con el caso ya leído"
            : "Comece o próximo atendimento com o caso já lido"
        }
        sub={
          language === "en"
            ? "Anamnesis, red flags, pain map, validated questionnaires and AI reasoning — waiting for you before the patient walks in."
            : language === "es"
            ? "Anamnesis, red flags, mapa de dolor, cuestionarios validados y razonamiento con IA — listos antes de que entre el paciente."
            : "Anamnese, red flags, mapa de dor, questionários validados e raciocínio com IA — prontos antes do paciente entrar."
        }
        primaryLabel={t("b2b.hero_cta")}
        onPrimary={() => void handleCTA()}
        secondaryLabel={t("b2b.pricing_title")}
        onSecondary={scrollToPricing}
      />

      <Reveal y={20}>
        <InstallAppSection />
      </Reveal>
      <Footer />
    </>
  );
};

export default ClosingSection;
