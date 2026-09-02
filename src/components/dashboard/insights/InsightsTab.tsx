import { Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import ChurnRiskCard from "./ChurnRiskCard";
import DischargePredictionCard from "./DischargePredictionCard";
import PatientAdherenceCard from "./PatientAdherenceCard";
import BenchmarkCard from "./BenchmarkCard";
import RevenueGoalCard from "./RevenueGoalCard";
import OccupancyVsNoShowCard from "./OccupancyVsNoShowCard";
import LoadReadinessCard from "./LoadReadinessCard";
import { ENABLE_PERIODIZATION } from "@/lib/featureFlags";

interface Props {
  /** Set when in clinic mode (owner/secretary). */
  clinicId?: string;
  /** Set when in pro autônomo mode. */
  professionalId?: string;
  /** When true, also render Adherence + Benchmark cards (clinic only). */
  fullClinicMode?: boolean;
}

const InsightsTab = ({ clinicId, professionalId, fullClinicMode = false }: Props) => {
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {lang === "pt" ? "Insights inteligentes" : lang === "es" ? "Insights inteligentes" : "Smart insights"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {lang === "pt"
              ? "Dados preditivos da sua operação. Atualizado a cada acesso."
              : "Predictive data from your operation. Updated on each access."}
          </p>
        </div>
      </div>

      {/* Alerts row: churn + discharge */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChurnRiskCard clinicId={clinicId} professionalId={professionalId} />
        <DischargePredictionCard clinicId={clinicId} professionalId={professionalId} />
      </div>

      {/* Occupancy vs No-show — both modes */}
      <OccupancyVsNoShowCard clinicId={clinicId} professionalId={professionalId} />

      {/* Carga e prontidão (periodização) — ambos os modos */}
      {ENABLE_PERIODIZATION && (
        <LoadReadinessCard clinicId={clinicId} professionalId={professionalId} />
      )}


      {/* Clinic-only: adherence + benchmark */}
      {fullClinicMode && clinicId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PatientAdherenceCard clinicId={clinicId} />
          <BenchmarkCard clinicId={clinicId} />
        </div>
      )}

      {/* Revenue goal — both modes */}
      <RevenueGoalCard clinicId={clinicId} professionalId={professionalId} />
    </div>
  );
};

export default InsightsTab;
