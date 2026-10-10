import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Plus, ShieldCheck, Loader2, LayoutDashboard, Users, UserCheck, FileText, MessageSquare, Mail, Brain, Zap, ShieldAlert, HeartPulse, Video } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AdminDashboard from "@/components/admin/AdminDashboard";
import ProfessionalManagement from "@/components/admin/ProfessionalManagement";
import PartnerManagement from "@/components/admin/PartnerManagement";
import BlogManagement from "@/components/admin/BlogManagement";
import SupportTicketManagement from "@/components/admin/SupportTicketManagement";
import LeadManagement from "@/components/admin/LeadManagement";
import AdminAgentKnowledge from "@/components/admin/AdminAgentKnowledge";
import AdminAiUsage from "@/components/admin/AdminAiUsage";
import AdminLgpdCenter from "@/components/admin/AdminLgpdCenter";
import PatientUserManagement from "@/components/admin/PatientUserManagement";
import AdminVideoAudit from "@/components/admin/AdminVideoAudit";

interface VipUser {
  id: string;
  email: string;
  notes: string | null;
  created_at: string;
}

const Admin = () => {
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { language } = useLanguage();

  const [vipUsers, setVipUsers] = useState<VipUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVip, setIsVip] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTabState] = useState(() => searchParams.get("tab") || sessionStorage.getItem("alivia:admin-tab") || "dashboard");
  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    try { sessionStorage.setItem("alivia:admin-tab", tab); } catch { /* noop */ }
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [pendingPros, setPendingPros] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);

  const isPt = language === "pt";
  const t = isPt ? {
    title: "Administração",
    desc: "Painel de controle do sistema",
    email: "E-mail",
    notes: "Notas (opcional)",
    add: "Adicionar",
    remove: "Remover",
    no_users: "Nenhum usuário VIP cadastrado.",
    added: "Usuário VIP adicionado com sucesso!",
    removed: "Usuário VIP removido.",
    error: "Erro",
    access_denied: "Acesso restrito a administradores.",
    already_exists: "Este e-mail já está na lista VIP.",
    added_at: "Adicionado em",
  } : {
    title: "Administration",
    desc: "System control panel",
    email: "Email",
    notes: "Notes (optional)",
    add: "Add",
    remove: "Remove",
    no_users: "No VIP users registered.",
    added: "VIP user added successfully!",
    removed: "VIP user removed.",
    error: "Error",
    access_denied: "Access restricted to administrators.",
    already_exists: "This email is already in the VIP list.",
    added_at: "Added on",
  };

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Sync active tab with URL ?tab= parameter
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    const validTabs = ["dashboard", "users", "professionals", "content", "support", "leads", "agent", "ai-usage", "patients", "lgpd", "videos"];
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTabState(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user?.id) {
      fetchVipUsers();
      fetchBadgeCounts();
    }
    // Depend on user id only: token refresh on return must not reload/remount the panel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchBadgeCounts = async () => {
    try {
      const [proRes, ticketRes] = await Promise.all([
        (supabase.from("professionals" as any) as any).select("id", { count: "exact", head: true }).eq("approved", false),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      setPendingPros(proRes.count || 0);
      setOpenTickets(ticketRes.count || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVipUsers = async () => {
    if (!loadedOnce) setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "list_vip" },
      });

      if (error || data?.error) {
        setIsVip(false);
        setVipUsers([]);
        setLoading(false);
        return;
      }

      setIsVip(true);
      setVipUsers(data?.vip_users || []);
    } catch (err: any) {
      console.error(err);
      setIsVip(false);
      setVipUsers([]);
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  };

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "add_vip", email: newEmail.trim(), notes: newNotes.trim() || null },
      });

      if (error) throw error;
      if (data?.error === "Email already in VIP list") {
        toast({ title: t.error, description: t.already_exists, variant: "destructive" });
        setAdding(false);
        return;
      }
      if (data?.error) throw new Error(data.error);

      toast({ title: "✅", description: t.added });
      setNewEmail("");
      setNewNotes("");
      fetchVipUsers();
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "delete_vip", id },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ description: t.removed });
      fetchVipUsers();
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  if (!loadedOnce && (authLoading || loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isVip) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-16 text-center">
          <ShieldCheck className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{t.access_denied}</h1>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="mt-4">
            {isPt ? "Voltar ao Painel" : "Back to Dashboard"}
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-10 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.desc}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="gap-1.5">
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {isPt ? "Usuários" : "Users"}
            </TabsTrigger>
            <TabsTrigger value="professionals" className="gap-1.5 relative">
              <UserCheck className="h-3.5 w-3.5" />
              {isPt ? "Profissionais" : "Professionals"}
              {pendingPros > 0 && (
                <Badge className="ml-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center">
                  {pendingPros}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="patients" className="gap-1.5">
              <HeartPulse className="h-3.5 w-3.5" />
              {isPt ? "Pacientes" : "Patients"}
            </TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {isPt ? "Conteúdo" : "Content"}
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-1.5 relative">
              <MessageSquare className="h-3.5 w-3.5" />
              {isPt ? "Suporte" : "Support"}
              {openTickets > 0 && (
                <Badge className="ml-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center">
                  {openTickets}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="leads" className="gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Leads
            </TabsTrigger>
            <TabsTrigger value="agent" className="gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              Agente
            </TabsTrigger>
            <TabsTrigger value="ai-usage" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              {isPt ? "Uso de IA" : "AI Usage"}
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-1.5">
              <Video className="h-3.5 w-3.5" />
              {isPt ? "Vídeos" : "Videos"}
            </TabsTrigger>
            <TabsTrigger value="lgpd" className="gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              LGPD
            </TabsTrigger>
          </TabsList>


          <TabsContent value="dashboard">
            <AdminDashboard language={language} onNavigate={setActiveTab} />
          </TabsContent>

          <TabsContent value="users">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">{isPt ? "Adicionar Usuário VIP" : "Add VIP User"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder={t.email}
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder={t.notes}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAdd} disabled={adding || !newEmail.trim()} className="gap-2">
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {t.add}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{isPt ? "Usuários VIP" : "VIP Users"}</CardTitle>
                <CardDescription>
                  {vipUsers.length} {isPt ? "usuário(s)" : "user(s)"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {vipUsers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">{t.no_users}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.email}</TableHead>
                        <TableHead>{t.notes}</TableHead>
                        <TableHead>{t.added_at}</TableHead>
                        <TableHead className="w-[80px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vipUsers.map((vip) => (
                        <TableRow key={vip.id}>
                          <TableCell className="font-medium">{vip.email}</TableCell>
                          <TableCell className="text-muted-foreground">{vip.notes || "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(vip.created_at).toLocaleDateString(isPt ? "pt-BR" : "en-US")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(vip.id)}
                              disabled={deletingId === vip.id}
                              className="text-destructive hover:text-destructive"
                            >
                              {deletingId === vip.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="professionals">
            <ProfessionalManagement language={language} />
            <div className="mt-6">
              <PartnerManagement language={language} />
            </div>
          </TabsContent>

          <TabsContent value="patients">
            <PatientUserManagement language={language} />
          </TabsContent>

          <TabsContent value="content">
            <BlogManagement language={language} />
          </TabsContent>

          <TabsContent value="support">
            <SupportTicketManagement language={language} />
          </TabsContent>

          <TabsContent value="leads">
            <LeadManagement language={language} />
          </TabsContent>

          <TabsContent value="agent">
            <AdminAgentKnowledge />
          </TabsContent>

          <TabsContent value="ai-usage">
            <AdminAiUsage isPt={isPt} />
          </TabsContent>

          <TabsContent value="videos">
            <AdminVideoAudit />
          </TabsContent>

          <TabsContent value="lgpd">
            <AdminLgpdCenter />
          </TabsContent>

        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
