import { useClinic } from "@/contexts/ClinicContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, User } from "lucide-react";

const ContextSelectionModal = () => {
  const { memberships, needsContextSelection, setActiveClinicId, dismissContextSelection } = useClinic();
  const { language } = useLanguage();

  if (!needsContextSelection) return null;

  const lang = language as "pt" | "en" | "es";
  const labels = {
    pt: { title: "Como deseja acessar?", desc: "Você possui vínculos com clínica(s). Escolha o contexto de uso:", solo: "Conta pessoal", soloDesc: "Acessar meu painel pessoal" },
    en: { title: "How would you like to proceed?", desc: "You have clinic memberships. Choose your context:", solo: "Personal account", soloDesc: "Access my personal dashboard" },
    es: { title: "¿Cómo desea acceder?", desc: "Tiene vínculos con clínica(s). Elija el contexto:", solo: "Cuenta personal", soloDesc: "Acceder a mi panel personal" },
  };
  const t = labels[lang];

  return (
    <Dialog open={needsContextSelection} onOpenChange={(open) => { if (!open) dismissContextSelection(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{t.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-4 px-4"
            onClick={() => { setActiveClinicId(null); }}
          >
            <User className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium">{t.solo}</p>
              <p className="text-xs text-muted-foreground">{t.soloDesc}</p>
            </div>
          </Button>
          {memberships.map((m) => (
            <Button
              key={m.clinic_id}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4 px-4"
              onClick={() => { setActiveClinicId(m.clinic_id); }}
            >
              <Building2 className="h-5 w-5 shrink-0 text-primary" />
              <div className="text-left">
                <p className="font-medium">{m.clinic_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{m.role}</p>
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContextSelectionModal;
