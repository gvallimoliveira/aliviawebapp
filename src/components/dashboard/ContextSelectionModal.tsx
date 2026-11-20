import { useClinic } from "@/contexts/ClinicContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2, User, Stethoscope, UserPlus, GraduationCap } from "lucide-react";

const ContextSelectionModal = () => {
  const { memberships, needsContextSelection, setActiveContext, dismissContextSelection, hasProfessionalProfile, canAccessProDemo, pendingProfessionalSignup, setPendingProfessionalSignup, isStudentProfessional } = useClinic();
  const { language } = useLanguage();
  const navigate = useNavigate();

  if (!needsContextSelection) return null;

  const lang = language as "pt" | "en" | "es";
  const labels = {
    pt: {
      title: "Como deseja acessar?",
      desc: "Você tem mais de um perfil. Escolha o contexto de uso:",
      solo: "Conta pessoal", soloDesc: "Acessar meu painel pessoal",
      pro: "Profissional autônomo", proDesc: "Atender meus pacientes particulares",
      student: "Modo Acadêmico", studentDesc: "Usar ferramentas Aliv.iA Acadêmico",
      proDemo: "Profissional autônomo (Demo)", proDemoDesc: "Conhecer o painel PRO com dados de exemplo",
      proRegister: "Cadastrar como profissional", proRegisterDesc: "Concluir seu cadastro PRO (bloqueado até assinar)",
    },
    en: {
      title: "How would you like to proceed?",
      desc: "You have multiple profiles. Choose your context:",
      solo: "Personal account", soloDesc: "Access my personal dashboard",
      pro: "Autonomous professional", proDesc: "Manage my private patients",
      student: "Academic Mode", studentDesc: "Use Aliv.iA Academic tools",
      proDemo: "Autonomous professional (Demo)", proDemoDesc: "Preview the PRO dashboard with sample data",
      proRegister: "Register as professional", proRegisterDesc: "Finish your PRO sign-up (locked until you subscribe)",
    },
    es: {
      title: "¿Cómo desea acceder?",
      desc: "Tiene varios perfiles. Elija el contexto:",
      solo: "Cuenta personal", soloDesc: "Acceder a mi panel personal",
      pro: "Profesional autónomo", proDesc: "Atender mis pacientes particulares",
      student: "Modo Académico", studentDesc: "Usar las herramientas Aliv.iA Académico",
      proDemo: "Profesional autónomo (Demo)", proDemoDesc: "Conocer el panel PRO con datos de ejemplo",
      proRegister: "Registrarse como profesional", proRegisterDesc: "Completar su registro PRO (bloqueado hasta suscribirse)",
    },
  }[lang];

  return (
    <Dialog open={needsContextSelection} onOpenChange={(open) => { if (!open) dismissContextSelection(); }}>
      <DialogContent data-profile-context-selector="true" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{labels.title}</DialogTitle>
          <DialogDescription>{labels.desc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-4 px-4"
            onClick={() => setActiveContext("personal")}
          >
            <User className="h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium">{labels.solo}</p>
              <p className="text-xs text-muted-foreground">{labels.soloDesc}</p>
            </div>
          </Button>
          {hasProfessionalProfile && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4 px-4"
              onClick={() => setActiveContext("professional")}
            >
              {isStudentProfessional ? (
                <GraduationCap className="h-5 w-5 shrink-0 text-primary" />
              ) : (
                <Stethoscope className="h-5 w-5 shrink-0 text-primary" />
              )}
              <div className="text-left">
                <p className="font-medium">{isStudentProfessional ? labels.student : labels.pro}</p>
                <p className="text-xs text-muted-foreground">{isStudentProfessional ? labels.studentDesc : labels.proDesc}</p>
              </div>
            </Button>
          )}
          {canAccessProDemo && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4 px-4"
              onClick={() => setActiveContext("professional_demo")}
            >
              <Stethoscope className="h-5 w-5 shrink-0 text-primary" />
              <div className="text-left flex items-center gap-2">
                <div>
                  <p className="font-medium">{labels.proDemo}</p>
                  <p className="text-xs text-muted-foreground">{labels.proDemoDesc}</p>
                </div>
              </div>
            </Button>
          )}
          {pendingProfessionalSignup && !hasProfessionalProfile && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4 px-4 border-primary/30"
              onClick={() => {
                try { sessionStorage.removeItem("signupOrigin"); } catch {}
                // Mantém pendingProfessionalSignup ligado: o seletor e o CTA
                // continuam visíveis até o usuário concluir o cadastro PRO.
                dismissContextSelection();
                navigate("/professional/register");
              }}
            >
              <UserPlus className="h-5 w-5 shrink-0 text-primary" />
              <div className="text-left">
                <p className="font-medium">{labels.proRegister}</p>
                <p className="text-xs text-muted-foreground">{labels.proRegisterDesc}</p>
              </div>
            </Button>
          )}
          {memberships.map((m) => (
            <Button
              key={m.clinic_id}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4 px-4"
              onClick={() => setActiveContext("clinic", m.clinic_id)}
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
