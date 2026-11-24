import { useState, useEffect } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, Pencil, Eye, Lock, Mail, Phone, MapPin, IdCard, Cake, User, Briefcase } from "lucide-react";
import { formatCpf, formatPhone } from "@/utils/masks";
import { updatePatientRegistration } from "@/lib/patientRegistration";
import { useAuth } from "@/contexts/AuthContext";
import { demoPatientScope, saveDemoPatient } from "@/lib/demoPatientRegistration";

export interface PatientToEdit {
  id: string;
  full_name: string;
  email?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  address?: string | null;
  sex?: string | null;
  occupation?: string | null;
  prescribed_weekly_frequency?: number | null;
  referral_source?: string | null;
  assessmentIds?: string[];
}

const REFERRAL_OPTIONS = [
  { value: "patient", pt: "Outro cliente", en: "Another client", es: "Otro cliente" },
  { value: "social", pt: "Redes sociais", en: "Social media", es: "Redes sociales" },
  { value: "doctor", pt: "Médico", en: "Doctor", es: "Médico" },
  { value: "other", pt: "Outra", en: "Other", es: "Otra" },
];

interface AddPatientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionalId: string;
  clinicId?: string | null;
  onAdded: () => void | Promise<void>;
  editPatient?: PatientToEdit | null;
  onCreateManualAssessment?: (patient: { name: string; email?: string }) => void;
  /** When true, modal opens in read-only mode; user can switch to edit only if canEdit is true. */
  readOnly?: boolean;
  /** Controls whether the "Editar" toggle is shown in read-only mode. Default: true (solo) / role-based (clinic). */
  canEdit?: boolean;
  demoMode?: boolean;
}

