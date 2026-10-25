import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Handshake, Plus, Loader2, Stethoscope, Building2, Star, KeyRound, Trash2, Crown, X, GraduationCap } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PartnerDetail {
  id: string;
  full_name: string;
  email: string | null;
  city: string;
  state: string;
  is_partner: boolean;
  is_partner_account: boolean;
  premium_granted: boolean;
  is_student: boolean;
  active_profile_mode?: string | null;
  has_clinic: boolean;
  clinic_active: boolean;
  clinic_id: string | null;
  clinic_name: string | null;
}

interface GrantedPremiumEntry {
  id: string;
  email: string;
  granted_at: string;
  notes: string | null;
}

interface PartnerManagementProps {
  language: string;
}

const PartnerManagement = ({ language }: PartnerManagementProps) => {
  const [partners, setPartners] = useState<PartnerDetail[]>([]);
  const [granted, setGranted] = useState<GrantedPremiumEntry[]>([]);
  const [email, setEmail] = useState("");
  const [grantedEmail, setGrantedEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [grantedLoading, setGrantedLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addingGranted, setAddingGranted] = useState(false);
  const [togglingMap, setTogglingMap] = useState<Record<string, boolean>>({});
  const [removeConfirm, setRemoveConfirm] = useState<{ open: boolean; partnerId: string; partnerName: string }>({ open: false, partnerId: "", partnerName: "" });

  // Clinic activation dialog
  const [clinicDialog, setClinicDialog] = useState<{ open: boolean; partnerId: string; partnerName: string }>({ open: false, partnerId: "", partnerName: "" });
  const [clinicName, setClinicName] = useState("");
  const [activatingClinic, setActivatingClinic] = useState(false);

  const isPt = language === "pt";
  const t = isPt ? {
    title: "Parceiros — Gestão de Acesso",
    desc: "Gerencie acessos PRO, Clínica e Premium dos parceiros profissionais",
    email_placeholder: "E-mail do profissional",
    add: "Adicionar",
    no_partners: "Nenhum parceiro ativo.",
    granted: "Acesso liberado com sucesso!",
    granted_created: "Conta criada. Um e-mail de redefinição de senha foi enviado ao parceiro.",
    toggled: "Acesso atualizado!",
    not_found: "Profissional não encontrado com este e-mail.",
    auto_hint: "Se não tiver conta, será criada automaticamente e o parceiro receberá um e-mail.",
    error: "Erro",
    pro_label: "PRO",
    clinic_label: "Clínica",
    premium_label: "Premium",
    academic_label: "Acadêmico",
    operating_as: "operando como",
    mode_professional: "Profissional",
    mode_student: "Acadêmico",
    resend_pwd: "Reenviar senha",
    resend_sent: "E-mail de redefinição reenviado!",
    resend_no_user: "Esse parceiro ainda não tem conta no Auth.",
    resend_no_email: "Parceiro sem e-mail cadastrado.",
    remove_partner: "Remover da lista",
    remove_confirm_title: "Remover parceiro?",
    remove_confirm_desc: "Isso desliga PRO, Acadêmico e Premium e remove a pessoa da lista de parceiros. A conta do usuário e o histórico permanecem.",
    remove_confirm_action: "Sim, remover",
    cancel: "Cancelar",
    granted_title: "Premium liberado por e-mail",
    granted_desc: "Conceda acesso Premium a familiares ou amigos que NÃO são profissionais (sem precisar de CREFITO).",
    granted_placeholder: "E-mail de quem receberá Premium",
    granted_added: "Premium liberado!",
    granted_already: "Esse e-mail já tem Premium liberado.",
    granted_removed: "Acesso revogado.",
    no_granted: "Nenhum e-mail com Premium liberado.",
    granted_remove: "Revogar",
  } : {
    title: "Partners — Access Management",
    desc: "Manage PRO, Clinic and Premium access for professional partners",
    email_placeholder: "Professional email",
    add: "Add",
    no_partners: "No active partners.",
    granted: "Access granted successfully!",
    granted_created: "Account created. A password reset email was sent.",
    toggled: "Access updated!",
    not_found: "No professional found with this email.",
    auto_hint: "If no account exists, one will be auto-created.",
    error: "Error",
    pro_label: "PRO",
    clinic_label: "Clinic",
    premium_label: "Premium",
    academic_label: "Academic",
    operating_as: "operating as",
    mode_professional: "Professional",
    mode_student: "Academic",
    resend_pwd: "Resend password",
    resend_sent: "Password reset email re-sent!",
    resend_no_user: "This partner has no Auth account yet.",
    resend_no_email: "Partner has no email on file.",
    remove_partner: "Remove from list",
    remove_confirm_title: "Remove partner?",
    remove_confirm_desc: "This disables PRO, Academic and Premium and removes the person from the partner list. The user account and history remain.",
    remove_confirm_action: "Yes, remove",
    cancel: "Cancel",
    granted_title: "Premium granted by email",
    granted_desc: "Grant Premium access to family or friends who are NOT professionals (no CREFITO required).",
    granted_placeholder: "Email to receive Premium",
    granted_added: "Premium granted!",
    granted_already: "This email already has Premium granted.",
    granted_removed: "Access revoked.",
    no_granted: "No email with granted Premium.",
    granted_remove: "Revoke",
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

  const loadGranted = useCallback(async () => {
    setGrantedLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "list_granted_premium" },
      });
      if (error) throw error;
      setGranted(data?.granted || []);
    } catch {
      setGranted([]);
    } finally {
      setGrantedLoading(false);
    }
  }, []);

  useEffect(() => { loadPartners(); loadGranted(); }, [loadPartners, loadGranted]);

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

  const handleAddGranted = async () => {
    if (!grantedEmail.trim()) return;
    setAddingGranted(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "add_granted_premium", email: grantedEmail.trim() },
      });
      if (error) throw error;
      if (data?.error === "already_granted") {
        toast({ title: t.error, description: t.granted_already, variant: "destructive" });
        return;
      }
      if (data?.error) throw new Error(data.error);
      toast({ title: "✅", description: t.granted_added });
      setGrantedEmail("");
      loadGranted();
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setAddingGranted(false);
    }
  };

  const handleRemoveGranted = async (id: string) => {
    setTogglingMap(p => ({ ...p, [`g_${id}`]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "remove_granted_premium", id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ description: t.granted_removed });
      loadGranted();
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setTogglingMap(p => ({ ...p, [`g_${id}`]: false }));
    }
  };

  const handleConfirmRemovePartner = async () => {
    const id = removeConfirm.partnerId;
    setTogglingMap(p => ({ ...p, [`${id}_remove`]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "remove_partner_account", professional_id: id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ description: t.toggled });
      setRemoveConfirm({ open: false, partnerId: "", partnerName: "" });
      loadPartners();
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setTogglingMap(p => ({ ...p, [`${id}_remove`]: false }));
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

  const handleToggle = async (partnerId: string, accessType: "pro" | "clinic" | "premium" | "academic", enabled: boolean) => {
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
      if (accessType === "pro") {
        // EXCLUSIVIDADE: ligar PRO desliga Acadêmico e vice-versa.
        return {
          ...p,
          is_partner: enabled,
          is_student: enabled ? false : p.is_student,
          active_profile_mode: enabled
            ? "professional"
            : (p.is_student ? "student" : p.active_profile_mode),
        };
      }

      if (accessType === "clinic") return { ...p, clinic_active: enabled, has_clinic: enabled ? true : p.has_clinic };
      if (accessType === "premium") return { ...p, premium_granted: enabled };
      if (accessType === "academic") return { ...p, is_student: enabled, is_partner: enabled ? false : p.is_partner, active_profile_mode: enabled ? "student" : "professional" };
      return p;
    }));

    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "toggle_partner_access", professional_id: partnerId, access_type: accessType, enabled },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ description: t.toggled });
      await loadPartners();
    } catch (err: any) {
      loadPartners();
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setTogglingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleResendPassword = async (partner: PartnerDetail) => {
    if (!partner.email) {
      toast({ title: t.error, description: t.resend_no_email, variant: "destructive" });
      return;
    }
    const key = `${partner.id}_resend`;
    setTogglingMap(prev => ({ ...prev, [key]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "send_password_reset", email: partner.email },
      });
      if (error) throw error;
      if (data?.error === "user_not_found") {
        toast({ title: t.error, description: t.resend_no_user, variant: "destructive" });
        return;
      }
      if (data?.error) throw new Error(data.error);
      toast({ title: "✅", description: t.resend_sent });
    } catch (err: any) {
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
                <PartnerCard
                  key={p.id}
                  partner={p}
                  t={t}
                  togglingMap={togglingMap}
                  onToggle={handleToggle}
                  onResendPassword={handleResendPassword}
                  onRequestRemove={() => setRemoveConfirm({ open: true, partnerId: p.id, partnerName: p.full_name })}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Premium granted by email — for non-professionals */}
      <div className="flex items-center gap-2 mt-8 mb-2">
        <Crown className="h-5 w-5 text-amber-500" />
        <h2 className="text-lg font-semibold text-foreground">{t.granted_title}</h2>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardDescription>{t.granted_desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder={t.granted_placeholder}
              type="email"
              value={grantedEmail}
              onChange={(e) => setGrantedEmail(e.target.value)}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAddGranted()}
            />
            <Button onClick={handleAddGranted} disabled={addingGranted || !grantedEmail.trim()} className="gap-2">
              {addingGranted ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t.add}
            </Button>
          </div>

          {grantedLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : granted.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 text-sm">{t.no_granted}</p>
          ) : (
            <div className="space-y-2">
              {granted.map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded-md border border-border bg-card p-3">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-foreground">{g.email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 h-8 text-destructive hover:text-destructive"
                    disabled={togglingMap[`g_${g.id}`]}
                    onClick={() => handleRemoveGranted(g.id)}
                  >
                    {togglingMap[`g_${g.id}`] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    <span className="text-xs">{t.granted_remove}</span>
                  </Button>
                </div>
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

      {/* Remove partner confirmation */}
      <AlertDialog open={removeConfirm.open} onOpenChange={(open) => !open && setRemoveConfirm({ open: false, partnerId: "", partnerName: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.remove_confirm_title}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{removeConfirm.partnerName}</strong> — {t.remove_confirm_desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemovePartner} className="bg-destructive hover:bg-destructive/90">
              {t.remove_confirm_action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface PartnerCardProps {
  partner: PartnerDetail;
  t: Record<string, string>;
  togglingMap: Record<string, boolean>;
  onToggle: (id: string, type: "pro" | "clinic" | "premium" | "academic", enabled: boolean) => void;
  onResendPassword: (partner: PartnerDetail) => void;
  onRequestRemove: () => void;
}

const PartnerCard = ({ partner, t, togglingMap, onToggle, onResendPassword, onRequestRemove }: PartnerCardProps) => {
  const effectiveActiveMode = partner.is_student && !partner.is_partner
    ? "student"
    : (partner.active_profile_mode || (partner.is_student ? "student" : "professional"));
  const toggles: { type: "pro" | "clinic" | "premium" | "academic"; label: string; icon: React.ReactNode; checked: boolean }[] = [
    { type: "pro", label: t.pro_label, icon: <Stethoscope className="h-3.5 w-3.5" />, checked: partner.is_partner },
    { type: "clinic", label: t.clinic_label, icon: <Building2 className="h-3.5 w-3.5" />, checked: partner.clinic_active },
    { type: "premium", label: t.premium_label, icon: <Star className="h-3.5 w-3.5" />, checked: partner.premium_granted },
    { type: "academic", label: t.academic_label, icon: <GraduationCap className="h-3.5 w-3.5" />, checked: partner.is_student },
  ];
  const removeKey = `${partner.id}_remove`;
  const busy = Object.entries(togglingMap).some(([key, value]) => key.startsWith(`${partner.id}_`) && value);

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
        {partner.is_student && (
          <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
            <GraduationCap className="h-3 w-3" />
            🎓 Alivia Acadêmico
            {effectiveActiveMode && (
              <span className="text-[10px] text-muted-foreground ml-1">
                · {t.operating_as} <strong>{effectiveActiveMode === "student" ? t.mode_student : t.mode_professional}</strong>
              </span>
            )}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {toggles.map(({ type, label, icon, checked }) => {
          const key = `${partner.id}_${type}`;
          const isToggling = togglingMap[key];
          return (
            <label key={type} className="flex items-center gap-2 cursor-pointer select-none">
              {isToggling ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : icon}
              <span className="text-sm font-medium text-foreground">{label}</span>
              <Switch
                checked={checked}
                disabled={busy}
                onCheckedChange={(val) => onToggle(partner.id, type, val)}
              />
            </label>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8"
            disabled={!partner.email || togglingMap[`${partner.id}_resend`]}
            onClick={() => onResendPassword(partner)}
          >
            {togglingMap[`${partner.id}_resend`]
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <KeyRound className="h-3.5 w-3.5" />}
            <span className="text-xs">{t.resend_pwd}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-destructive hover:text-destructive"
            disabled={busy}
            onClick={onRequestRemove}
          >
            {togglingMap[removeKey]
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Trash2 className="h-3.5 w-3.5" />}
            <span className="text-xs">{t.remove_partner}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PartnerManagement;
