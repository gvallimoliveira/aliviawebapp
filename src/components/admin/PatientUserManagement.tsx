import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, HeartPulse, Search, ChevronLeft, ChevronRight, Crown, Circle, FileText, Sparkles, Link2, Unlink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PAGE_SIZE = 10;

interface PatientUser {
  user_id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
  signup_origin: string | null;
  basic_count: number;
  premium_count: number;
  paid_premium: boolean;
  granted_premium: boolean;
  last_assessment_at: string | null;
}

type PatientType = "premium" | "granted" | "basic" | "no_assessment";

const TYPE_META: Record<PatientType, { pt: string; en: string; className: string; Icon: any }> = {
  premium: {
    pt: "Assinante Premium",
    en: "Premium subscriber",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    Icon: Sparkles,
  },
  granted: {
    pt: "Premium concedido",
    en: "Granted premium",
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    Icon: Crown,
  },
  basic: {
    pt: "Básico (fez avaliação)",
    en: "Basic (assessed)",
    className: "border-primary/40 bg-primary/5 text-primary",
    Icon: FileText,
  },
  no_assessment: {
    pt: "Cadastrado (sem avaliação)",
    en: "Registered (no assessment)",
    className: "border-border bg-muted text-muted-foreground",
    Icon: Circle,
  },
};

const TYPE_ORDER: PatientType[] = ["premium", "granted", "basic", "no_assessment"];

const classify = (p: PatientUser): PatientType => {
  if (p.paid_premium || p.premium_count > 0) return "premium";
  if (p.granted_premium) return "granted";
  if (p.basic_count > 0) return "basic";
  return "no_assessment";
};

const fmtDate = (v?: string | null, lang = "pt") =>
  v ? new Date(v).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const PatientUserManagement = ({ language }: { language: string }) => {
  const isPt = language === "pt";
  const [rows, setRows] = useState<PatientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | PatientType>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("admin_list_patient_users");
      if (error) {
        toast({
          title: isPt ? "Erro ao carregar usuários" : "Error loading users",
          description: error.message,
          variant: "destructive",
        });
      }
      setRows((data as PatientUser[]) || []);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const acc: Record<PatientType, number> = { premium: 0, granted: 0, basic: 0, no_assessment: 0 };
    rows.forEach((r) => { acc[classify(r)] += 1; });
    return acc;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (typeFilter !== "all" && classify(r) !== typeFilter) return false;
      if (!q) return true;
      return (
        (r.full_name || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, typeFilter]);

  useEffect(() => { setPage(1); }, [query, typeFilter, rows.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
          <HeartPulse className="h-5 w-5" />
          {isPt ? "Usuários Pessoa / Paciente" : "Personal / Patient Users"}
          <Badge variant="secondary" className="ml-2">
            {isPt ? "Total" : "Total"}: {rows.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          {isPt
            ? "Contas cadastradas como pessoa com dor (sem cadastro profissional e sem vínculo com clínica). Mostra se fizeram avaliação básica gratuita e se evoluíram para Premium."
            : "Accounts registered as a person in pain (no professional record and no clinic link). Shows free basic assessments and Premium conversion."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isPt ? "Buscar por nome ou email..." : "Search by name or email..."}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="sm:w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{isPt ? "Todos os tipos" : "All types"}</SelectItem>
              {TYPE_ORDER.map((k) => (
                <SelectItem key={k} value={k}>
                  {isPt ? TYPE_META[k].pt : TYPE_META[k].en} ({counts[k]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          {TYPE_ORDER.map((k) => {
            const meta = TYPE_META[k];
            const Icon = meta.Icon;
            const selected = typeFilter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setTypeFilter(selected ? "all" : k)}
                className={`rounded-lg border p-2 text-left transition-colors ${meta.className} ${selected ? "ring-2 ring-primary/40" : ""}`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-[11px] font-medium leading-tight">{isPt ? meta.pt : meta.en}</span>
                </div>
                <p className="text-xl font-bold mt-1">{counts[k]}</p>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {isPt ? "Nenhum usuário encontrado." : "No users found."}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isPt ? "Nome" : "Name"}</TableHead>
                    <TableHead>{isPt ? "E-mail" : "Email"}</TableHead>
                    <TableHead>{isPt ? "Situação" : "Status"}</TableHead>
                    <TableHead className="text-center">{isPt ? "Básicas" : "Basic"}</TableHead>
                    <TableHead className="text-center">Premium</TableHead>
                    <TableHead>{isPt ? "Última avaliação" : "Last assessment"}</TableHead>
                    <TableHead>{isPt ? "Cadastro" : "Signup"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => {
                    const type = classify(r);
                    const meta = TYPE_META[type];
                    const Icon = meta.Icon;
                    return (
                      <TableRow key={r.user_id}>
                        <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{r.email || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`gap-1 ${meta.className}`}>
                            <Icon className="h-3 w-3" />
                            {isPt ? meta.pt : meta.en}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">{r.basic_count}</TableCell>
                        <TableCell className="text-center">{r.premium_count}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {fmtDate(r.last_assessment_at, language)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {fmtDate(r.created_at, language)}
                          {r.signup_origin && (
                            <span className="block text-[11px] opacity-70">{r.signup_origin}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {isPt ? `Página ${currentPage} de ${totalPages}` : `Page ${currentPage} of ${totalPages}`}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientUserManagement;