function calcAge(birth: string | null | undefined): number | null {
  if (!birth) return null;
  const d = new Date(birth);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

const SEX_OPTIONS = [
  { value: "female", pt: "Feminino", en: "Female", es: "Femenino" },
  { value: "male", pt: "Masculino", en: "Male", es: "Masculino" },
  { value: "other", pt: "Outro", en: "Other", es: "Otro" },
  { value: "prefer_not", pt: "Prefiro não informar", en: "Prefer not to say", es: "Prefiero no decir" },
];

const AddPatientModal = ({
  open,
  onOpenChange,
  professionalId,
  clinicId,
  onAdded,
  editPatient,
  onCreateManualAssessment,
  readOnly = false,
  canEdit = true,
  demoMode = false,
}: AddPatientModalProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const isPt = language === "pt";
  const isEs = language === "es";
  const isEdit = !!editPatient;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [sex, setSex] = useState("");
  const [occupation, setOccupation] = useState("");
  const [frequency, setFrequency] = useState("");
  const [referral, setReferral] = useState("");
  const [saving, setSaving] = useState(false);

  // viewMode: "view" => somente leitura, "edit" => formulário editável
  const [viewMode, setViewMode] = useState<"view" | "edit">(readOnly ? "view" : "edit");

  useEffect(() => {
    setViewMode(readOnly ? "view" : "edit");
  }, [readOnly, open]);

  // Pre-fill when editing
  useEffect(() => {
    if (editPatient && open) {
      setName(editPatient.full_name || "");
      setEmail(editPatient.email || "");
      setCpf(editPatient.cpf ? formatCpf(editPatient.cpf) : "");
      setBirthDate(editPatient.birth_date || "");
      setPhone(editPatient.phone ? formatPhone(editPatient.phone) : "");
      setAddress(editPatient.address || "");
      setSex(editPatient.sex || "");
      setOccupation(editPatient.occupation || "");
      setFrequency(editPatient.prescribed_weekly_frequency ? String(editPatient.prescribed_weekly_frequency) : "");
      setReferral(editPatient.referral_source || "");
    }
  }, [editPatient, open]);

  const tr = (pt: string, en: string, es: string) => (isPt ? pt : isEs ? es : en);

  const sexLabel = (val: string | null | undefined) => {
    if (!val) return tr("Não informado", "Not informed", "No informado");
    const opt = SEX_OPTIONS.find((o) => o.value === val);
    return opt ? (isPt ? opt.pt : isEs ? opt.es : opt.en) : val;
  };

  const formatDateDisplay = (val: string | null | undefined) => {
    if (!val) return tr("Não informado", "Not informed", "No informado");
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return val;
    return d.toLocaleDateString(isPt ? "pt-BR" : isEs ? "es-ES" : "en-US");
  };

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const nextName = name.trim();
      const nextEmail = email.trim() || null;
      const patientRow: any = {
        full_name: nextName,
        email: nextEmail,
        cpf: cpf.replace(/\D/g, "") || null,
        birth_date: birthDate || null,
        phone: phone.replace(/\D/g, "") || null,
        address: address.trim() || null,
        sex: sex || null,
        occupation: occupation.trim() || null,
        prescribed_weekly_frequency: frequency ? Number(frequency) : null,
        referral_source: referral || null,
      };

      if (demoMode) {
        saveDemoPatient(demoPatientScope(user?.id, professionalId, clinicId), {
          ...patientRow, assessmentIds: editPatient?.assessmentIds,
        }, editPatient || undefined);
        toast({
          title: tr("Cadastro simulado salvo", "Simulated registration saved", "Registro simulado guardado"),
          description: tr("Somente nesta demonstração; recarregar a página remove as alterações.", "Only in this demo; reloading clears the changes.", "Solo en esta demo; recargar elimina los cambios."),
        });
        // Do not invoke real refresh callbacks, registration events or AI shortcuts.
        handleClose();
        return;
      }

      if (editPatient) {
        const saved = await updatePatientRegistration(editPatient, patientRow, professionalId, clinicId);
        window.dispatchEvent(new CustomEvent("patient-registration-saved", { detail: saved }));
      } else {
        if (clinicId) patientRow.clinic_id = clinicId;
        else patientRow.professional_id = professionalId;
        const { error } = await (supabase.from("patients" as any) as any).insert(patientRow);
        if (error) throw error;
        // NÃO criar avaliação placeholder aqui: o registro em `patients` já é
        // suficiente para o paciente aparecer nas listas. Placeholders geravam
        // "1 avaliação" fantasma logo após o cadastro.

      }

      const savedName = nextName;
      const savedEmail = nextEmail || "";

      if (!isEdit && onCreateManualAssessment) {
        toast({
          title: tr("Paciente adicionado!", "Patient added!", "¡Paciente agregado!"),
          description: tr("Deseja criar uma avaliação manual agora?", "Create a manual assessment now?", "¿Crear una evaluación manual ahora?"),
          action: (
            <button
              onClick={() => onCreateManualAssessment({ name: savedName, email: savedEmail || undefined })}
              className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
            >
              {tr("Criar avaliação", "Create assessment", "Crear evaluación")}
            </button>
          ),
        });
      } else {
        toast({
          title: isEdit
            ? tr("Cadastro atualizado!", "Patient updated!", "¡Registro actualizado!")
            : tr("Paciente adicionado!", "Patient added!", "¡Paciente agregado!"),
        });
      }
      await Promise.resolve(onAdded());
      window.dispatchEvent(new CustomEvent("reload-pro-patients"));
      // Após salvar em modo edição vindo de readOnly, volta para visualização
      // mantendo o modal aberto. Os campos locais já contêm os valores recém-salvos
      // e serão re-sincronizados quando o pai atualizar editPatient.
      if (readOnly) {
        setViewMode("view");
      } else {
        handleClose();
      }
    } catch (err: any) {
      console.error("Save patient error:", err);
      toast({
        title: tr("Erro ao salvar paciente", "Error saving patient", "Error al guardar paciente"),
        description: err.message,
        variant: "destructive",
      });
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
    setSex("");
    setOccupation("");
    setFrequency("");
    setReferral("");
    onOpenChange(false);
  };

  const age = calcAge(birthDate);
  const isViewing = viewMode === "view";

  // ---------- Render: View Mode ----------
  const renderViewMode = () => (
    <div className="space-y-3">
      <ReadRow icon={<User className="h-4 w-4" />} label={tr("Nome completo", "Full name", "Nombre completo")} value={name || tr("Não informado", "Not informed", "No informado")} />
      <div className="grid grid-cols-2 gap-3">
        <ReadRow icon={<Cake className="h-4 w-4" />} label={tr("Idade", "Age", "Edad")} value={age !== null ? `${age} ${tr("anos", "years", "años")}` : tr("Não informada", "Not informed", "No informada")} compact />
        <ReadRow icon={<User className="h-4 w-4" />} label={tr("Sexo", "Sex", "Sexo")} value={sexLabel(sex)} compact />
      </div>
      <ReadRow icon={<Briefcase className="h-4 w-4" />} label={tr("Ocupação", "Occupation", "Ocupación")} value={occupation || tr("Não informada", "Not informed", "No informada")} />
      <div className="grid grid-cols-2 gap-3">
        <ReadRow icon={<User className="h-4 w-4" />} label={tr("Frequência sugerida", "Suggested frequency", "Frecuencia sugerida")} value={frequency ? `${frequency}x ${tr("por semana", "per week", "por semana")}` : tr("Não informada", "Not informed", "No informada")} compact />
        <ReadRow icon={<User className="h-4 w-4" />} label={tr("Origem da indicação", "Referral source", "Origen de recomendación")} value={referral ? (REFERRAL_OPTIONS.find((o) => o.value === referral)?.[isPt ? "pt" : isEs ? "es" : "en"] || referral) : tr("Não informada", "Not informed", "No informada")} compact />
      </div>
      <ReadRow icon={<Cake className="h-4 w-4" />} label={tr("Data de nascimento", "Date of birth", "Fecha de nacimiento")} value={formatDateDisplay(birthDate)} />
      <ReadRow icon={<Mail className="h-4 w-4" />} label="Email" value={email || tr("Não informado", "Not informed", "No informado")} />
      <ReadRow icon={<Phone className="h-4 w-4" />} label={tr("Telefone", "Phone", "Teléfono")} value={phone || tr("Não informado", "Not informed", "No informado")} />
      <ReadRow icon={<IdCard className="h-4 w-4" />} label="CPF" value={cpf || tr("Não informado", "Not informed", "No informado")} />
      <ReadRow icon={<MapPin className="h-4 w-4" />} label={tr("Endereço", "Address", "Dirección")} value={address || tr("Não informado", "Not informed", "No informado")} />
    </div>
  );

  // ---------- Render: Edit Mode ----------
  const renderEditMode = () => (
    <div className="space-y-3 pr-2">
      <div>
        <Label className="text-xs">{tr("Nome completo", "Full name", "Nombre completo")} *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("Nome do paciente", "Patient name", "Nombre del paciente")} className="mt-1 text-sm h-9" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{tr("Data de nascimento", "Date of birth", "Fecha de nacimiento")}</Label>
          <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="mt-1 text-sm h-9" />
          {age !== null && (
            <p className="text-[10px] text-muted-foreground mt-1">{age} {tr("anos", "years", "años")}</p>
          )}
        </div>
        <div>
          <Label className="text-xs">{tr("Sexo", "Sex", "Sexo")}</Label>
          <Select value={sex || undefined} onValueChange={setSex}>
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue placeholder={tr("Selecione", "Select", "Seleccionar")} />
            </SelectTrigger>
            <SelectContent>
              {SEX_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {isPt ? o.pt : isEs ? o.es : o.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">{tr("Ocupação", "Occupation", "Ocupación")}</Label>
        <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder={tr("Ex: Professor, Atleta, Aposentado", "E.g. Teacher, Athlete, Retired", "Ej.: Profesor, Atleta, Jubilado")} className="mt-1 text-sm h-9" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{tr("Frequência sugerida de fisioterapia", "Suggested physio frequency", "Frecuencia sugerida de fisio")}</Label>
          <Select value={frequency || undefined} onValueChange={setFrequency}>
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue placeholder={tr("Selecione", "Select", "Seleccionar")} />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}x {tr("por semana", "per week", "por semana")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">{tr("De onde veio a indicação", "Referral source", "Origen de la recomendación")}</Label>
          <Select value={referral || undefined} onValueChange={setReferral}>
            <SelectTrigger className="mt-1 h-9 text-sm">
              <SelectValue placeholder={tr("Selecione", "Select", "Seleccionar")} />
            </SelectTrigger>
            <SelectContent>
              {REFERRAL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{isPt ? o.pt : isEs ? o.es : o.en}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Email</Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="paciente@email.com" className="mt-1 text-sm h-9" />
      </div>
      <div>
        <Label className="text-xs">{tr("Telefone celular", "Phone", "Teléfono")}</Label>
        <Input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" className="mt-1 text-sm h-9" maxLength={15} />
      </div>
      <div>
        <Label className="text-xs">CPF</Label>
        <Input value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" className="mt-1 text-sm h-9" maxLength={14} />
      </div>
      <div>
        <Label className="text-xs">{tr("Endereço", "Address", "Dirección")}</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={tr("Rua, número, bairro, cidade", "Street, number, city", "Calle, número, ciudad")} className="mt-1 text-sm h-9" />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {isViewing ? (
              <Eye className="h-5 w-5 text-primary" />
            ) : isEdit ? (
              <Pencil className="h-5 w-5 text-primary" />
            ) : (
              <UserPlus className="h-5 w-5 text-primary" />
            )}
            {isViewing
              ? tr("Dados cadastrais", "Patient details", "Datos del paciente")
              : isEdit
                ? tr("Editar cadastro", "Edit registration", "Editar registro")
                : tr("Adicionar paciente", "Add patient", "Agregar paciente")}
            {isViewing && (
              <Badge variant="outline" className="text-[10px] gap-1 ml-1">
                <Lock className="h-3 w-3" />
                {tr("Somente leitura", "Read only", "Solo lectura")}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isViewing
              ? canEdit
                ? tr("Visualize os dados. Clique em Editar para alterar.", "Review the data. Click Edit to change it.", "Visualice los datos. Clic en Editar para cambiarlos.")
                : tr("Você tem permissão apenas para visualizar.", "You only have permission to view.", "Solo tienes permiso para visualizar.")
              : isEdit
                ? tr("Atualize os dados do paciente.", "Update the patient's data.", "Actualice los datos del paciente.")
                : tr("Preencha os dados do paciente. Apenas o nome é obrigatório.", "Fill in the patient's data. Only name is required.", "Complete los datos del paciente. Solo el nombre es obligatorio.")}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isViewing ? renderViewMode() : renderEditMode()}
        </ScrollArea>

        <DialogFooter className="gap-2">
          {isViewing ? (
            <>
              <Button variant="outline" onClick={handleClose}>{tr("Fechar", "Close", "Cerrar")}</Button>
              {canEdit && (
                <Button onClick={() => setViewMode("edit")} className="gap-1.5 rounded-xl">
                  <Pencil className="h-4 w-4" />
                  {tr("Editar", "Edit", "Editar")}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => (readOnly ? setViewMode("view") : handleClose())}
              >
                {tr("Cancelar", "Cancel", "Cancelar")}
              </Button>
              <Button onClick={handleSave} disabled={saving || !name.trim()} className="gap-1.5 rounded-xl">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? <Pencil className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {isEdit ? tr("Salvar", "Save", "Guardar") : tr("Adicionar", "Add", "Agregar")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ReadRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  compact?: boolean;
}
const ReadRow = ({ icon, label, value, compact }: ReadRowProps) => (
  <div className={`flex items-start gap-2 rounded-lg border bg-muted/30 px-3 ${compact ? "py-2" : "py-2.5"}`}>
    <div className="text-muted-foreground mt-0.5">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className="text-sm text-foreground break-words">{value}</p>
    </div>
  </div>
);

export default AddPatientModal;
