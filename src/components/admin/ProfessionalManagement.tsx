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
import { Loader2, Users, Search, Trash2, GraduationCap, ChevronLeft, ChevronRight, Crown, CreditCard, ShieldCheck, ShieldAlert, Clock, XCircle, Circle, Infinity as InfinityIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SubscriptionAdminDialog from "./SubscriptionAdminDialog";


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
      client_type: "Tipo de cliente",
      subscription: "Assinatura",
      filter_label: "Tipo de cliente",
      filter_all: "Todos os tipos",
      type_partner: "Parceiro / VIP",
      type_student: "Acadêmico",
      type_active: "Assinante ativo",
      type_grace: "Em carência",
      type_trial: "Teste PRO 7 dias",
      trial_until: "Teste até",
      type_canceled: "Cancelado",
      type_basic: "Básico (sem assinatura)",
      lifetime: "Tratamento vitalício",
      expires: "Expira em",
      grace_until: "Carência até",
      no_subscription: "Sem assinatura",
      stripe_linked: "Stripe vinculado",
      stripe_missing: "Sem ID Stripe",
      since: "Cadastrado em",
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
      client_type: "Client type",
      subscription: "Subscription",
      filter_label: "Client type",
      filter_all: "All types",
      type_partner: "Partner / VIP",
      type_student: "Academic",
      type_active: "Active subscriber",
      type_grace: "In grace period",
      type_trial: "PRO 7-day trial",
      trial_until: "Trial until",
      type_canceled: "Canceled",
      type_basic: "Basic (no subscription)",
      lifetime: "Lifetime treatment",
      expires: "Expires on",
      grace_until: "Grace until",
      no_subscription: "No subscription",
      stripe_linked: "Stripe linked",
      stripe_missing: "No Stripe ID",
      since: "Registered on",
    },
  };
  return translations[language] || translations.en;
};

type SortKey = "recent" | "oldest" | "az" | "za";

type ClientType = "partner" | "student" | "trial" | "active" | "grace" | "canceled" | "basic";

