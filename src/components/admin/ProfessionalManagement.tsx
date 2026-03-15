import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, XCircle, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  language: string;
}

const t = (language: string) => {
  const translations: Record<string, Record<string, string>> = {
    pt: {
      title: "Gestão de Profissionais",
      desc: "Aprove ou revogue cadastros de profissionais",
      pending: "Pendentes",
      approved: "Aprovados",
      approve: "Aprovar",
      revoke: "Revogar",
      name: "Nome",
      crefito: "CREFITO",
      location: "Localização",
      specialties: "Especialidades",
      no_pending: "Nenhum profissional pendente.",
      no_approved: "Nenhum profissional aprovado.",
      approved_msg: "Profissional aprovado!",
      revoked_msg: "Aprovação revogada.",
      error: "Erro ao atualizar.",
    },
    en: {
      title: "Professional Management",
      desc: "Approve or revoke professional registrations",
      pending: "Pending",
      approved: "Approved",
      approve: "Approve",
      revoke: "Revoke",
      name: "Name",
      crefito: "CREFITO",
      location: "Location",
      specialties: "Specialties",
      no_pending: "No pending professionals.",
      no_approved: "No approved professionals.",
      approved_msg: "Professional approved!",
      revoked_msg: "Approval revoked.",
      error: "Error updating.",
    },
  };
  return translations[language] || translations.en;
};

const ProfessionalManagement = ({ language }: Props) => {
  const labels = t(language);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchProfessionals = async () => {
    setLoading(true);
    const { data } = await (supabase.from("professionals" as any) as any)
      .select("*")
      .order("created_at", { ascending: false });
    setProfessionals(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const toggleApproval = async (id: string, currentApproved: boolean) => {
    setTogglingId(id);
    const { error } = await (supabase.from("professionals" as any) as any)
      .update({ approved: !currentApproved })
      .eq("id", id);
    if (error) {
      toast({ title: labels.error, variant: "destructive" });
    } else {
      toast({ description: currentApproved ? labels.revoked_msg : labels.approved_msg });
      fetchProfessionals();
    }
    setTogglingId(null);
  };

  const pending = professionals.filter((p) => !p.approved);
  const approved = professionals.filter((p) => p.approved);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const renderTable = (list: any[], showApprove: boolean) => {
    if (list.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-6">
          {showApprove ? labels.no_pending : labels.no_approved}
        </p>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{labels.name}</TableHead>
            <TableHead>{labels.crefito}</TableHead>
            <TableHead>{labels.location}</TableHead>
            <TableHead>{labels.specialties}</TableHead>
            <TableHead className="w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.full_name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm font-semibold">{p.crefito || "—"}</span>
                  {p.crefito && (
                    <a
                      href={`https://www.coffito.gov.br/nsite/?page_id=2350`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      {language === "pt" ? "Verificar" : "Verify"}
                    </a>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{p.city}/{p.state}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {(p.specialties || []).slice(0, 3).map((s: string) => (
                    <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                  ))}
                  {(p.specialties || []).length > 3 && (
                    <Badge variant="outline" className="text-[10px]">+{(p.specialties || []).length - 3}</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Button
                  size="sm"
                  variant={showApprove ? "default" : "outline"}
                  onClick={() => toggleApproval(p.id, p.approved)}
                  disabled={togglingId === p.id}
                  className="gap-1.5"
                >
                  {togglingId === p.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : showApprove ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  {showApprove ? labels.approve : labels.revoke}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          {labels.title}
        </CardTitle>
        <CardDescription>{labels.desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending">
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              {labels.pending} ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              {labels.approved} ({approved.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pending">{renderTable(pending, true)}</TabsContent>
          <TabsContent value="approved">{renderTable(approved, false)}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProfessionalManagement;
