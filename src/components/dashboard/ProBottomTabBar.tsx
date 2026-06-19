import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Users, CalendarDays, Brain, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import AssessPatientPicker from "./AssessPatientPicker";

interface Props {
  activeTab: string;
  onChangeTab: (tab: string) => void;
  hasAgentAccess: boolean;
  professionalId: string;
  clinicId?: string | null;
  isDemo?: boolean;
}

const LABELS = {
  pt: { patients: "Pacientes", assess: "Avaliar", agenda: "Agenda", agent: "Agente" },
  en: { patients: "Patients", assess: "Assess", agenda: "Schedule", agent: "Agent" },
  es: { patients: "Pacientes", assess: "Evaluar", agenda: "Agenda", agent: "Agente" },
};

const ProBottomTabBar = ({ activeTab, onChangeTab, hasAgentAccess, professionalId, clinicId, isDemo }: Props) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const L = LABELS[(language as "pt" | "en" | "es") || "pt"] || LABELS.pt;
  const [pickerOpen, setPickerOpen] = useState(false);

  const isPatients = activeTab === "professional";
  const isAgenda = activeTab === "agenda";
  const isAgent = location.pathname.startsWith("/agente");

  const goTab = (tab: string) => {
    onChangeTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const TabBtn = ({
    active,
    onClick,
    icon: Icon,
    label,
    ariaLabel,
  }: {
    active: boolean;
    onClick: () => void;
    icon: typeof Users;
    label: string;
    ariaLabel: string;
  }) => (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-[2px] min-h-[50px] px-2 transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className={cn("h-[18px] w-[18px]", active && "stroke-[2.4]")} />
      <span className={cn("text-[10px] leading-none font-medium", active && "font-semibold")}>{label}</span>
    </button>
  );

  return (
    <>
      <nav
        role="tablist"
        aria-label="Atalhos PRO"
        className={cn(
          "md:hidden fixed inset-x-0 bottom-0 z-40",
          "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
          "border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.04)]",
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="grid items-end relative"
          style={{ gridTemplateColumns: hasAgentAccess ? "1fr 1fr 1fr 1fr" : "1fr 1fr 1fr" }}
        >
          <TabBtn
            active={isPatients}
            onClick={() => goTab("professional")}
            icon={Users}
            label={L.patients}
            ariaLabel={L.patients}
          />
          {/* Central elevated CTA */}
          <div className="relative flex items-start justify-center -mt-5">
            <button
              type="button"
              aria-label={L.assess}
              onClick={() => setPickerOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center",
                "h-14 w-14 rounded-full bg-primary text-primary-foreground",
                "shadow-lg shadow-primary/30 ring-4 ring-background",
                "active:scale-95 transition-transform",
              )}
            >
              <Stethoscope className="h-6 w-6" />
            </button>
            <span className="absolute -bottom-0.5 text-[10px] font-semibold text-primary">
              {L.assess}
            </span>
          </div>
          <TabBtn
            active={isAgenda}
            onClick={() => goTab("agenda")}
            icon={CalendarDays}
            label={L.agenda}
            ariaLabel={L.agenda}
          />
          {hasAgentAccess && (
            <TabBtn
              active={isAgent}
              onClick={() => navigate("/agente")}
              icon={Brain}
              label={L.agent}
              ariaLabel={L.agent}
            />
          )}
        </div>
      </nav>

      <AssessPatientPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        professionalId={professionalId}
        clinicId={clinicId}
        isDemo={isDemo}
      />
    </>
  );
};

export default ProBottomTabBar;
