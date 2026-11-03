import { useClinic } from "@/contexts/ClinicContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Stethoscope, UserPlus, GraduationCap, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "default" | "chip" | "list";

interface Props {
  /** default = select largo; chip = indicador compacto no header; list = lista no menu lateral */
  variant?: Variant;
  /** Chamado após qualquer troca (ex.: fechar o menu lateral). */
  onSelected?: () => void;
}

const ClinicContextSelector = ({ variant = "default", onSelected }: Props) => {
  const {
    memberships, activeClinic, activeContext, setActiveContext,
    hasProfessionalProfile, availableContextsCount, canAccessProDemo,
    pendingProfessionalSignup, isStudentProfessional,
  } = useClinic();
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Hide selector when only one context exists
  if (availableContextsCount < 2) return null;

  const lang = language as "pt" | "en" | "es";
  const labels = ({
    pt: { solo: "Conta pessoal", pro: "Profissional autônomo", student: "Modo Acadêmico", demo: "Demo", proRegister: "Cadastrar como profissional", pending: "Pendente", soloShort: "Pessoal", proShort: "PRO", studentShort: "Acadêmico", section: "Ambiente ativo", aria: "Trocar ambiente" },
    en: { solo: "Personal account", pro: "Autonomous professional", student: "Academic Mode", demo: "Demo", proRegister: "Register as professional", pending: "Pending", soloShort: "Personal", proShort: "PRO", studentShort: "Academic", section: "Active workspace", aria: "Switch workspace" },
    es: { solo: "Cuenta personal", pro: "Profesional autónomo", student: "Modo Académico", demo: "Demo", proRegister: "Registrarse como profesional", pending: "Pendiente", soloShort: "Personal", proShort: "PRO", studentShort: "Académico", section: "Entorno activo", aria: "Cambiar entorno" },
  } as const)[lang] || ({} as never);

  const currentValue =
    activeContext === "clinic" && activeClinic ? activeClinic.clinic_id :
    activeContext === "professional" ? "pro" :
    activeContext === "professional_demo" ? "pro_demo" :
    "solo";

  const handleChange = (v: string) => {
    if (v === "solo") setActiveContext("personal");
    else if (v === "pro") setActiveContext("professional");
    else if (v === "pro_demo") setActiveContext("professional_demo");
    else if (v === "pro_register") {
      try { sessionStorage.removeItem("signupOrigin"); } catch {}
      navigate("/professional/register");
    }
    else setActiveContext("clinic", v);
    onSelected?.();
  };

  const ProIcon = isStudentProfessional ? GraduationCap : Stethoscope;

  type Opt = { value: string; icon: typeof User; label: string; short: string; badge?: "demo" | "pending" };
  const options: Opt[] = [
    { value: "solo", icon: User, label: labels.solo, short: labels.soloShort },
    ...(hasProfessionalProfile ? [{ value: "pro", icon: ProIcon, label: isStudentProfessional ? labels.student : labels.pro, short: isStudentProfessional ? labels.studentShort : labels.proShort }] : []),
    ...(canAccessProDemo ? [{ value: "pro_demo", icon: Stethoscope, label: labels.pro, short: `${labels.proShort} ${labels.demo}`, badge: "demo" as const }] : []),
    ...(pendingProfessionalSignup && !hasProfessionalProfile ? [{ value: "pro_register", icon: UserPlus, label: labels.proRegister, short: labels.proRegister, badge: "pending" as const }] : []),
    ...memberships.map((m) => ({ value: m.clinic_id, icon: Building2, label: m.clinic_name, short: m.clinic_name })),
  ];

  const renderBadge = (b?: Opt["badge"]) =>
    b === "demo" ? (
      <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20">{labels.demo}</Badge>
    ) : b === "pending" ? (
      <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1.5 bg-accent/30 text-accent-foreground border-accent/40">{labels.pending}</Badge>
    ) : null;

  if (variant === "list") {
    return (
      <div className="pb-1">
        <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
          {labels.section}
        </div>
        <div className="flex flex-col gap-0.5">
          {options.map((o) => {
            const active = o.value === currentValue;
            const Icon = o.icon;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => handleChange(o.value)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-left w-full transition-colors",
                  active ? "bg-primary/10 text-primary font-semibold" : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 min-w-0 truncate">{o.label}</span>
                {renderBadge(o.badge)}
                {active && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
        <div className="my-2 border-t border-border/40" />
      </div>
    );
  }

  const current = options.find((o) => o.value === currentValue) || options[0];
  const CurrentIcon = current.icon;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <Select value={currentValue} onValueChange={handleChange}>
        <SelectTrigger
          aria-label={labels.aria}
          className={
            variant === "chip"
              ? "h-8 w-auto max-w-[150px] sm:max-w-[240px] gap-1.5 rounded-full border-primary/30 bg-primary/5 px-3 text-xs font-semibold text-primary"
              : "w-[240px] h-9 text-sm"
          }
        >
          {variant === "chip" ? (
            <div className="flex items-center gap-1.5 min-w-0 whitespace-nowrap">
              <CurrentIcon className="h-3.5 w-3.5 shrink-0" />
              <div className="truncate">{current.short}</div>
            </div>
          ) : (
            <SelectValue />
          )}
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => {
            const Icon = o.icon;
            return (
              <SelectItem key={o.value} value={o.value}>
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  {o.label}
                  {renderBadge(o.badge)}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ClinicContextSelector;
