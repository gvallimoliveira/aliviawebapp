import { useClinic } from "@/contexts/ClinicContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, User } from "lucide-react";

const ClinicContextSelector = () => {
  const { memberships, activeClinic, setActiveClinicId } = useClinic();
  const { language } = useLanguage();

  if (memberships.length === 0) return null;

  const soloLabel = language === "pt" ? "Conta pessoal" : language === "es" ? "Cuenta personal" : "Personal account";

  return (
    <div className="flex items-center gap-2">
      <Select
        value={activeClinic?.clinic_id || "solo"}
        onValueChange={(v) => setActiveClinicId(v === "solo" ? null : v)}
      >
        <SelectTrigger className="w-[220px] h-9 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="solo">
            <span className="flex items-center gap-2">
              <User className="h-3.5 w-3.5" />
              {soloLabel}
            </span>
          </SelectItem>
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
