import { Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import ChurnRiskCard from "./ChurnRiskCard";
import DischargePredictionCard from "./DischargePredictionCard";
import PatientAdherenceCard from "./PatientAdherenceCard";
import BenchmarkCard from "./BenchmarkCard";
import RevenueGoalCard from "./RevenueGoalCard";
import OccupancyVsNoShowCard from "./OccupancyVsNoShowCard";
import LoadReadinessCard from "./LoadReadinessCard";
import ReassessmentDueCard from "./ReassessmentDueCard";
import StepsPhaseCard from "./StepsPhaseCard";
import ReactivationCard from "./ReactivationCard";
import TherapistStatsCard from "./TherapistStatsCard";
import ClinicFunnelCard from "./ClinicFunnelCard";
import ConcentrationCard from "./ConcentrationCard";
import { ENABLE_PERIODIZATION } from "@/lib/featureFlags";

interface Props {
  /** Set when in clinic mode (owner/secretary). */
  clinicId?: string;
  /** Set when in pro autônomo mode. */
  professionalId?: string;
  /** When true, also render clinic management cards (team, funnel, benchmark). */
  fullClinicMode?: boolean;
  /** Clinic owner/admin: sees management cards and dismisses for the whole team. */
  canManage?: boolean;
}

const InsightsTab = ({ clinicId, professionalId, fullClinicMode = false, canManage = false }: Props) => {
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

      {/* Alertas clínicos: abandono silencioso + flare-up/sobrecarga */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChurnRiskCard clinicId={clinicId} professionalId={professionalId} />
        {ENABLE_PERIODIZATION && (
          <LoadReadinessCard clinicId={clinicId} professionalId={professionalId} />
        )}
      </div>

      {/* Rotina clínica: reavaliação + fase STEPS + alta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReassessmentDueCard clinicId={clinicId} professionalId={professionalId} />
        {ENABLE_PERIODIZATION && (
          <StepsPhaseCard clinicId={clinicId} professionalId={professionalId} />
        )}
      </div>

      <DischargePredictionCard clinicId={clinicId} professionalId={professionalId} />

      {/* Adesão — agora também no PRO autônomo */}
      <PatientAdherenceCard clinicId={clinicId} professionalId={professionalId} />

      {/* Gestão: ocupação, reativação, receita */}
      <OccupancyVsNoShowCard clinicId={clinicId} professionalId={professionalId} />
      <ReactivationCard clinicId={clinicId} professionalId={professionalId} />

      {/* Conversão — clínica e PRO autônomo, sem duplicar o card. */}
      {(clinicId || professionalId) && <ClinicFunnelCard key={clinicId ?? professionalId} clinicId={clinicId} professionalId={professionalId} />}

      {/* Clínica: equipe, concentração, benchmark */}
      {fullClinicMode && clinicId && (
        <>
          <TherapistStatsCard clinicId={clinicId} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ConcentrationCard clinicId={clinicId} />
          </div>
          <BenchmarkCard clinicId={clinicId} />
        </>
      )}

      {/* Revenue goal — both modes */}
      <RevenueGoalCard clinicId={clinicId} professionalId={professionalId} />
    </div>
  );
};

export default InsightsTab;
