import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Users, Search, Trash2, GraduationCap, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PAGE_SIZE = 10;

interface Props {
  language: string;
}

const t = (language: string) => {
  const translations: Record<string, Record<string, string>> = {
    pt: {
      title: "Profissionais Cadastrados",
      desc: "Lista de todos os profissionais ativos no Aliv.iA. O acesso é liberado automaticamente após a assinatura e o preenchimento do cadastro profissional completo (obrigatórios: nome, CPF e CREFITO).",
      search: "Buscar por nome, email, CREFITO, CPF ou cidade...",
      name: "Nome",
      email: "Email",
      crefito: "CREFITO",
      cpf: "CPF",
      location: "Localização",
      specialties: "Especialidades",
      empty: "Nenhum profissional cadastrado ainda.",
      total: "Total",
      actions: "Ações",
      delete: "Excluir",
      delete_confirm_title: "Excluir profissional?",
      delete_confirm_desc: "Esta ação remove permanentemente o cadastro do profissional. O usuário precisará criar um novo cadastro e pagar novamente para voltar. Esta ação não pode ser desfeita.",
      delete_cancel: "Cancelar",
      delete_ok: "Sim, excluir",
      deleted: "Profissional excluído.",
      delete_error: "Erro ao excluir profissional.",
      sort_label: "Ordenar",
      sort_recent: "Mais recentes",
      sort_oldest: "Mais antigos",
      sort_az: "A → Z",
      sort_za: "Z → A",
      page_of: "Página {p} de {t}",
    },
    en: {
      title: "Registered Professionals",
      desc: "All active professionals on Aliv.iA. Access is granted automatically after subscription and a complete professional registration (required: name, CPF and CREFITO).",
      search: "Search by name, email, CREFITO, CPF or city...",
      name: "Name",
      email: "Email",
      crefito: "CREFITO",
      cpf: "CPF",
      location: "Location",
      specialties: "Specialties",
      empty: "No professionals registered yet.",
      total: "Total",
      actions: "Actions",
      delete: "Delete",
      delete_confirm_title: "Delete professional?",
      delete_confirm_desc: "This permanently removes the professional record. They will need to re-register and pay again. This cannot be undone.",
      delete_cancel: "Cancel",
      delete_ok: "Yes, delete",
      deleted: "Professional deleted.",
      delete_error: "Error deleting professional.",
      sort_label: "Sort",
      sort_recent: "Newest first",
      sort_oldest: "Oldest first",
      sort_az: "A → Z",
      sort_za: "Z → A",
      page_of: "Page {p} of {t}",
    },
  };
  return translations[language] || translations.en;
};

const ProfessionalManagement = ({ language }: Props) => {
  const labels = t(language);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase.from("professionals" as any) as any)
        .select("*")
        .order("created_at", { ascending: false });
      setProfessionals(data || []);
      setLoading(false);
    })();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await (supabase as any).rpc("admin_delete_professional", { _professional_id: id });
    setDeletingId(null);
    setConfirmId(null);
    if (error) {
      toast({ title: labels.delete_error, description: error.message, variant: "destructive" });
    } else {
      toast({ description: labels.deleted });
      setProfessionals((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const filtered = professionals.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (p.full_name || "").toLowerCase().includes(q) ||
      (p.crefito || "").toLowerCase().includes(q) ||
      (p.cpf || "").toLowerCase().includes(q) ||
      (p.city || "").toLowerCase().includes(q) ||
      (p.state || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          {labels.title}
          <Badge variant="secondary" className="ml-2">
            {labels.total}: {professionals.length}
          </Badge>
        </CardTitle>
        <CardDescription>{labels.desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.search}
            className="pl-9"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">{labels.empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.name}</TableHead>
                <TableHead>{labels.crefito}</TableHead>
                <TableHead>{labels.cpf}</TableHead>
                <TableHead>{labels.location}</TableHead>
                <TableHead>{labels.specialties}</TableHead>
                <TableHead className="w-[90px] text-right">{labels.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {p.is_student ? (
                        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/5 gap-1">
                          <GraduationCap className="h-3 w-3" />
                          Alivia Acadêmico
                        </Badge>
                      ) : p.crefito ? (
                        <>
                          <span className="font-mono text-sm font-semibold">{p.crefito}</span>
                          <a
                            href="https://www.coffito.gov.br/nsite/?page_id=2350"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            {language === "pt" ? "Verificar" : "Verify"}
                          </a>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.cpf || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.city}/{p.state}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(p.specialties || []).slice(0, 3).map((s: string) => (
                        <Badge key={s} variant="outline" className="text-[10px]">
                          {s}
                        </Badge>
                      ))}
                      {(p.specialties || []).length > 3 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{(p.specialties || []).length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmId(p.id)}
                      disabled={deletingId === p.id}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      title={labels.delete}
                    >
                      {deletingId === p.id ? (
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

      <AlertDialog open={!!confirmId} onOpenChange={(open) => !open && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{labels.delete_confirm_title}</AlertDialogTitle>
            <AlertDialogDescription>{labels.delete_confirm_desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{labels.delete_cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmId && handleDelete(confirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {labels.delete_ok}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default ProfessionalManagement;