const TYPE_META: Record<ClientType, { labelKey: string; className: string; Icon: any }> = {
  partner: { labelKey: "type_partner", className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400", Icon: Crown },
  student: { labelKey: "type_student", className: "border-primary/40 bg-primary/5 text-primary", Icon: GraduationCap },
  trial: { labelKey: "type_trial", className: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400", Icon: Clock },
  active: { labelKey: "type_active", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", Icon: ShieldCheck },
  grace: { labelKey: "type_grace", className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400", Icon: Clock },
  canceled: { labelKey: "type_canceled", className: "border-destructive/40 bg-destructive/10 text-destructive", Icon: XCircle },
  basic: { labelKey: "type_basic", className: "border-border bg-muted text-muted-foreground", Icon: Circle },
};

const TYPE_ORDER: ClientType[] = ["trial", "active", "grace", "partner", "student", "canceled", "basic"];

const classifyClient = (p: any): ClientType => {
  const now = Date.now();
  const status = String(p?.subscription_status || "").toLowerCase();
  const expires = p?.pro_access_expires_at ? new Date(p.pro_access_expires_at).getTime() : null;
  const grace = p?.subscription_grace_until ? new Date(p.subscription_grace_until).getTime() : null;
  // Acadêmico tem precedência: parceiro apenas acadêmico NUNCA é rotulado PRO.
  if (p?.active_profile_mode === "student" || (p?.is_student && !p?.is_partner)) return "student";
  if (p?.is_partner || p?.is_partner_account || p?.premium_granted) return "partner";
  if (p?.is_student) return "student";

  // Teste PRO de 7 dias (cartão no Stripe) ainda em andamento.
  if (p?.pro_trial_ends_at && new Date(p.pro_trial_ends_at).getTime() > now) return "trial";
  if (status === "active" || status === "trialing" || (expires != null && expires > now)) return "active";
  if (grace != null && grace > now) return "grace";
  if (status === "canceled" || status === "cancelled" || status === "past_due" || status === "unpaid") return "canceled";
  return "basic";
};

const fmtDate = (v?: string | null, lang = "pt") =>
  v ? new Date(v).toLocaleDateString(lang === "pt" ? "pt-BR" : "en-US", { day: "2-digit", month: "short", year: "numeric" }) : null;

const ProfessionalManagement = ({ language }: Props) => {
  const labels = t(language);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<"all" | ClientType>("all");
  const [manageProf, setManageProf] = useState<any | null>(null);


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

  const filtered = useMemo(() => {
    const base = professionals.filter((p) => {
      if (typeFilter !== "all" && classifyClient(p) !== typeFilter) return false;
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        (p.full_name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q) ||
        (p.crefito || "").toLowerCase().includes(q) ||
        (p.cpf || "").toLowerCase().includes(q) ||
        (p.city || "").toLowerCase().includes(q) ||
        (p.state || "").toLowerCase().includes(q)
      );
    });
    const sorted = [...base];
    sorted.sort((a, b) => {
      if (sort === "az" || sort === "za") {
        const cmp = (a.full_name || "").localeCompare(b.full_name || "", "pt", { sensitivity: "base" });
        return sort === "az" ? cmp : -cmp;
      }
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return sort === "recent" ? tb - ta : ta - tb;
    });
    return sorted;
  }, [professionals, query, sort, typeFilter]);

  const counts = useMemo(() => {
    const acc: Record<ClientType, number> = { partner: 0, student: 0, trial: 0, active: 0, grace: 0, canceled: 0, basic: 0 };
    professionals.forEach((p) => { acc[classifyClient(p)] += 1; });
    return acc;
  }, [professionals]);

  // Reset to first page whenever filter/sort changes the result set.
  useEffect(() => {
    setPage(1);
  }, [query, sort, typeFilter, professionals.length]);

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
          <Users className="h-5 w-5" />
          {labels.title}
          <Badge variant="secondary" className="ml-2">
            {labels.total}: {professionals.length}
          </Badge>
        </CardTitle>
        <CardDescription>{labels.desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={labels.search}
              className="pl-9"
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="sm:w-[180px]">
              <SelectValue placeholder={labels.sort_label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">{labels.sort_recent}</SelectItem>
              <SelectItem value="oldest">{labels.sort_oldest}</SelectItem>
              <SelectItem value="az">{labels.sort_az}</SelectItem>
              <SelectItem value="za">{labels.sort_za}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="sm:w-[210px]">
              <SelectValue placeholder={labels.filter_label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{labels.filter_all}</SelectItem>
              {TYPE_ORDER.map((k) => (
                <SelectItem key={k} value={k}>
                  {labels[TYPE_META[k].labelKey]} ({counts[k]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Client-type overview */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          {TYPE_ORDER.map((k) => {
            const meta = TYPE_META[k];
            const Icon = meta.Icon;
            const selected = typeFilter === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setTypeFilter(selected ? "all" : k)}
                className={`rounded-xl border p-2.5 text-left transition-colors ${meta.className} ${selected ? "ring-2 ring-primary/40" : "hover:opacity-80"}`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[10px] font-semibold uppercase tracking-wide leading-tight">
                    {labels[meta.labelKey]}
                  </span>
                </div>
                <p className="text-xl font-bold tabular-nums mt-0.5">{counts[k]}</p>
              </button>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">{labels.empty}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{labels.name}</TableHead>
                    <TableHead>{labels.email}</TableHead>
                    <TableHead>{labels.client_type}</TableHead>
                    <TableHead>{labels.subscription}</TableHead>
                    <TableHead>{labels.crefito}</TableHead>
                    <TableHead>{labels.cpf}</TableHead>
                    <TableHead>{labels.location}</TableHead>
                    <TableHead>{labels.specialties}</TableHead>
                    <TableHead className="w-[90px] text-right">{labels.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={p.email || ""}>
                        {p.email || "—"}
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const type = classifyClient(p);
                          const meta = TYPE_META[type];
                          const Icon = meta.Icon;
                          return (
                            <div className="flex flex-col gap-1 items-start">
                              <Badge variant="outline" className={`text-[10px] gap-1 ${meta.className}`}>
                                <Icon className="h-3 w-3" />
                                {labels[meta.labelKey]}
                              </Badge>
                              {p.lifetime_treatment && (
                                <Badge variant="outline" className="text-[10px] gap-1 border-border text-muted-foreground">
                                  <InfinityIcon className="h-3 w-3" />
                                  {labels.lifetime}
                                </Badge>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="space-y-0.5">
                          <p className="font-medium text-foreground capitalize">
                            {p.subscription_status && p.subscription_status !== "inactive"
                              ? String(p.subscription_status).replace(/_/g, " ")
                              : labels.no_subscription}
                          </p>
                          {p.pro_trial_ends_at && new Date(p.pro_trial_ends_at).getTime() > Date.now() && (
                            <p className="text-sky-700 dark:text-sky-400">
                              {labels.trial_until}: {fmtDate(p.pro_trial_ends_at, language)}
                            </p>
                          )}
                          {fmtDate(p.pro_access_expires_at, language) && (
                            <p className="text-muted-foreground">
                              {labels.expires}: {fmtDate(p.pro_access_expires_at, language)}
                            </p>
                          )}
                          {fmtDate(p.subscription_grace_until, language) && (
                            <p className="text-amber-600 dark:text-amber-400">
                              {labels.grace_until}: {fmtDate(p.subscription_grace_until, language)}
                            </p>
                          )}
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <CreditCard className="h-3 w-3" />
                            {p.subscription_stripe_id ? labels.stripe_linked : labels.stripe_missing}
                          </p>
                          <p className="text-muted-foreground/80">
                            {labels.since}: {fmtDate(p.created_at, language) || "—"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {p.is_student ? (
                            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/5 gap-1">
                              <GraduationCap className="h-3 w-3" />
                              Aliv.iA Acadêmico
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
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setManageProf(p)}
                            className="h-8 w-8 p-0"
                            title="Gerenciar acesso e assinatura"
                          >
                            <ShieldAlert className="h-4 w-4" />
                          </Button>
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
                        </div>
                      </TableCell>

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-2 mt-4">
              <p className="text-xs text-muted-foreground">
                {labels.page_of.replace("{p}", String(currentPage)).replace("{t}", String(totalPages))}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
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

      {manageProf && (
        <SubscriptionAdminDialog
          professional={manageProf}
          open={!!manageProf}
          onOpenChange={(v) => !v && setManageProf(null)}
          onUpdated={(patch) =>
            setProfessionals((prev) => prev.map((x) => (x.id === manageProf.id ? { ...x, ...patch } : x)))
          }
        />
      )}
    </Card>

  );
};

export default ProfessionalManagement;
