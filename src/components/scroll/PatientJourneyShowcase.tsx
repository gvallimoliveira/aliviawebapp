import StickyShowcase, { type ShowcaseStep } from "@/components/scroll/StickyShowcase";
import { useLanguage } from "@/contexts/LanguageContext";
import stepPainMap from "@/assets/step-painmap.jpg";
import stepAnamnesis from "@/assets/step-anamnesis.jpg";
import stepTests from "@/assets/step-tests.jpg";
import stepTreatment from "@/assets/step-treatment.jpg";

const IMAGES = [stepPainMap, stepAnamnesis, stepTests, stepTreatment];

const PatientJourneyShowcase = () => {
  const { t } = useLanguage();

  const steps: ShowcaseStep[] = IMAGES.map((image, i) => ({
    image,
    title: t(`cine.journey.s${i + 1}.title`),
    description: t(`cine.journey.s${i + 1}.desc`),
  }));

  return (
    <StickyShowcase
      kicker={t("cine.journey.kicker")}
      heading={t("cine.journey.heading")}
      steps={steps}
    />
  );
};

export default PatientJourneyShowcase;
