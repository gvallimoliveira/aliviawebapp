import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Loader2, Users, Search, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  language: string;
}

const t = (language: string) => {
  const translations: Record<string, Record<string, string>> = {
    pt: {
      title: "Profissionais Cadastrados",
      desc: "Lista de todos os profissionais ativos no Aliv.iA. O acesso é liberado automaticamente após assinatura + CREFITO + CPF.",
      search: "Buscar por nome, CREFITO, CPF ou cidade...",
      name: "Nome",
      crefito: "CREFITO",
      cpf: "CPF",
      location: "Localização",
      specialties: "Especialidades",
      empty: "Nenhum profissional cadastrado ainda.",
      total: "Total",
    },
    en: {
      title: "Registered Professionals",
      desc: "All active professionals on Aliv.iA. Access is granted automatically after subscription + CREFITO + CPF.",
      search: "Search by name, CREFITO, CPF or city...",
      name: "Name",
      crefito: "CREFITO",
      cpf: "CPF",
      location: "Location",
      specialties: "Specialties",
      empty: "No professionals registered yet.",
      total: "Total",
    },
  };
  return translations[language] || translations.en;
};

const ProfessionalManagement = ({ language }: Props) => {
  const labels = t(language);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-semibold">{p.crefito || "—"}</span>
                      {p.crefito && (
                        <a
                          href="https://www.coffito.gov.br/nsite/?page_id=2350"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          {language === "pt" ? "Verificar" : "Verify"}
                        </a>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfessionalManagement;
