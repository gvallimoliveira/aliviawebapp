import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Trash2, Plus, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface VipUser {
  id: string;
  email: string;
  notes: string | null;
  created_at: string;
}

const Admin = () => {
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [vipUsers, setVipUsers] = useState<VipUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVip, setIsVip] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const t = language === "pt" ? {
    title: "Administração VIP",
    desc: "Gerencie a lista de usuários com acesso ilimitado",
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
    title: "VIP Administration",
    desc: "Manage the list of users with unlimited access",
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

  useEffect(() => {
    if (session) fetchVipUsers();
  }, [session]);

  const fetchVipUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        method: "GET",
      });

      if (error) {
        // 403 means user is not VIP — expected behavior
        setIsVip(false);
        setLoading(false);
        return;
      }
      if (data?.error) {
        setIsVip(false);
        setLoading(false);
        return;
      }

      setIsVip(true);
      setVipUsers(data.vip_users || []);
    } catch (err: any) {
      console.error(err);
      setIsVip(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        method: "POST",
        body: { email: newEmail.trim(), notes: newNotes.trim() || null },
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
        method: "DELETE",
        body: { id },
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

  if (authLoading || loading) {
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
            {language === "pt" ? "Voltar ao Painel" : "Back to Dashboard"}
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-10 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
            <p className="text-sm text-muted-foreground">{t.desc}</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{language === "pt" ? "Adicionar Usuário VIP" : "Add VIP User"}</CardTitle>
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
            <CardTitle className="text-lg">{language === "pt" ? "Usuários VIP" : "VIP Users"}</CardTitle>
            <CardDescription>
              {vipUsers.length} {language === "pt" ? "usuário(s)" : "user(s)"}
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
                        {new Date(vip.created_at).toLocaleDateString(language === "pt" ? "pt-BR" : "en-US")}
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
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
