import { useState, useEffect } from "react";
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
import { Users, UserPlus, Mail, Trash2, Crown, Stethoscope as StethIcon, ClipboardList } from "lucide-react";
import ClinicSettingsCard from "./ClinicSettingsCard";
import type { Database } from "@/integrations/supabase/types";

type ClinicRole = Database["public"]["Enums"]["clinic_role"];

interface Member {
  id: string;
  user_id: string;
  role: ClinicRole;
  status: string;
  accepted_at: string | null;
  profiles?: { full_name: string | null } | null;
  email?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: ClinicRole;
  expires_at: string;
}

const roleLabels: Record<ClinicRole, Record<string, string>> = {
  owner: { pt: "Proprietário", en: "Owner", es: "Propietario" },
  therapist: { pt: "Fisioterapeuta", en: "Therapist", es: "Fisioterapeuta" },
  secretary: { pt: "Secretária", en: "Secretary", es: "Secretaria" },
};

const roleIcon = (role: ClinicRole) => {
  if (role === "owner") return <Crown className="h-3.5 w-3.5" />;
  if (role === "therapist") return <StethIcon className="h-3.5 w-3.5" />;
  return <ClipboardList className="h-3.5 w-3.5" />;
};

const ClinicTeamManagement = () => {
  const { activeClinic, refetch } = useClinic();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ClinicRole>("therapist");
  const [sending, setSending] = useState(false);

  const canManage = activeClinic?.role === "owner" || activeClinic?.role === "secretary";
  const lang = language as "pt" | "en" | "es";

  const fetchTeam = async () => {
    if (!activeClinic) return;
    const { data: mems } = await supabase
      .from("clinic_members")
      .select("id, user_id, role, status, accepted_at")
      .eq("clinic_id", activeClinic.clinic_id)
      .eq("status", "active");
    
    // Fetch profile names for members
    const membersWithNames: Member[] = [];
    for (const m of mems || []) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", m.user_id)
        .single();
      membersWithNames.push({ ...m, profiles: prof });
    }
    setMembers(membersWithNames);

    const { data: invs } = await supabase
      .from("clinic_invitations")
      .select("id, email, role, expires_at")
      .eq("clinic_id", activeClinic.clinic_id);
    setInvitations(invs || []);
  };

  useEffect(() => { fetchTeam(); }, [activeClinic?.clinic_id]);

  const handleInvite = async () => {
    if (!activeClinic || !user || !inviteEmail.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("clinic_invitations").insert({
        clinic_id: activeClinic.clinic_id,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        invited_by: user.id,
      });
      if (error) throw error;
      toast({ title: lang === "pt" ? "Convite enviado!" : lang === "es" ? "Invitación enviada!" : "Invite sent!" });
      setInviteEmail("");
      fetchTeam();
    } catch (err: any) {
      toast({ title: lang === "pt" ? "Erro ao convidar" : "Error", description: err.message, variant: "destructive" });
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

  const handleRoleChange = async (memberId: string, newRole: ClinicRole) => {
    await supabase.from("clinic_members").update({ role: newRole }).eq("id", memberId);
    fetchTeam();
    refetch();
  };

  if (!activeClinic) return null;

  return (
    <div className="space-y-6">
      {/* Clinic settings */}
      <ClinicSettingsCard />

      {/* Team members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5" />
            {lang === "pt" ? "Equipe" : lang === "es" ? "Equipo" : "Team"} ({members.length}/{activeClinic.max_members})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/50 bg-muted/30">
              <div className="flex items-center gap-3 min-w-0">
                {roleIcon(m.role)}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.profiles?.full_name || "—"}</p>
                  <Badge variant="outline" className="text-[10px]">{roleLabels[m.role][lang]}</Badge>
                </div>
              </div>
              {canManage && m.user_id !== user?.id && m.role !== "owner" && (
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={m.role} onValueChange={(v) => handleRoleChange(m.id, v as ClinicRole)}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="therapist">{roleLabels.therapist[lang]}</SelectItem>
                      <SelectItem value="secretary">{roleLabels.secretary[lang]}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveMember(m.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
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
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                <div>
                  <p className="text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">{roleLabels[inv.role][lang]}</p>
                </div>
                {canManage && (
                  <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={() => handleCancelInvite(inv.id)}>
                    {lang === "pt" ? "Cancelar" : "Cancel"}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Invite form */}
      {canManage && members.length < activeClinic.max_members && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="h-5 w-5" />
              {lang === "pt" ? "Convidar membro" : lang === "es" ? "Invitar miembro" : "Invite member"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{lang === "pt" ? "E-mail do convidado" : "Invitee email"}</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{lang === "pt" ? "Papel" : "Role"}</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as ClinicRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="therapist">{roleLabels.therapist[lang]}</SelectItem>
                  <SelectItem value="secretary">{roleLabels.secretary[lang]}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} disabled={sending || !inviteEmail.trim()} className="w-full">
              {sending
                ? (lang === "pt" ? "Enviando..." : "Sending...")
                : (lang === "pt" ? "Enviar convite" : "Send invite")}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {lang === "pt"
                ? "O convidado receberá um link para aceitar. O link expira em 7 dias."
                : "The invitee will receive a link to accept. Link expires in 7 days."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ClinicTeamManagement;
