import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Handshake, Plus, Loader2, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Partner {
  id: string;
  full_name: string;
  email: string | null;
  city: string;
  state: string;
}

interface PartnerManagementProps {
  language: "pt" | "en";
}

const PartnerManagement = ({ language }: PartnerManagementProps) => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const t = language === "pt" ? {
    title: "Parceiros — Acesso Gratuito",
    desc: "Libere acesso profissional gratuito para parceiros",
    email_placeholder: "E-mail do profissional cadastrado",
    grant: "Liberar",
    revoke: "Revogar",
    no_partners: "Nenhum parceiro ativo.",
    granted: "Acesso liberado com sucesso!",
    granted_created: "Conta criada automaticamente com senha padrão: parceiroalivia",
    revoked: "Acesso revogado.",
    not_found: "Profissional não encontrado com este e-mail.",
    auto_create_hint: "Se o profissional não tiver conta, uma será criada automaticamente com senha padrão.",
    error: "Erro",
    name: "Nome",
    location: "Localização",
    partner: "Parceiro",
  } : {
    title: "Partners — Free Access",
    desc: "Grant free professional access to partners",
    email_placeholder: "Registered professional email",
    grant: "Grant",
    revoke: "Revoke",
    no_partners: "No active partners.",
    granted: "Access granted successfully!",
    revoked: "Access revoked.",
    not_found: "No professional found with this email.",
    error: "Error",
    name: "Name",
    location: "Location",
    partner: "Partner",
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "list_partners" },
      });
      if (error) throw error;
      setPartners(data?.partners || []);
    } catch {
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGrant = async () => {
    if (!email.trim()) return;
    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "set_partner", email: email.trim(), is_partner: true },
      });
      if (error) throw error;
      if (data?.error === "not_found") {
        toast({ title: t.error, description: t.not_found, variant: "destructive" });
        setAdding(false);
        return;
      }
      if (data?.error) throw new Error(data.error);
      toast({ title: "✅", description: t.granted });
      setEmail("");
      loadPartners();
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "set_partner", professional_id: id, is_partner: false },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ description: t.revoked });
      loadPartners();
    } catch (err: any) {
      toast({ title: t.error, description: err.message, variant: "destructive" });
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Handshake className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">{t.title}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.grant}</CardTitle>
          <CardDescription>{t.desc}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder={t.email_placeholder}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleGrant} disabled={adding || !email.trim()} className="gap-2">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t.grant}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.title}</CardTitle>
          <CardDescription>
            {partners.length} {t.partner.toLowerCase()}(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : partners.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">{t.no_partners}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.name}</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>{t.location}</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.city}, {p.state}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevoke(p.id)}
                        disabled={revokingId === p.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {revokingId === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
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
    </div>
  );
};

export default PartnerManagement;
