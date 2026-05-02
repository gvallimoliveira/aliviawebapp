import { useClinic } from "@/contexts/ClinicContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, User, Stethoscope } from "lucide-react";

const ClinicContextSelector = () => {
  const { memberships, activeClinic, activeContext, setActiveContext, hasProfessionalProfile, availableContextsCount, canAccessProDemo } = useClinic();
  const { language } = useLanguage();

  // Hide selector when only one context exists
  if (availableContextsCount < 2) return null;

  const lang = language as "pt" | "en" | "es";
  const labels = {
    pt: { solo: "Conta pessoal", pro: "Profissional autônomo", demo: "Demo" },
    en: { solo: "Personal account", pro: "Autonomous professional", demo: "Demo" },
    es: { solo: "Cuenta personal", pro: "Profesional autónomo", demo: "Demo" },
  }[lang];

  const currentValue =
    activeContext === "clinic" && activeClinic ? activeClinic.clinic_id :
    activeContext === "professional" ? "pro" :
    activeContext === "professional_demo" ? "pro_demo" :
    "solo";

  const handleChange = (v: string) => {
    if (v === "solo") setActiveContext("personal");
    else if (v === "pro") setActiveContext("professional");
    else if (v === "pro_demo") setActiveContext("professional_demo");
    else setActiveContext("clinic", v);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={currentValue} onValueChange={handleChange}>
        <SelectTrigger className="w-[240px] h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="solo">
            <span className="flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              {labels.solo}
            </span>
          </SelectItem>
          {hasProfessionalProfile && (
            <SelectItem value="pro">
              <span className="flex items-center gap-2">
                <Stethoscope className="h-3.5 w-3.5" />
                {labels.pro}
              </span>
            </SelectItem>
          )}
          {canAccessProDemo && (
            <SelectItem value="pro_demo">
              <span className="flex items-center gap-2">
                <Stethoscope className="h-3.5 w-3.5" />
                {labels.pro}
                <Badge variant="outline" className="ml-1 text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                  {labels.demo}
                </Badge>
              </span>
            </SelectItem>
          )}
          {memberships.map((m) => (
            <SelectItem key={m.clinic_id} value={m.clinic_id}>
              <span className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                {m.clinic_name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ClinicContextSelector;
