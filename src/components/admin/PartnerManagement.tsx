import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Handshake, Plus, Loader2, Stethoscope, Building2, Star, Settings, Phone, MapPin, Clock, CalendarDays, Palette } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PartnerDetail {
  id: string;
  full_name: string;
  email: string | null;
  city: string;
  state: string;
  is_partner: boolean;
  premium_granted: boolean;
  has_clinic: boolean;
  clinic_active: boolean;
  clinic_id: string | null;
  clinic_name: string | null;
}

interface PartnerManagementProps {
  language: string;
}

const DAY_LABELS: Record<string, string[]> = {
  pt: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

const BRAND_COLORS = [
  { value: null, label: "Padrão", hex: "hsl(168 55% 38%)" },
  { value: "#2563eb", label: "Azul", hex: "#2563eb" },
  { value: "#059669", label: "Verde", hex: "#059669" },
  { value: "#7c3aed", label: "Roxo", hex: "#7c3aed" },
  { value: "#dc2626", label: "Vermelho", hex: "#dc2626" },
  { value: "#d97706", label: "Âmbar", hex: "#d97706" },
  { value: "#0891b2", label: "Ciano", hex: "#0891b2" },
  { value: "#be185d", label: "Rosa", hex: "#be185d" },
];

const PartnerManagement = ({ language }: PartnerManagementProps) => {
  const [partners, setPartners] = useState<PartnerDetail[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [togglingMap, setTogglingMap] = useState<Record<string, boolean>>({});

  // Clinic activation dialog state
  const [clinicDialog, setClinicDialog] = useState<{ open: boolean; partnerId: string; partnerName: string }>({ open: false, partnerId: "", partnerName: "" });
  const [clinicName, setClinicName] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [clinicAddress, setClinicAddress] = useState("");
  const [clinicHoursStart, setClinicHoursStart] = useState("08:00");
  const [clinicHoursEnd, setClinicHoursEnd] = useState("18:00");
  const [clinicWorkingDays, setClinicWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [clinicBrandColor, setClinicBrandColor] = useState<string | null>(null);
  const [clinicMaxMembers, setClinicMaxMembers] = useState(3);
  const [activatingClinic, setActivatingClinic] = useState(false);

  // Clinic settings dialog for existing clinics
  const [settingsDialog, setSettingsDialog] = useState<{ open: boolean; partnerId: string; clinicId: string; partnerName: string }>({ open: false, partnerId: "", clinicId: "", partnerName: "" });
  const [editClinicName, setEditClinicName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editHoursStart, setEditHoursStart] = useState("08:00");
  const [editHoursEnd, setEditHoursEnd] = useState("18:00");
  const [editWorkingDays, setEditWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [editBrandColor, setEditBrandColor] = useState<string | null>(null);
  const [editMaxMembers, setEditMaxMembers] = useState(3);
  const [savingSettings, setSavingSettings] = useState(false);

  const isPt = language === "pt";
  const t = isPt ? {
    title: "Parceiros — Gestão de Acesso",
    desc: "Gerencie acessos PRO, Clínica e Premium dos parceiros",
    email_placeholder: "E-mail do profissional",
    add: "Adicionar",
    no_partners: "Nenhum parceiro ativo.",
    granted: "Acesso liberado com sucesso!",
    granted_created: "Conta criada automaticamente com senha padrão: parceiroalivia",
    toggled: "Acesso atualizado!",
    not_found: "Profissional não encontrado com este e-mail.",
    auto_hint: "Se não tiver conta, será criada automaticamente.",
    error: "Erro",
    pro_label: "PRO",
    clinic_label: "Clínica",
    premium_label: "Premium",
  } : {
    title: "Partners — Access Management",
    desc: "Manage PRO, Clinic and Premium access for partners",
    email_placeholder: "Professional email",
    add: "Add",
    no_partners: "No active partners.",
    granted: "Access granted successfully!",
    granted_created: "Account auto-created with default password: parceiroalivia",
    toggled: "Access updated!",
    not_found: "No professional found with this email.",
    auto_hint: "If no account exists, one will be auto-created.",
    error: "Error",
    pro_label: "PRO",
    clinic_label: "Clinic",
    premium_label: "Premium",
  };

  const loadPartners = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "get_partner_details" },
      });
      if (error) throw error;
      setPartners(data?.partners || []);
    } catch {
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPartners(); }, [loadPartners]);

  const handleAdd = async () => {
    if (!email.trim()) return;
    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "set_partner", email: email.trim(), is_partner: true },
      });
      if (error) throw error;
      if (data?.error === "not_found") {
        toast({ title: t.error, description: t.not_found, variant: "destructive" });
        return;
      }
      if (data?.error) throw new Error(data.error);
      toast({ title: "✅", description: data?.created ? t.granted_created : t.granted });
      setEmail("");
      loadPartners();
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const openClinicDialog = (partnerId: string, partnerName: string) => {
    setClinicName(`Clínica de ${partnerName}`);
    setClinicPhone("");
    setClinicAddress("");
    setClinicHoursStart("08:00");
    setClinicHoursEnd("18:00");
    setClinicWorkingDays([1, 2, 3, 4, 5]);
    setClinicBrandColor(null);
    setClinicMaxMembers(3);
    setClinicDialog({ open: true, partnerId, partnerName });
  };

  const handleActivateClinic = async () => {
    if (!clinicName.trim()) return;
    setActivatingClinic(true);
    const key = `${clinicDialog.partnerId}_clinic`;
    setTogglingMap(prev => ({ ...prev, [key]: true }));

    // Optimistic update
    setPartners(prev => prev.map(p =>
      p.id === clinicDialog.partnerId ? { ...p, clinic_active: true, has_clinic: true } : p
    ));

    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: {
          action: "toggle_partner_access",
          professional_id: clinicDialog.partnerId,
          access_type: "clinic",
          enabled: true,
          clinic_config: {
            name: clinicName.trim(),
            phone: clinicPhone.trim() || null,
            address: clinicAddress.trim() || null,
            operating_hours_start: clinicHoursStart,
            operating_hours_end: clinicHoursEnd,
            working_days: clinicWorkingDays,
            brand_color: clinicBrandColor,
            max_members: clinicMaxMembers,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ description: t.toggled });
      setClinicDialog({ open: false, partnerId: "", partnerName: "" });
      loadPartners();
    } catch (err: any) {
      loadPartners();
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setActivatingClinic(false);
      setTogglingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  const openSettingsDialog = async (partnerId: string, clinicId: string, partnerName: string) => {
    setSettingsDialog({ open: true, partnerId, clinicId, partnerName });
    setSavingSettings(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "get_clinic_config", clinic_id: clinicId },
      });
      if (error) throw error;
      const c = data?.clinic;
      if (c) {
        setEditClinicName(c.name || "");
        setEditPhone(c.phone || "");
        setEditAddress(c.address || "");
        setEditHoursStart(c.operating_hours_start || "08:00");
        setEditHoursEnd(c.operating_hours_end || "18:00");
        setEditWorkingDays(c.working_days || [1, 2, 3, 4, 5]);
        setEditBrandColor(c.brand_color || null);
        setEditMaxMembers(c.max_members || 3);
      }
    } catch {
      toast({ title: t.error, description: isPt ? "Erro ao carregar configurações" : "Failed to load settings", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!editClinicName.trim()) return;
    setSavingSettings(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: {
          action: "update_clinic_config",
          clinic_id: settingsDialog.clinicId,
          clinic_config: {
            name: editClinicName.trim(),
            phone: editPhone.trim() || null,
            address: editAddress.trim() || null,
            operating_hours_start: editHoursStart,
            operating_hours_end: editHoursEnd,
            working_days: editWorkingDays,
            brand_color: editBrandColor,
            max_members: editMaxMembers,
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ description: isPt ? "Configurações salvas!" : "Settings saved!" });
      setSettingsDialog({ open: false, partnerId: "", clinicId: "", partnerName: "" });
      loadPartners();
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggle = async (partnerId: string, accessType: "pro" | "clinic" | "premium", enabled: boolean) => {
    // If enabling clinic, open the config dialog instead
    if (accessType === "clinic" && enabled) {
      const partner = partners.find(p => p.id === partnerId);
      if (partner && !partner.has_clinic) {
        openClinicDialog(partnerId, partner.full_name);
        return;
      }
    }

    const key = `${partnerId}_${accessType}`;
    setTogglingMap(prev => ({ ...prev, [key]: true }));

    // Optimistic update
    setPartners(prev => prev.map(p => {
      if (p.id !== partnerId) return p;
      if (accessType === "pro") return { ...p, is_partner: enabled };
      if (accessType === "clinic") return { ...p, clinic_active: enabled, has_clinic: enabled ? true : p.has_clinic };
      if (accessType === "premium") return { ...p, premium_granted: enabled };
      return p;
    }));

    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "toggle_partner_access", professional_id: partnerId, access_type: accessType, enabled },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ description: t.toggled });
      if (accessType === "pro" && !enabled) {
        loadPartners();
      }
    } catch (err: any) {
      loadPartners();
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setTogglingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  const dayLabels = DAY_LABELS[language] || DAY_LABELS.pt;

  const ClinicConfigForm = ({
    name, setName, phone, setPhone, address, setAddress,
    hoursStart, setHoursStart, hoursEnd, setHoursEnd,
    workingDays, setWorkingDays, brandColor, setBrandColor,
    maxMembers, setMaxMembers,
  }: {
    name: string; setName: (v: string) => void;
    phone: string; setPhone: (v: string) => void;
    address: string; setAddress: (v: string) => void;
    hoursStart: string; setHoursStart: (v: string) => void;
    hoursEnd: string; setHoursEnd: (v: string) => void;
    workingDays: number[]; setWorkingDays: (v: number[]) => void;
    brandColor: string | null; setBrandColor: (v: string | null) => void;
    maxMembers: number; setMaxMembers: (v: number) => void;
  }) => (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><Building2 className="h-4 w-4" />{isPt ? "Nome da Clínica" : "Clinic Name"}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isPt ? "Ex: Clínica FisioVida" : "e.g. PhysioLife Clinic"} maxLength={100} />
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><Phone className="h-4 w-4" />{isPt ? "Telefone / WhatsApp" : "Phone"}</Label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" maxLength={20} />
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{isPt ? "Endereço" : "Address"}</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={isPt ? "Rua, número, bairro, cidade" : "Full address"} maxLength={200} />
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{isPt ? "Horário de Funcionamento" : "Operating Hours"}</Label>
        <div className="flex items-center gap-2">
          <Input type="time" value={hoursStart} onChange={(e) => setHoursStart(e.target.value)} className="w-28" />
          <span className="text-muted-foreground text-sm">{isPt ? "às" : "to"}</span>
          <Input type="time" value={hoursEnd} onChange={(e) => setHoursEnd(e.target.value)} className="w-28" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{isPt ? "Dias de Atendimento" : "Working Days"}</Label>
        <div className="flex flex-wrap gap-1.5">
          {dayLabels.map((label, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setWorkingDays(workingDays.includes(idx) ? workingDays.filter(d => d !== idx) : [...workingDays, idx].sort())}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                workingDays.includes(idx)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><Palette className="h-4 w-4" />{isPt ? "Cor da Marca" : "Brand Color"}</Label>
        <div className="flex flex-wrap gap-2">
          {BRAND_COLORS.map((c) => (
            <button
              key={c.value ?? "default"}
              type="button"
              onClick={() => setBrandColor(c.value)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                brandColor === c.value
                  ? "border-foreground scale-110 ring-2 ring-ring ring-offset-2 ring-offset-background"
                  : "border-border hover:scale-105"
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.label}
            />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label>{isPt ? "Máximo de Membros" : "Max Members"}</Label>
        <Input type="number" min={1} max={50} value={maxMembers} onChange={(e) => setMaxMembers(Number(e.target.value) || 3)} className="w-24" />
      </div>
    </div>
  );

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Handshake className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{t.title}</h2>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t.add} {isPt ? "parceiro" : "partner"}</CardTitle>
          <CardDescription>{t.desc}<br /><span className="text-xs text-muted-foreground/70">{t.auto_hint}</span></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder={t.email_placeholder}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} disabled={adding || !email.trim()} className="gap-2">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t.add}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t.title}</CardTitle>
          <CardDescription>{partners.length} {isPt ? "parceiro(s)" : "partner(s)"}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : partners.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">{t.no_partners}</p>
          ) : (
            <div className="space-y-3">
              {partners.map((p) => (
                <PartnerCard
                  key={p.id}
                  partner={p}
                  t={t}
                  isPt={isPt}
                  togglingMap={togglingMap}
                  onToggle={handleToggle}
                  onOpenSettings={(clinicId) => openSettingsDialog(p.id, clinicId, p.full_name)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clinic Activation Dialog */}
      <Dialog open={clinicDialog.open} onOpenChange={(open) => !open && setClinicDialog({ open: false, partnerId: "", partnerName: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />{isPt ? "Ativar Modo Clínica" : "Activate Clinic Mode"}</DialogTitle>
            <DialogDescription>{isPt ? `Configurar clínica para ${clinicDialog.partnerName}` : `Configure clinic for ${clinicDialog.partnerName}`}</DialogDescription>
          </DialogHeader>
          <ClinicConfigForm
            name={clinicName} setName={setClinicName}
            phone={clinicPhone} setPhone={setClinicPhone}
            address={clinicAddress} setAddress={setClinicAddress}
            hoursStart={clinicHoursStart} setHoursStart={setClinicHoursStart}
            hoursEnd={clinicHoursEnd} setHoursEnd={setClinicHoursEnd}
            workingDays={clinicWorkingDays} setWorkingDays={setClinicWorkingDays}
            brandColor={clinicBrandColor} setBrandColor={setClinicBrandColor}
            maxMembers={clinicMaxMembers} setMaxMembers={setClinicMaxMembers}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setClinicDialog({ open: false, partnerId: "", partnerName: "" })}>{isPt ? "Cancelar" : "Cancel"}</Button>
            <Button onClick={handleActivateClinic} disabled={activatingClinic || !clinicName.trim()} className="gap-2">
              {activatingClinic && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPt ? "Ativar Clínica" : "Activate Clinic"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clinic Settings Edit Dialog */}
      <Dialog open={settingsDialog.open} onOpenChange={(open) => !open && setSettingsDialog({ open: false, partnerId: "", clinicId: "", partnerName: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />{isPt ? "Configurações da Clínica" : "Clinic Settings"}</DialogTitle>
            <DialogDescription>{settingsDialog.partnerName}</DialogDescription>
          </DialogHeader>
          {savingSettings && !editClinicName ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <ClinicConfigForm
              name={editClinicName} setName={setEditClinicName}
              phone={editPhone} setPhone={setEditPhone}
              address={editAddress} setAddress={setEditAddress}
              hoursStart={editHoursStart} setHoursStart={setEditHoursStart}
              hoursEnd={editHoursEnd} setHoursEnd={setEditHoursEnd}
              workingDays={editWorkingDays} setWorkingDays={setEditWorkingDays}
              brandColor={editBrandColor} setBrandColor={setEditBrandColor}
              maxMembers={editMaxMembers} setMaxMembers={setEditMaxMembers}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialog({ open: false, partnerId: "", clinicId: "", partnerName: "" })}>{isPt ? "Cancelar" : "Cancel"}</Button>
            <Button onClick={handleSaveSettings} disabled={savingSettings || !editClinicName.trim()} className="gap-2">
              {savingSettings && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPt ? "Salvar" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface PartnerCardProps {
  partner: PartnerDetail;
  t: Record<string, string>;
  isPt: boolean;
  togglingMap: Record<string, boolean>;
  onToggle: (id: string, type: "pro" | "clinic" | "premium", enabled: boolean) => void;
  onOpenSettings: (clinicId: string) => void;
}

const PartnerCard = ({ partner, t, isPt, togglingMap, onToggle, onOpenSettings }: PartnerCardProps) => {
  const toggles: { type: "pro" | "clinic" | "premium"; label: string; icon: React.ReactNode; checked: boolean }[] = [
    { type: "pro", label: t.pro_label, icon: <Stethoscope className="h-3.5 w-3.5" />, checked: partner.is_partner },
    { type: "clinic", label: t.clinic_label, icon: <Building2 className="h-3.5 w-3.5" />, checked: partner.clinic_active },
    { type: "premium", label: t.premium_label, icon: <Star className="h-3.5 w-3.5" />, checked: partner.premium_granted },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{partner.full_name}</p>
          <p className="text-sm text-muted-foreground">{partner.email || "—"} · {partner.city}, {partner.state}</p>
          {partner.clinic_active && partner.clinic_name && (
            <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {partner.clinic_name}
            </p>
          )}
        </div>
        {partner.clinic_active && partner.clinic_id && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs shrink-0"
            onClick={() => onOpenSettings(partner.clinic_id!)}
          >
            <Settings className="h-3.5 w-3.5" />
            {isPt ? "Config" : "Settings"}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-4">
        {toggles.map(({ type, label, icon, checked }) => {
          const key = `${partner.id}_${type}`;
          const isToggling = togglingMap[key];
          return (
            <label key={type} className="flex items-center gap-2 cursor-pointer select-none">
              {isToggling ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : icon}
              <span className="text-sm font-medium text-foreground">{label}</span>
              <Switch
                checked={checked}
                disabled={isToggling}
                onCheckedChange={(val) => onToggle(partner.id, type, val)}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default PartnerManagement;
