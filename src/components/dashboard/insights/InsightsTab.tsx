import { useState, type ReactNode } from "react";
import { Sparkles, LayoutGrid, Users, Stethoscope, Wallet, Award, Settings2 } from "lucide-react";
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
import { LtvCard, EmptyChairCard, RevenuePerHourCard, DischargeVsDropoutCard, RecordComplianceCard, useSummaryTiles } from "./ManagementCards";
import { FrequencyGapCard, ReferralRateCard, LeakageCard, LateCancellationCard, OwnerDependenceCard, BottleneckCard } from "./OpsGrowthCards";
import ClinicServicesCard from "@/components/dashboard/ClinicServicesCard";
import { useManagementData, type ManagementData } from "./useManagementData";
import { ENABLE_PERIODIZATION } from "@/lib/featureFlags";
import ClinicOverviewMetrics from "./ClinicOverviewMetrics";

interface Props {
  clinicId?: string;
  professionalId?: string;
  fullClinicMode?: boolean;
  /** Clinic owner/admin: sees management categories and dismisses for the whole team. */
  canManage?: boolean;
}

type Cat = "summary" | "patients" | "routine" | "finance" | "team" | "operations";
type L = "pt" | "en" | "es";
const tr = (l: L, pt: string, en: string, es: string) => (l === "pt" ? pt : l === "es" ? es : en);

interface Ctx { clinicId?: string; professionalId?: string; scopeKey?: string; isManager: boolean; isClinic: boolean; teamDismiss: boolean; d: ManagementData }
interface Entry { id: string; cat: Cat; manager?: boolean; clinicOnly?: boolean; wide?: boolean; when?: boolean; render: (c: Ctx) => ReactNode }

/**
 * Insight registry: every insight (existing and future) belongs to exactly one
 * category; visibility by role lives here, never scattered in the page.
 */
