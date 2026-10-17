import { useLanguage } from "@/contexts/LanguageContext";
import { isPreventiveAssessment, type PurposeData } from "@/lib/assessmentPurpose";
import { preventionGoalLabels, purposeCopy } from "./AssessmentPurposeFields";
import { getAllRegions } from "./painMapData";

export default function PreventiveAssessmentSummary({ data }: { data: PurposeData }) {
  const { language } = useLanguage();
  if (!isPreventiveAssessment(data)) return null;
  const regions = getAllRegions();
  return <div className="space-y-2 border-l-2 border-primary pl-3 text-sm">
    <p className="font-semibold text-primary">{purposeCopy[language].saved}</p>
    {!!data.preventionGoals?.length && <p><span className="font-medium">{purposeCopy[language].goals}: </span>{preventionGoalLabels(data.preventionGoals, language)}</p>}
    {data.preventionGoalDetails && <p className="whitespace-pre-wrap">{data.preventionGoalDetails}</p>}
    {!!data.historyRegions?.length && <p><span className="font-medium">{purposeCopy[language].map}: </span>{data.historyRegions.map(id => regions[id]?.[language === "pt" ? "label_pt" : "label_en"] || id).join(", ")}</p>}
  </div>;
}