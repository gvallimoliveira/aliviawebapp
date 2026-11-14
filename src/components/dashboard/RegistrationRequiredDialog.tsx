import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, ShieldCheck } from "lucide-react";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; feature?: string }

export const goToRegistration = (navigate: (p: string) => void, student = false) => {
  try {
    if (student) sessionStorage.setItem("forceStudentMode", "1");
    else sessionStorage.removeItem("forceStudentMode");
  } catch { /* noop */ }
  navigate("/professional/register");
};

const RegistrationRequiredDialog = ({ open, onOpenChange, feature }: Props) => {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete seu cadastro para continuar</DialogTitle>
          <DialogDescription>
            {feature ? `${feature} exige` : "Avaliações e prescrição de exercícios exigem"} a identificação do responsável:
            informe seu CREFITO ou ative o modo Acadêmico, se ainda for estudante. Sua assinatura continua ativa.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full gap-2" onClick={() => { onOpenChange(false); goToRegistration(navigate); }}>
            <ShieldCheck className="h-4 w-4" /> Informar CREFITO
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={() => { onOpenChange(false); goToRegistration(navigate, true); }}>
            <GraduationCap className="h-4 w-4" /> Sou estudante (modo Acadêmico)
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>Agora não</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationRequiredDialog;
