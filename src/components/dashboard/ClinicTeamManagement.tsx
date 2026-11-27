import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Users, UserPlus, Mail, Trash2, Crown, Shield, Stethoscope as StethIcon, ClipboardList, GraduationCap, Copy, MessageCircle, Pencil, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClinicReportIdentityForm, type ClinicReportMember } from "@/components/account/ClinicReportIdentity";
import ClinicSettingsCard from "./ClinicSettingsCard";
import { buildInviteLink, inviteMessage } from "@/lib/clinicInvite";
import type { Database } from "@/integrations/supabase/types";
import AgendaAccessDialog from "./AgendaAccessDialog";
import { agendaScopeSummary, isAgendaManagerRole, normalizeAgendaScope, type AgendaScope } from "@/lib/agendaVisibility";
import { CUSTOM_SERVICE_TYPE } from "@/lib/appointmentTime";

type ClinicRole = Database["public"]["Enums"]["clinic_role"];

interface Member {
  id: string;
  user_id: string;
  role: ClinicRole;
  status: string;
  accepted_at: string | null;
  full_name: string | null;
  email: string | null;
  is_student?: boolean | null;
  student_institution?: string | null;
  student_period?: string | null;
  has_signature?: boolean | null;
}

interface Invitation {
  id: string;
  email: string;
  role: ClinicRole;
  expires_at: string;
}

const roleLabels: Record<ClinicRole, Record<string, string>> = {
  owner: { pt: "Proprietário", en: "Owner", es: "Propietario" },
  admin: { pt: "Administrador", en: "Administrator", es: "Administrador" },
  therapist: { pt: "Fisioterapeuta", en: "Therapist", es: "Fisioterapeuta" },
  intern: { pt: "Estagiário (Acadêmico)", en: "Intern (Academic)", es: "Practicante (Académico)" },
  secretary: { pt: "Secretária", en: "Secretary", es: "Secretaria" },
  osteopath: { pt: "Osteopata", en: "Osteopath", es: "Osteópata" },
  pilates_instructor: { pt: "Prof. Pilates", en: "Pilates Instructor", es: "Prof. Pilates" },
  doctor: { pt: "Médico", en: "Doctor", es: "Médico" },
  rpg_specialist: { pt: "RPG", en: "RPG Specialist", es: "RPG" },
  massage_therapist: { pt: "Massoterapeuta", en: "Massage Therapist", es: "Masajista" },
};

const roleIcon = (role: ClinicRole) => {
  if (role === "owner") return <Crown className="h-3.5 w-3.5" />;
  if (role === "admin") return <Shield className="h-3.5 w-3.5" />;
  if (role === "intern") return <GraduationCap className="h-3.5 w-3.5 text-primary" />;
  if (role === "therapist" || role === "osteopath" || role === "doctor" || role === "rpg_specialist" || role === "massage_therapist" || role === "pilates_instructor") return <StethIcon className="h-3.5 w-3.5" />;
  return <ClipboardList className="h-3.5 w-3.5" />;
};

