import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Handshake, Plus, Loader2, Stethoscope, Building2, Star } from "lucide-react";
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

const PartnerManagement = ({ language }: PartnerManagementProps) => {
  const [partners, setPartners] = useState<PartnerDetail[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [togglingMap, setTogglingMap] = useState<Record<string, boolean>>({});

  // Clinic activation dialog
  const [clinicDialog, setClinicDialog] = useState<{ open: boolean; partnerId: string; partnerName: string }>({ open: false, partnerId: "", partnerName: "" });
  const [clinicName, setClinicName] = useState("");
  const [activatingClinic, setActivatingClinic] = useState(false);

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
    setClinicDialog({ open: true, partnerId, partnerName });
  };

  const handleActivateClinic = async () => {
    if (!clinicName.trim()) return;
    setActivatingClinic(true);
    const key = `${clinicDialog.partnerId}_clinic`;
    setTogglingMap(prev => ({ ...prev, [key]: true }));

    setPartners(prev => prev.map(p =>
      p.id === clinicDialog.partnerId ? { ...p, clinic_active: true, has_clinic: true, clinic_name: clinicName.trim() } : p
    ));

    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: {
          action: "toggle_partner_access",
          professional_id: clinicDialog.partnerId,
          access_type: "clinic",
          enabled: true,
          clinic_config: { name: clinicName.trim() },
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

  const handleToggle = async (partnerId: string, accessType: "pro" | "clinic" | "premium", enabled: boolean) => {
    // If enabling clinic for the first time, open dialog for name
    if (accessType === "clinic" && enabled) {
      const partner = partners.find(p => p.id === partnerId);
      if (partner && !partner.has_clinic) {
        openClinicDialog(partnerId, partner.full_name);
        return;
      }
    }

    const key = `${partnerId}_${accessType}`;
    setTogglingMap(prev => ({ ...prev, [key]: true }));

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
      if (accessType === "pro" && !enabled) loadPartners();
    } catch (err: any) {
      loadPartners();
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setTogglingMap(prev => ({ ...prev, [key]: false }));
    }
  };

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
                <PartnerCard key={p.id} partner={p} t={t} togglingMap={togglingMap} onToggle={handleToggle} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clinic Name Dialog */}
      <Dialog open={clinicDialog.open} onOpenChange={(open) => !open && setClinicDialog({ open: false, partnerId: "", partnerName: "" })}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />{isPt ? "Ativar Modo Clínica" : "Activate Clinic Mode"}</DialogTitle>
            <DialogDescription>
              {isPt
                ? `Defina o nome da clínica de ${clinicDialog.partnerName}. As demais configurações ficam no painel do parceiro.`
                : `Set the clinic name for ${clinicDialog.partnerName}. Other settings are managed in the partner's dashboard.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{isPt ? "Nome da Clínica" : "Clinic Name"}</Label>
            <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder={isPt ? "Ex: Clínica FisioVida" : "e.g. PhysioLife Clinic"} maxLength={100} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClinicDialog({ open: false, partnerId: "", partnerName: "" })}>{isPt ? "Cancelar" : "Cancel"}</Button>
            <Button onClick={handleActivateClinic} disabled={activatingClinic || !clinicName.trim()} className="gap-2">
              {activatingClinic && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPt ? "Ativar" : "Activate"}
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
  togglingMap: Record<string, boolean>;
  onToggle: (id: string, type: "pro" | "clinic" | "premium", enabled: boolean) => void;
}

const PartnerCard = ({ partner, t, togglingMap, onToggle }: PartnerCardProps) => {
  const toggles: { type: "pro" | "clinic" | "premium"; label: string; icon: React.ReactNode; checked: boolean }[] = [
    { type: "pro", label: t.pro_label, icon: <Stethoscope className="h-3.5 w-3.5" />, checked: partner.is_partner },
    { type: "clinic", label: t.clinic_label, icon: <Building2 className="h-3.5 w-3.5" />, checked: partner.clinic_active },
    { type: "premium", label: t.premium_label, icon: <Star className="h-3.5 w-3.5" />, checked: partner.premium_granted },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
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
