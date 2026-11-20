import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Footer from "@/components/Footer";
import InstallAppSection from "@/components/InstallAppSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfessionalCta } from "../useProfessionalCta";

const ClosingSection = () => {
  const { t, language } = useLanguage();
  const { handleCTA, scrollToPricing } = useProfessionalCta();

  return (
    <>
      <section className="bg-secondary/40 py-20 md:py-24">
        <div className="container text-center">
          <p className="mb-4 text-sm font-medium text-primary">{language === "en" ? "Ready when you are" : language === "es" ? "Cuando quieras" : "Quando você quiser"}</p>
          <h2 className="mx-auto max-w-2xl text-3xl md:text-5xl font-bold leading-tight text-foreground">
          {
          language === "en"
            ? "Start your next appointment with the case already read"
            : language === "es"
            ? "Empieza tu próxima consulta con el caso ya leído"
            : "Comece o próximo atendimento com o caso já lido"
          }
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base md:text-lg leading-relaxed text-muted-foreground">
          {
          language === "en"
            ? "Anamnesis, red flags, pain map, validated questionnaires and AI reasoning — waiting for you before the patient walks in."
            : language === "es"
            ? "Anamnesis, red flags, mapa de dolor, cuestionarios validados y razonamiento con IA — listos antes de que entre el paciente."
            : "Anamnese, red flags, mapa de dor, questionários validados e raciocínio com IA — prontos antes do paciente entrar."
          }
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="w-full sm:w-auto gap-2 rounded-xl" onClick={() => void handleCTA()}>
              {t("b2b.subscribe_now_cta")}<ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto rounded-xl" onClick={scrollToPricing}>{t("b2b.pricing_title")}</Button>
          </div>
        </div>
      </section>

      <InstallAppSection />
      <Footer />
    </>
  );
};

export default ClosingSection;