const ClinicTeamManagement = ({ focusTarget }: { focusTarget?: "identity" | "team" }) => {
  const { activeClinic, refetch, canManageClinic } = useClinic();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ClinicRole>("therapist");
  const [sending, setSending] = useState(false);
  const [identities, setIdentities] = useState<ClinicReportMember[]>([]);
  const [editing, setEditing] = useState<ClinicReportMember | null>(null);
  const [agendaAccess, setAgendaAccess] = useState<Record<string, { scope: AgendaScope; services: string[] }>>({});
  const [customServices, setCustomServices] = useState<{ id: string; name: string }[]>([]);
  const [agendaMember, setAgendaMember] = useState<Member | null>(null);

  const canManage = canManageClinic;
  const lang = language as "pt" | "en" | "es";
  const [searchParams] = useSearchParams();
  const firstStepsTarget = focusTarget ?? searchParams.get("gettingStarted");
  useEffect(() => {
    if (!canManage || !activeClinic || !["identity", "team"].includes(firstStepsTarget ?? "")) return;
    const frame = requestAnimationFrame(() => document.getElementById(`clinic-start-${firstStepsTarget}`)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, [firstStepsTarget, activeClinic?.clinic_id, canManage]);

  const fetchTeam = async () => {
    if (!activeClinic) return;
    const { data: mems, error: memErr } = await supabase.rpc("get_clinic_members_with_details", {
      _clinic_id: activeClinic.clinic_id,
    });
    if (memErr) {
      console.error("[ClinicTeamManagement] members error", memErr);
    }
    setMembers((mems as Member[]) || []);
    const { data: reportMembers } = await supabase.rpc("get_clinic_report_members", { _clinic_id: activeClinic.clinic_id });
    setIdentities(Array.isArray(reportMembers) ? reportMembers as unknown as ClinicReportMember[] : []);

    const { data: invs } = await supabase
      .from("clinic_invitations")
      .select("id, email, role, expires_at")
      .eq("clinic_id", activeClinic.clinic_id);
    setInvitations(invs || []);

    const { data: access } = await (supabase.from("clinic_members") as any)
      .select("id, agenda_scope, agenda_services")
      .eq("clinic_id", activeClinic.clinic_id);
    const map: Record<string, { scope: AgendaScope; services: string[] }> = {};
    for (const row of (access as any[]) || []) {
      map[row.id] = { scope: normalizeAgendaScope(row.agenda_scope), services: Array.isArray(row.agenda_services) ? row.agenda_services : [] };
    }
    setAgendaAccess(map);
    const { data: svcs } = await (supabase.from("care_services" as any) as any)
      .select("id, name").eq("clinic_id", activeClinic.clinic_id).eq("active", true).eq("service_type", CUSTOM_SERVICE_TYPE).order("name");
    setCustomServices(Array.isArray(svcs) ? svcs : []);
  };

  useEffect(() => { fetchTeam(); }, [activeClinic?.clinic_id]);

  const handleInvite = async () => {
    if (!activeClinic || !user || !inviteEmail.trim()) return;
    setSending(true);
    try {
      const { data, error } = await supabase.rpc("try_direct_clinic_add", {
        _clinic_id: activeClinic.clinic_id,
        _email: inviteEmail.trim().toLowerCase(),
        _role: inviteRole,
        _invited_by: user.id,
      });
      if (error) throw error;

      const wasAdded = data === "added";
      toast({
        title: wasAdded
          ? (lang === "pt" ? "Membro adicionado!" : lang === "es" ? "Miembro añadido!" : "Member added!")
          : (lang === "pt" ? "Convite criado!" : lang === "es" ? "Invitación creada!" : "Invite created!"),
        description: wasAdded
          ? (lang === "pt" ? "O usuário já tinha cadastro e foi adicionado diretamente." : "User already had an account and was added directly.")
          : (lang === "pt" ? "Envie o link pelo botão WhatsApp ou Copiar link em Convites pendentes: o integrante cria o acesso direto na clínica." : lang === "es" ? "Envía el enlace por WhatsApp o Copiar enlace en Invitaciones pendientes." : "Send the link via WhatsApp or Copy link under Pending invites."),
      });
      setInviteEmail("");
      fetchTeam();
      refetch();
    } catch (err: any) {
      toast({ title: lang === "pt" ? "Erro ao adicionar" : "Error", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm(lang === "pt" ? "Remover este membro?" : "Remove this member?")) return;
    await supabase.from("clinic_members").delete().eq("id", memberId);
    fetchTeam();
    refetch();
  };

  const handleCancelInvite = async (invId: string) => {
    await supabase.from("clinic_invitations").delete().eq("id", invId);
    fetchTeam();
  };

  // Renova o prazo (7 dias) e entrega o link direto de cadastro do integrante.
  const shareInvite = async (inv: Invitation, via: "copy" | "whatsapp") => {
    const { data: token, error } = await (supabase.rpc as any)("renew_clinic_invitation", { _invitation_id: inv.id });
    if (error || !token) {
      toast({ title: lang === "pt" ? "Não foi possível gerar o link" : "Could not create link", variant: "destructive" });
      return;
    }
    const link = buildInviteLink(String(token));
    const clinicName = activeClinic?.clinic_name || "";
    const msg = inviteMessage(lang, clinicName, roleLabels[inv.role][lang], link);
    if (via === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    } else {
      try { await navigator.clipboard.writeText(link); } catch { /* ignore */ }
      toast({ title: lang === "pt" ? "Link copiado" : lang === "es" ? "Enlace copiado" : "Link copied",
        description: lang === "pt" ? "Válido por 7 dias. Envie ao integrante." : lang === "es" ? "Válido por 7 días." : "Valid for 7 days." });
    }
    fetchTeam();
  };

  const handleRoleChange = async (memberId: string, newRole: ClinicRole) => {
    await supabase.from("clinic_members").update({ role: newRole }).eq("id", memberId);
    fetchTeam();
    refetch();
  };

  if (!activeClinic) return null;

  const canSetAgendaAccess = isAgendaManagerRole(activeClinic.role);
  const isUnlimited = activeClinic.max_members >= 9999;
  const isSec = (r: ClinicRole) => r === "secretary";
  const secretarySeats = members.filter((m) => isSec(m.role)).length + invitations.filter((i) => isSec(i.role)).length;
  const seatsUsed = members.length + invitations.length - secretarySeats;
  const clinicalFull = !isUnlimited && seatsUsed >= activeClinic.max_members;
  const secretaryFull = !isUnlimited && secretarySeats >= 1;
  const atLimit = clinicalFull && secretaryFull;

  return (
    <div className="space-y-6">
      {/* Clinic settings */}
      <div id="clinic-start-identity" className="scroll-mt-24"><ClinicSettingsCard /></div>

      {/* Team members */}
      <Card id="clinic-start-team" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            {lang === "pt" ? "Equipe clínica" : lang === "es" ? "Equipo clínico" : "Clinical team"} ({seatsUsed}/{isUnlimited ? "Enterprise" : activeClinic.max_members})
            {!isUnlimited && (
              <span className="text-sm font-normal text-muted-foreground">
                · {lang === "pt" ? "Secretária" : lang === "es" ? "Secretaria" : "Secretary"} {secretarySeats}/1
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 p-3 rounded-lg border border-border/50 bg-muted/30">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {m.is_student ? <GraduationCap className="h-3.5 w-3.5 text-primary" /> : roleIcon(m.role)}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{identities.find(i => i.id === m.id)?.full_name || m.full_name || m.email || "—"}</p>
                  {identities.find(i => i.id === m.id)?.council_number && <p className="text-xs text-muted-foreground">{identities.find(i => i.id === m.id)?.council_type}: {identities.find(i => i.id === m.id)?.council_number}</p>}
                  {m.full_name && m.email && (
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    <Badge variant="outline" className="text-[10px]">{roleLabels[m.role][lang]}</Badge>
                    {m.role !== "secretary" && (
                      <Badge variant="outline" className={m.has_signature ? "text-[10px] border-primary/40 text-primary" : "text-[10px] text-muted-foreground"}>
                        {m.has_signature
                          ? (lang === "pt" ? "Assinatura cadastrada" : lang === "es" ? "Firma registrada" : "Signature on file")
                          : (lang === "pt" ? "Assinatura pendente" : lang === "es" ? "Firma pendiente" : "Signature pending")}
                      </Badge>
                    )}
                    {(m.is_student && m.role !== "intern") && (
                      <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30 hover:bg-primary/15">
                        {lang === "pt" ? "Acadêmico" : lang === "es" ? "Académico" : "Academic"}
                      </Badge>
                    )}
                  </div>
                  {m.is_student && (m.student_institution || m.student_period) && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                      {[m.student_institution, m.student_period].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
              {(m.user_id === user?.id || activeClinic.role === "owner" || activeClinic.role === "admin") && (
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title={lang === "pt" ? "Editar identificação nos relatórios" : lang === "es" ? "Editar identificación en informes" : "Edit report identity"} aria-label={lang === "pt" ? `Editar dados de ${m.full_name || m.email}` : `Edit details for ${m.full_name || m.email}`} onClick={() => setEditing(identities.find(i => i.id === m.id) || { id: m.id, user_id: m.user_id, full_name: m.full_name, council_type: null, council_number: null })}><Pencil className="h-4 w-4" /></Button>
              )}
              {canManage && m.user_id !== user?.id && (
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={m.role} onValueChange={(v) => handleRoleChange(m.id, v as ClinicRole)}>
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">{roleLabels.owner[lang]}</SelectItem>
                      <SelectItem value="admin">{roleLabels.admin[lang]}</SelectItem>
                      <SelectItem value="therapist">{roleLabels.therapist[lang]}</SelectItem>
                      <SelectItem value="intern">{roleLabels.intern[lang]}</SelectItem>
                      <SelectItem value="secretary">{roleLabels.secretary[lang]}</SelectItem>
                      <SelectItem value="osteopath">{roleLabels.osteopath[lang]}</SelectItem>
                      <SelectItem value="pilates_instructor">{roleLabels.pilates_instructor[lang]}</SelectItem>
                      <SelectItem value="doctor">{roleLabels.doctor[lang]}</SelectItem>
                      <SelectItem value="rpg_specialist">{roleLabels.rpg_specialist[lang]}</SelectItem>
                      <SelectItem value="massage_therapist">{roleLabels.massage_therapist[lang]}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveMember(m.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="basis-full empty:hidden min-w-0">
                    {canManage && !isAgendaManagerRole(m.role) && (() => {
                      const acc = agendaAccess[m.id] ?? { scope: "clinic" as AgendaScope, services: [] };
                      const label = `${lang === "pt" ? "Agenda" : lang === "es" ? "Agenda" : "Schedule"}: ${agendaScopeSummary(acc.scope, acc.services, lang, customServices)}`;
                      return canSetAgendaAccess ? (
                        <button type="button" onClick={() => setAgendaMember(m)}
                          aria-label={lang === "pt" ? `Definir acesso à agenda de ${m.full_name || m.email || "integrante"}` : `Set agenda access for ${m.full_name || m.email || "member"}`}
                          className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/40 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10">
                          <CalendarDays className="h-3 w-3 shrink-0" /><span className="truncate">{label}</span><Pencil className="h-2.5 w-2.5 shrink-0" />
                        </button>
                      ) : (
                        <Badge variant="outline" className="text-[10px] max-w-full"><span className="truncate">{label}</span></Badge>
                      );
                    })()}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5" />
              {lang === "pt" ? "Convites pendentes" : lang === "es" ? "Invitaciones pendientes" : "Pending invites"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border border-border/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">{roleLabels[inv.role][lang]}</p>
                </div>
                {canManage && (
                  <div className="flex flex-wrap items-center gap-1">
                    <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => shareInvite(inv, "copy")}>
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      {lang === "pt" ? "Copiar link" : lang === "es" ? "Copiar enlace" : "Copy link"}
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="text-xs h-8" onClick={() => shareInvite(inv, "whatsapp")}>
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />
                      WhatsApp
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="text-destructive text-xs h-8" onClick={() => handleCancelInvite(inv.id)}>
                      {lang === "pt" ? "Cancelar" : lang === "es" ? "Cancelar" : "Cancel"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Limit reached notice */}
      {canManage && atLimit && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="py-4 flex items-start gap-3">
            <Users className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">
                {lang === "pt"
                  ? `Limite do plano atingido (${activeClinic.max_members} membros)`
                  : lang === "es"
                    ? `Límite del plan alcanzado (${activeClinic.max_members} miembros)`
                    : `Plan limit reached (${activeClinic.max_members} members)`}
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                {lang === "pt"
                  ? "Para adicionar alguém, remova um membro, cancele um convite pendente ou faça upgrade do plano da clínica."
                  : lang === "es"
                    ? "Para añadir a alguien, elimine un miembro, cancele una invitación pendiente o mejore el plan de la clínica."
                    : "To add someone, remove a member, cancel a pending invite, or upgrade the clinic plan."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite form */}
      {canManage && !atLimit && (
        <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2 text-lg">
               <UserPlus className="h-5 w-5" />
               {lang === "pt" ? "Adicionar membro" : lang === "es" ? "Añadir miembro" : "Add member"}
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="space-y-2">
               <Label>{lang === "pt" ? "Papel" : "Role"}</Label>
               <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as ClinicRole)}>
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                  <SelectContent>
                    {(["owner","admin","therapist","intern","secretary","osteopath","pilates_instructor","doctor","rpg_specialist","massage_therapist"] as ClinicRole[]).map((r) => (
                      <SelectItem key={r} value={r} disabled={isSec(r) ? secretaryFull : clinicalFull}>
                        {roleLabels[r][lang]}
                      </SelectItem>
                    ))}
                  </SelectContent>
               </Select>
             </div>
             <div className="space-y-2">
               <Label>{lang === "pt" ? "E-mail do membro" : "Member email"}</Label>
               <Input
                 type="email"
                 value={inviteEmail}
                 onChange={(e) => setInviteEmail(e.target.value)}
                 placeholder="email@exemplo.com"
               />
             </div>
             <Button onClick={handleInvite} disabled={sending || !inviteEmail.trim()} className="w-full">
               {sending
                 ? (lang === "pt" ? "Adicionando..." : "Adding...")
                 : (lang === "pt" ? "Adicionar à equipe" : "Add to team")}
             </Button>
             <p className="text-xs text-muted-foreground text-center">
               {lang === "pt"
                 ? "Se o e-mail já tiver cadastro, será adicionado diretamente. Caso contrário, será vinculado automaticamente quando criar conta."
                 : "If the email already has an account, they'll be added directly. Otherwise, they'll be linked automatically upon signup."}
             </p>
             <p className="text-xs text-primary/80 text-center flex items-center justify-center gap-1.5 bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
               <GraduationCap className="h-3.5 w-3.5 shrink-0" />
               {lang === "pt"
                 ? "Estudantes (sem CREFITO) podem ser adicionados como Fisioterapeuta — o selo Acadêmico é aplicado automaticamente nos PDFs e links."
                 : lang === "es"
                 ? "Los estudiantes (sin CREFITO) pueden añadirse como Fisioterapeuta — el sello Académico se aplica automáticamente en los PDF y enlaces."
                 : "Students (without CREFITO) can be added as Therapist — the Academic stamp is applied automatically on PDFs and links."}
             </p>
          </CardContent>
        </Card>
      )}
      <Dialog open={!!editing} onOpenChange={o => { if (!o) setEditing(null); }}><DialogContent><DialogHeader><DialogTitle>{lang === "pt" ? "Identificação nos relatórios" : lang === "es" ? "Identificación en informes" : "Report identity"}</DialogTitle></DialogHeader>{editing && <ClinicReportIdentityForm key={editing.id} member={editing} onSaved={() => { setEditing(null); fetchTeam(); }} />}</DialogContent></Dialog>
      {agendaMember && (
        <AgendaAccessDialog
          open={!!agendaMember}
          onOpenChange={(o) => { if (!o) setAgendaMember(null); }}
          memberId={agendaMember.id}
          memberName={agendaMember.full_name || agendaMember.email || "—"}
          scope={agendaAccess[agendaMember.id]?.scope ?? "clinic"}
          services={agendaAccess[agendaMember.id]?.services ?? []}
          customServices={customServices}
          lang={lang}
          onSaved={fetchTeam}
        />
      )}
    </div>
  );
};

export default ClinicTeamManagement;
