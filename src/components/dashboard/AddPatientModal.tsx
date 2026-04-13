import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, UserPlus } from "lucide-react";
import { formatCpf, formatPhone } from "@/utils/masks";

interface AddPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionalId: string;
  clinicId?: string | null;
  onAdded: () => void;
}

const AddPatientModal = ({ open, onOpenChange, professionalId, clinicId, onAdded }: AddPatientModalProps) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isPt = language === "pt";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const patientRow: any = {
        full_name: name.trim(),
        email: email.trim() || null,
        cpf: cpf.replace(/\D/g, "") || null,
        birth_date: birthDate || null,
        phone: phone.replace(/\D/g, "") || null,
        address: address.trim() || null,
      };
      if (clinicId) {
        patientRow.clinic_id = clinicId;
      } else {
        patientRow.professional_id = professionalId;
      }

      const { error } = await (supabase.from("patients" as any) as any).insert(patientRow);
      if (error) throw error;

      // Also create assessment record so patient appears in the patient list
      if (email.trim()) {
        const { data: existing } = await supabase
          .from("assessments")
          .select("id")
          .eq(clinicId ? "clinic_id" : "professional_id", clinicId || professionalId)
          .eq("patient_email", email.trim())
          .limit(1);
        if (!existing || existing.length === 0) {
          const assessmentRow: any = {
            type: "professional",
            status: "completed",
            patient_name: name.trim(),
            patient_email: email.trim(),
            anamnesis_data: { externalPatient: true },
          };
          if (clinicId) {
            assessmentRow.clinic_id = clinicId;
          } else {
            assessmentRow.professional_id = professionalId;
          }
          await supabase.from("assessments").insert(assessmentRow);
        }
      }

      toast({ title: isPt ? "Paciente adicionado!" : "Patient added!" });
      onAdded();
      window.dispatchEvent(new CustomEvent("reload-pro-patients"));
      handleClose();
    } catch (err: any) {
      console.error("Add patient error:", err);
      toast({ title: isPt ? "Erro ao adicionar paciente" : "Error adding patient", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName("");
    setEmail("");
    setCpf("");
    setBirthDate("");
    setPhone("");
    setAddress("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {isPt ? "Adicionar paciente" : "Add patient"}
          </DialogTitle>
          <DialogDescription>
            {isPt ? "Preencha os dados do paciente. Apenas o nome é obrigatório." : "Fill in the patient data. Only the name is required."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3 pr-2">
            <div>
              <Label className="text-xs">{isPt ? "Nome completo" : "Full name"} *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isPt ? "Nome do paciente" : "Patient name"} className="mt-1 text-sm h-9" />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="paciente@email.com" className="mt-1 text-sm h-9" />
            </div>
            <div>
              <Label className="text-xs">CPF</Label>
              <Input value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" className="mt-1 text-sm h-9" maxLength={14} />
            </div>
            <div>
              <Label className="text-xs">{isPt ? "Data de nascimento" : "Date of birth"}</Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="mt-1 text-sm h-9" />
            </div>
            <div>
              <Label className="text-xs">{isPt ? "Telefone celular" : "Phone"}</Label>
              <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" className="mt-1 text-sm h-9" maxLength={15} />
            </div>
            <div>
              <Label className="text-xs">{isPt ? "Endereço" : "Address"}</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={isPt ? "Rua, número, bairro, cidade" : "Street, number, city"} className="mt-1 text-sm h-9" />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{isPt ? "Cancelar" : "Cancel"}</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-1.5 rounded-xl">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {isPt ? "Adicionar" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPatientModal;
