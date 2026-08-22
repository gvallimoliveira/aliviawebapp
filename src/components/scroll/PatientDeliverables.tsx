import { FileText, Activity, Map, Dumbbell, ShieldAlert, MessageSquare } from "lucide-react";
import HorizontalShowcase, { type HorizontalItem } from "@/components/scroll/HorizontalShowcase";
import { useLanguage } from "@/contexts/LanguageContext";

const ICONS = [Map, ShieldAlert, Activity, FileText, Dumbbell, MessageSquare];

const PatientDeliverables = () => {
  const { t } = useLanguage();

  const items: HorizontalItem[] = ICONS.map((icon, i) => ({
    icon,
    title: t(`cine.deliverables.i${i + 1}.title`),
    description: t(`cine.deliverables.i${i + 1}.desc`),
  }));

  return (
    <HorizontalShowcase
      kicker={t("cine.deliverables.kicker")}
      heading={t("cine.deliverables.heading")}
      items={items}
    />
  );
};

export default PatientDeliverables;