const REGISTRY: Entry[] = [
  { id: "clinic-overview", cat: "summary", clinicOnly: true, wide: true, render: (c) => c.clinicId ? <ClinicOverviewMetrics key={c.clinicId} clinicId={c.clinicId} /> : null },
  { id: "churn", cat: "patients", render: (c) => <ChurnRiskCard clinicId={c.clinicId} professionalId={c.professionalId} dismissForTeam={c.teamDismiss} /> },
  { id: "load", cat: "patients", when: ENABLE_PERIODIZATION, render: (c) => <LoadReadinessCard clinicId={c.clinicId} professionalId={c.professionalId} /> },
  { id: "adherence", cat: "patients", wide: true, render: (c) => <PatientAdherenceCard clinicId={c.clinicId} professionalId={c.professionalId} /> },
  { id: "reactivation", cat: "patients", wide: true, render: (c) => <ReactivationCard clinicId={c.clinicId} professionalId={c.professionalId} /> },
  { id: "freq-gap", cat: "patients", render: (c) => <FrequencyGapCard d={c.d} /> },
  { id: "reassessment", cat: "routine", render: (c) => <ReassessmentDueCard clinicId={c.clinicId} professionalId={c.professionalId} dismissForTeam={c.teamDismiss} /> },
  { id: "steps", cat: "routine", when: ENABLE_PERIODIZATION, render: (c) => <StepsPhaseCard clinicId={c.clinicId} professionalId={c.professionalId} dismissForTeam={c.teamDismiss} /> },
  { id: "discharge-pred", cat: "routine", wide: true, render: (c) => <DischargePredictionCard clinicId={c.clinicId} professionalId={c.professionalId} /> },
  { id: "revenue-goal", cat: "finance", manager: true, wide: true, render: (c) => <RevenueGoalCard clinicId={c.clinicId} professionalId={c.professionalId} /> },
  { id: "ltv", cat: "finance", manager: true, render: (c) => <LtvCard d={c.d} /> },
  { id: "empty-chair", cat: "finance", manager: true, render: (c) => <EmptyChairCard d={c.d} /> },
  { id: "rev-hour", cat: "finance", manager: true, render: (c) => <RevenuePerHourCard d={c.d} showTeam={c.isClinic} /> },
  { id: "concentration", cat: "finance", manager: true, clinicOnly: true, render: (c) => <ConcentrationCard clinicId={c.clinicId!} /> },
  { id: "referral", cat: "finance", manager: true, render: (c) => <ReferralRateCard d={c.d} /> },
  { id: "discharge-dropout", cat: "team", manager: true, render: (c) => <DischargeVsDropoutCard d={c.d} /> },
  { id: "owner-dep", cat: "team", manager: true, clinicOnly: true, render: (c) => <OwnerDependenceCard d={c.d} /> },
  { id: "therapists", cat: "team", manager: true, clinicOnly: true, wide: true, render: (c) => <TherapistStatsCard clinicId={c.clinicId!} /> },
  { id: "benchmark", cat: "team", manager: true, clinicOnly: true, wide: true, render: (c) => <BenchmarkCard clinicId={c.clinicId!} /> },
  { id: "care-services", cat: "operations", manager: true, wide: true, render: (c) => <ClinicServicesCard key={`services:${c.scopeKey}`} professionalId={c.isClinic ? undefined : c.professionalId} /> },
  { id: "occupancy", cat: "operations", wide: true, render: (c) => <OccupancyVsNoShowCard clinicId={c.clinicId} professionalId={c.professionalId} /> },
  { id: "records", cat: "operations", render: (c) => <RecordComplianceCard d={c.d} scopeKey={c.scopeKey} dismissForTeam={c.teamDismiss} showTeam={c.isClinic} /> },
  { id: "funnel", cat: "operations", manager: true, wide: true, render: (c) => <ClinicFunnelCard key={c.scopeKey} clinicId={c.clinicId} professionalId={c.professionalId} dismissForTeam={c.teamDismiss} /> },
  { id: "leakage", cat: "operations", render: (c) => <LeakageCard d={c.d} scopeKey={c.scopeKey} dismissForTeam={c.teamDismiss} /> },
  { id: "late-cancel", cat: "operations", render: (c) => <LateCancellationCard d={c.d} showTeam={c.isClinic} /> },
  { id: "bottleneck", cat: "operations", manager: true, render: (c) => <BottleneckCard d={c.d} isClinic={c.isClinic} /> },
];

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const InsightsTab = ({ clinicId, professionalId, fullClinicMode = false, canManage = false }: Props) => {
  const l = useLanguage().language as L;
  const isClinic = !!clinicId;
  // PRO autônomo é dono dos próprios dados; na clínica, gestão só para dono/admin.
  const isManager = !isClinic || canManage;
  const scopeKey = clinicId ?? professionalId;
  const d = useManagementData(clinicId, professionalId);
  const tiles = useSummaryTiles(d, isManager);
  const storeKey = `insights-cat:${scopeKey}`;
  const [cat, setCatState] = useState<Cat>(() => (sessionStorage.getItem(storeKey) as Cat) || "summary");
  const setCat = (c: Cat) => { setCatState(c); sessionStorage.setItem(storeKey, c); };

  const ctx: Ctx = { clinicId, professionalId, scopeKey, isManager, isClinic, teamDismiss: canManage && isClinic, d };
  const entries = REGISTRY.filter((e) => e.when !== false && (!e.manager || isManager) && (!e.clinicOnly || (isClinic && fullClinicMode)));

  const CATS: { id: Cat; label: string; icon: ReactNode }[] = [
    { id: "summary", label: tr(l, "Resumo", "Overview", "Resumen"), icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "patients", label: tr(l, "Pacientes", "Patients", "Pacientes"), icon: <Users className="h-3.5 w-3.5" /> },
    { id: "routine", label: tr(l, "Rotina clínica", "Clinical routine", "Rutina clínica"), icon: <Stethoscope className="h-3.5 w-3.5" /> },
    { id: "finance", label: tr(l, "Financeiro", "Finance", "Finanzas"), icon: <Wallet className="h-3.5 w-3.5" /> },
    { id: "team", label: isClinic ? tr(l, "Equipe & Qualidade", "Team & Quality", "Equipo y Calidad") : tr(l, "Qualidade", "Quality", "Calidad"), icon: <Award className="h-3.5 w-3.5" /> },
    { id: "operations", label: tr(l, "Operação", "Operations", "Operación"), icon: <Settings2 className="h-3.5 w-3.5" /> },
  ];
  const visibleCats = CATS.filter((c) => c.id === "summary" || entries.some((e) => e.cat === c.id));
  const active = visibleCats.some((c) => c.id === cat) ? cat : "summary";

  const Tile = ({ to, label, value, hint, tone }: { to: Cat; label: string; value: string; hint?: string; tone?: "bad" | "good" }) => (
    <button type="button" onClick={() => setCat(to)} className="text-left rounded-xl border border-border bg-card p-3 hover:border-primary/50 transition-colors">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${tone === "bad" ? "text-destructive" : tone === "good" ? "text-primary" : "text-foreground"}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold text-foreground">{tr(l, "Insights inteligentes", "Smart insights", "Insights inteligentes")}</h2>
          <p className="text-xs text-muted-foreground">{tr(l, "Organizados por categoria. Comece pelo resumo e toque para aprofundar.", "Organized by category. Start with the overview and tap to drill down.", "Organizados por categoría. Empiece por el resumen.")}</p>
        </div>
      </div>

      <nav className="sticky top-0 z-10 -mx-1 px-1 py-1 bg-background/95 backdrop-blur overflow-x-auto">
        <div className="flex gap-1.5 w-max">
          {visibleCats.map((c) => (
            <button key={c.id} type="button" onClick={() => setCat(c.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap border transition-colors ${active === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:text-foreground"}`}>
              {c.icon}{c.label}
            </button>
          ))}
        </div>
      </nav>

      {active === "summary" ? (
        <div className="space-y-4">
          {entries.filter((e) => e.cat === "summary").map((e) => <div key={e.id}>{e.render(ctx)}</div>)}
          {!tiles ? <p className="text-sm text-muted-foreground">{tr(l, "Carregando…", "Loading…", "Cargando…")}</p> : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {tiles.showMoney && <Tile to="finance" label={tr(l, "Perdido c/ faltas (30d)", "Lost to no-shows (30d)", "Perdido por faltas (30d)")} value={brl(tiles.chair.lostValue)} hint={`${tiles.chair.lostCount} ${tr(l, "horários", "slots", "turnos")}`} tone={tiles.chair.lostValue ? "bad" : undefined} />}
              {tiles.showMoney && <Tile to="finance" label={tr(l, "LTV clínico", "Clinical LTV", "LTV clínico")} value={brl(tiles.ltv.avgValue)} hint={`${tiles.ltv.avgSessions} ${tr(l, "sessões/paciente", "sessions/patient", "sesiones/paciente")}`} />}
              {isManager && <Tile to="team" label={tr(l, "Taxa de alta (180d)", "Discharge rate (180d)", "Tasa de alta (180d)")} value={`${tiles.dd.dischargeRate}%`} hint={`${tiles.dd.dropouts} ${tr(l, "evasões", "dropouts", "abandonos")}`} tone={tiles.dd.total ? (tiles.dd.dischargeRate >= 50 ? "good" : "bad") : undefined} />}
              <Tile to="operations" label={tr(l, "Prontuário em dia (30d)", "Records on time (30d)", "Historia al día (30d)")} value={tiles.rec.rate === null ? "—" : `${tiles.rec.rate}%`} hint={`${tiles.rec.pendingCount} ${tr(l, "pendências", "pending", "pendientes")}`} tone={tiles.rec.rate === null ? undefined : tiles.rec.rate >= 80 ? "good" : "bad"} />
              <Tile to="operations" label={tr(l, "Sem próximo horário", "No next appointment", "Sin próximo turno")} value={String(tiles.leak)} hint={tr(l, "pacientes ativos", "active patients", "pacientes activos")} tone={tiles.leak ? "bad" : "good"} />
            </div>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {visibleCats.filter((c) => c.id !== "summary").map((c) => (
              <button key={c.id} type="button" onClick={() => setCat(c.id)} className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50">
                {c.icon}<span className="flex-1 text-left">{c.label}</span><span className="text-xs">{entries.filter((e) => e.cat === c.id).length}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {entries.filter((e) => e.cat === active).map((e) => (
            <div key={e.id} className={e.wide ? "lg:col-span-2" : ""}>{e.render(ctx)}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InsightsTab;
