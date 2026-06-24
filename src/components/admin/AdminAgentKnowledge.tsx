import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles, Check, Trash2, ExternalLink, BookOpen, ShieldCheck, Star, Pencil, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { AGENT_NICHES, AGENT_NICHE_LABEL } from "@/lib/agentNiches";
import { isPriorityJournal, journalImpactFactor } from "@/lib/priorityJournals";

interface Article {
  id: string;
  title: string;
  authors: string | null;
  year: number | null;
  journal: string | null;
  pedro_score: number | null;
  pedro_score_status?: "verified" | "not_applicable" | "unscored" | "mismatch" | "not_found" | "needs_review" | string;
  pedro_score_reason?: string | null;
  pedro_score_source?: string | null;
  pedro_record_id?: string | null;
  pedro_score_verified_at?: string | null;
  study_type: string | null;
  niche_tags: string[] | null;
  abstract: string | null;
  key_findings: string | null;
  doi: string | null;
  pmid: string | null;
  source_url: string | null;
  approved: boolean;
  is_favorite?: boolean;
  verification_status?: "verified" | "invalid" | "needs_review" | string;
  verification_checked_at?: string | null;
  verification_source?: string | null;
  verification_matched_title?: string | null;
  verification_similarity?: number | null;
  verification_reason?: string | null;
  created_at: string;
}

const agentErrorMessage = async (error: any, fallback = "Falha ao processar a solicitação") => {
  let code = error?.message || fallback;
  const response = error?.context;
  if (response && typeof response.clone === "function") {
    try {
      const payload = await response.clone().json();
      code = payload?.reason
        ? `${payload?.error || payload?.message || code}: ${payload.reason}`
        : payload?.error || payload?.message || code;
    } catch { /* keep fallback */ }
  }
  const messages: Record<string, string> = {
    ai_rate_limit: "A IA está com limite temporário. Aguarde alguns minutos e tente novamente.",
    ai_credits_exhausted: "Os créditos de IA acabaram. Recarregue os créditos do workspace para continuar.",
    ai_error: "A IA não conseguiu concluir a busca agora. Tente novamente em instantes.",
    Unauthorized: "Sua sessão expirou. Entre novamente e repita a busca.",
    "Admin only": "Apenas administradores podem buscar artigos para a base do agente.",
    "Nicho inválido": "Tema sem descrição clínica. Atualize a página e tente novamente.",
  };
  return messages[code] || (code === "Edge Function returned a non-2xx status code" ? fallback : code);
};

export default function AdminAgentKnowledge() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"pending" | "approved">("pending");
  const [nicheFilter, setNicheFilter] = useState<string>("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [ingestNiche, setIngestNiche] = useState<string>(AGENT_NICHES[0].slug);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDoi, setEditDoi] = useState("");
  const [editPmid, setEditPmid] = useState("");
  const [verifyingOne, setVerifyingOne] = useState(false);
  const [nicheCounts, setNicheCounts] = useState<Record<string, { pending: number; approved: number; total: number }>>({});

  const fetchCounts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("agent-knowledge", { body: { action: "counts" } });
      if (error || data?.error) return;
      setNicheCounts(data?.counts || {});
    } catch (e) { console.warn("[counts]", e); }
  };

  const nicheCountFor = (slug: string) => {
    const c = nicheCounts[slug];
    if (!c) return 0;
    return status === "approved" ? c.approved : c.pending;
  };
  const labelWithCount = (slug: string, label: string, kind: "tab" | "ingest" = "tab") => {
    const c = nicheCounts[slug];
    if (!c) return label;
    if (kind === "ingest") return `${label} (${c.approved}✓ · ${c.pending}⏳)`;
    return `${label} (${nicheCountFor(slug)})`;
  };
  const pedroBadge = (a: Article) => {
    if (a.pedro_score_status === "verified" && a.pedro_score != null) {
      return <Badge variant={a.pedro_score >= 8 ? "default" : "secondary"}>PEDro {a.pedro_score}/10 validado</Badge>;
    }
    if (a.pedro_score_status === "not_applicable") {
      return <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">PEDro N/A validado</Badge>;
    }
    // Sinal amarelo (opcional) — não bloqueia aprovação.
    if (["unscored", "mismatch", "not_found"].includes(a.pedro_score_status || "")) {
      return <Badge variant="outline" className="text-[10px] border-amber-500/60 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">PEDro não confirmado · opcional</Badge>;
    }
    if (a.pedro_score != null) {
      return <Badge variant="outline" className="text-[10px]">PEDro {a.pedro_score}/10 não revalidado</Badge>;
    }
    return <Badge variant="outline" className="text-[10px]">PEDro pendente</Badge>;
  };
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());
  const selectAllVisible = () => setSelectedIds(new Set(articles.map((a) => a.id)));
  const allSelected = articles.length > 0 && selectedIds.size === articles.length;

  const handleBulkReject = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Reprovar e excluir ${ids.length} artigo(s) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
    setBulkBusy(true);
    let ok = 0, fail = 0;
    for (const id of ids) {
      try {
        const { error } = await supabase.functions.invoke("agent-knowledge", { body: { action: "reject", id } });
        if (error) throw error;
        ok++;
      } catch (e) {
        console.error("[bulk reject]", id, e);
        fail++;
      }
    }
    setBulkBusy(false);
    toast({
      title: "Reprovação em lote concluída",
      description: `${ok} removido(s)${fail ? ` · ${fail} falha(s)` : ""}.`,
      variant: fail ? "destructive" : "default",
    });
    clearSelection();
    fetchList();
  };

  const startEdit = (a: Article) => {
    setEditingId(a.id);
    setEditDoi(a.doi || "");
    setEditPmid(a.pmid || "");
  };
  const cancelEdit = () => { setEditingId(null); setEditDoi(""); setEditPmid(""); };

  const handleVerifyOne = async (id: string, approveIfVerified: boolean) => {
    setVerifyingOne(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-knowledge", {
        body: {
          action: "verify_one",
          id,
          doi: editDoi.trim() || null,
          pmid: editPmid.trim() || null,
          approveIfVerified,
        },
      });
      if (error) throw new Error(await agentErrorMessage(error, "Falha ao validar."));
      if (data?.error) throw new Error(data.error);
      if (data.verified) {
        toast({
          title: approveIfVerified ? "Validado e aprovado" : "Validado",
          description: data.pedroReason || (data.matchedTitle ? `Título no PubMed: ${data.matchedTitle}` : "Identificador confirmado."),
        });
        cancelEdit();
        fetchList();
      } else {
        toast({
          title: "Não foi possível validar",
          description: data.matchedTitle
            ? `Título do PubMed/Crossref (${data.matchedTitle}) não bate com o registro. DOI/PMID salvos mas não aprovados.`
            : "DOI/PMID não encontrados ou não confirmam o título. Os valores foram salvos para nova tentativa.",
          variant: "destructive",
        });
        fetchList();
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setVerifyingOne(false);
    }
  };
  const selectedIngestNiche = useMemo(
    () => AGENT_NICHES.find((n) => n.slug === ingestNiche),
    [ingestNiche],
  );

  const fetchList = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-knowledge", {
        body: { action: "list", status, niche: nicheFilter !== "all" ? nicheFilter : undefined, favoritesOnly: favoritesOnly || undefined },
      });
      if (error) throw new Error(error.message || "Falha ao consultar artigos");
      if (data?.error) throw new Error(data.error);
      setArticles(data?.articles || []);
      fetchCounts();
    } catch (e: any) {
      console.error("[AdminAgentKnowledge] list error", e);
      toast({ title: "Erro ao listar artigos", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!authLoading && user) fetchList(); clearSelection(); /* eslint-disable-next-line */ }, [status, nicheFilter, favoritesOnly, authLoading, user?.id]);

  const handleToggleFavorite = async (id: string, current: boolean) => {
    // Optimistic update
    setArticles((prev) => prev.map((x) => x.id === id ? { ...x, is_favorite: !current } : x));
    try {
      const { error } = await supabase.functions.invoke("agent-knowledge", {
        body: { action: "favorite", id, value: !current },
      });
      if (error) throw error;
    } catch (e: any) {
      // Revert
      setArticles((prev) => prev.map((x) => x.id === id ? { ...x, is_favorite: current } : x));
      toast({ title: "Erro ao favoritar", description: e.message, variant: "destructive" });
    }
  };

  const handleIngest = async () => {
    setIngesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-knowledge", {
        body: {
          action: "ingest",
          niche: ingestNiche,
          nicheLabel: selectedIngestNiche?.label,
          nicheDescription: selectedIngestNiche?.description,
          count: 6,
        },
      });
      if (error) throw new Error(await agentErrorMessage(error, "Erro ao buscar artigos para este tema."));
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Busca concluída",
        description: `${data.inserted} adicionado(s) (de ${data.candidates}) · ${data.rejectedUnverified ?? 0} descartado(s) por DOI/PMID · ${data.pedroWarning ?? 0} com PEDro como aviso amarelo (você decide) · ${data.priorityJournalCount ?? 0} em periódico prioritário (IF ≥ 3).`,
      });
      setStatus("pending");
      setNicheFilter(ingestNiche);
      fetchList();
    } catch (e: any) {
      toast({ title: "Erro na ingestão", description: e.message, variant: "destructive" });
    } finally {
      setIngesting(false);
    }
  };

  const handleVerifyAll = async () => {
    const scopeLabel = status === "approved" ? "aprovados" : "pendentes";
    const nicheLabel = nicheFilter === "all" ? "todos os nichos" : (AGENT_NICHES.find(n => n.slug === nicheFilter)?.label || nicheFilter);
    if (!confirm(
      `Revalidar ${scopeLabel} de ${nicheLabel} contra o PubMed/Crossref?\n\n` +
      `• O título de cada artigo será confirmado contra o paper resolvido pelo DOI/PMID.\n` +
      `• A nota PEDro será checada (sinal amarelo opcional — não bloqueia).\n` +
      `• DOIs que apontarem para outro paper serão corrigidos automaticamente.\n` +
      `• Artigos cujo ID NÃO puder ser confirmado serão DESAPROVADOS (movidos para "Pendentes") para revisão manual — nada é deletado.\n\n` +
      `Pode levar alguns minutos.`,
    )) return;
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-knowledge", {
        body: { action: "revalidate", scope: status, niche: nicheFilter !== "all" ? nicheFilter : undefined },
      });
      if (error) throw new Error(await agentErrorMessage(error, "Falha ao revalidar artigos."));
      if (data?.error) throw new Error(data.error);
      const mismatch = data.mismatchFixed ?? 0;
      const demoted = data.demoted ?? 0;
      const pedroRejected = data.pedroRejected ?? 0;
      toast({
        title: "Revalidação concluída",
        description:
          `${data.checked} checados · ${data.verified} confirmados · ${mismatch} DOI corrigido(s) · ${pedroRejected} com aviso PEDro · ${demoted} desaprovado(s) por ID p/ revisão.`,
      });
      if (mismatch > 0 || demoted > 0 || pedroRejected > 0) {
        console.warn("[revalidate] mismatchFixed", data.mismatchFixedItems);
        console.warn("[revalidate] demoted", data.demotedItems);
        console.warn("[revalidate] pedroWarning", data.pedroRejectedItems);
      }
      fetchList();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("agent-knowledge", { body: { action: "approve", id } });
      if (error) throw new Error(await agentErrorMessage(error, "Falha ao aprovar."));
      if (data?.error) throw new Error(data.error);
      toast({ description: "Artigo aprovado." });
      setArticles((a) => a.filter((x) => x.id !== id));
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setBusyId(null); }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Remover este artigo?")) return;
    setBusyId(id);
    try {
      const { error } = await supabase.functions.invoke("agent-knowledge", { body: { action: "reject", id } });
      if (error) throw error;
      toast({ description: "Artigo removido." });
      setArticles((a) => a.filter((x) => x.id !== id));
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setBusyId(null); }
  };

  const counts = useMemo(() => ({ total: articles.length }), [articles]);

  return (
    <div className="space-y-6">
      {/* Ingestão */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Buscar novos artigos (PEDro validado)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={ingestNiche} onValueChange={setIngestNiche}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGENT_NICHES.map((n) => (
                  <SelectItem key={n.slug} value={n.slug}>{labelWithCount(n.slug, n.label, "ingest")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleIngest} disabled={ingesting} className="gap-2">
              {ingesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {ingesting ? "Buscando..." : "Buscar artigos"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            A IA propõe ~6 candidatos por nicho. Cada candidato é <strong>verificado no PubMed/Crossref</strong> e a nota é <strong>checada na base PEDro</strong> antes de ser salvo — RCTs só entram com PEDro ≥ 7 oficial; revisões/meta-análises com PEDro N/A entram sem nota numérica.
          </p>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Base de conhecimento ({counts.total})
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={nicheFilter} onValueChange={setNicheFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os nichos</SelectItem>
                  {AGENT_NICHES.map((n) => (
                    <SelectItem key={n.slug} value={n.slug}>{labelWithCount(n.slug, n.label, "tab")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant={favoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setFavoritesOnly((v) => !v)}
                disabled={loading}
                className="gap-2"
                title="Mostrar apenas favoritos"
              >
                <Star className={`h-4 w-4 ${favoritesOnly ? "fill-current" : ""}`} />
                {favoritesOnly ? "Só favoritos" : "Favoritos"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleVerifyAll} disabled={verifying || loading} className="gap-2" title="Cruza título×DOI/PMID e nota PEDro oficial. Não deleta — desaprova para revisão.">
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {verifying ? "Revalidando..." : "Revalidar (estrito)"}
              </Button>
            </div>
          </div>
          <Tabs value={status} onValueChange={(v) => setStatus(v as any)} className="mt-3">
            <TabsList>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="approved">Aprovados</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : articles.length === 0 ? (
            <p className="text-muted-foreground text-center py-10 text-sm">
              {status === "pending" ? "Nenhum artigo pendente. Use o botão acima para buscar." : "Nenhum artigo aprovado ainda."}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => v ? selectAllVisible() : clearSelection()}
                  />
                  <span>
                    {selectedIds.size > 0
                      ? `${selectedIds.size} selecionado(s)`
                      : `Selecionar todos (${articles.length})`}
                  </span>
                </label>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={clearSelection} disabled={bulkBusy} className="gap-1.5">
                      <X className="h-3.5 w-3.5" /> Limpar
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleBulkReject} disabled={bulkBusy} className="gap-1.5 text-destructive hover:text-destructive">
                      {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      {status === "pending" ? "Reprovar e excluir" : "Remover"} ({selectedIds.size})
                    </Button>
                  </div>
                )}
              </div>
              {articles.map((a) => (
                <div key={a.id} className={`border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow ${selectedIds.has(a.id) ? "ring-2 ring-primary/40" : ""}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={selectedIds.has(a.id)}
                          onCheckedChange={() => toggleSelect(a.id)}
                          className="mt-1 shrink-0"
                          aria-label="Selecionar artigo"
                        />
                        <button
                          type="button"
                          onClick={() => handleToggleFavorite(a.id, !!a.is_favorite)}
                          className="mt-0.5 shrink-0 text-muted-foreground hover:text-amber-500 transition-colors"
                          title={a.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                          aria-label={a.is_favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                        >
                          <Star className={`h-4 w-4 ${a.is_favorite ? "fill-amber-400 text-amber-500" : ""}`} />
                        </button>
                        <h4 className="font-semibold text-foreground leading-snug">{a.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.authors || "—"}{a.year ? ` · ${a.year}` : ""}{a.journal ? ` · ${a.journal}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      {pedroBadge(a)}
                      {isPriorityJournal(a.journal) && (
                        <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600 text-white">
                          ★ Periódico IF {journalImpactFactor(a.journal)?.toFixed(1)}
                        </Badge>
                      )}
                      {a.study_type && <Badge variant="outline" className="text-[10px]">{a.study_type}</Badge>}
                      {a.verification_status === "verified" ? (
                        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">ID validado</Badge>
                      ) : a.verification_status === "invalid" ? (
                        <Badge variant="destructive" className="text-[10px]">ID reprovado</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">aguarda crivo</Badge>
                      )}
                    </div>
                  </div>


                  {a.abstract && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{a.abstract}</p>}
                  {a.key_findings && (
                    <p className="text-sm mt-2"><span className="font-medium text-primary">Achado: </span>{a.key_findings}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    {(a.niche_tags || []).map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">{AGENT_NICHE_LABEL[t] || t}</Badge>
                    ))}
                    {(() => {
                      const cleanDoi = a.doi?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
                      const isVerified = a.verification_status === "verified";
                      const pubmedHref = isVerified && a.pmid
                        ? `https://pubmed.ncbi.nlm.nih.gov/${a.pmid}/`
                        : isVerified && a.source_url?.includes("pubmed") ? a.source_url : null;
                      const doiHref = isVerified && cleanDoi ? `https://doi.org/${cleanDoi}` : null;
                      return (
                        <div className="ml-auto flex items-center gap-2">
                          {pubmedHref && (
                            <a href={pubmedHref} target="_blank" rel="noreferrer"
                               className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                               title={a.pmid ? `PMID ${a.pmid}` : "PubMed"}>
                              PubMed{a.pmid ? ` ${a.pmid}` : ""} <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {doiHref && (
                            <a href={doiHref} target="_blank" rel="noreferrer"
                               className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1">
                              DOI <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                          {!pubmedHref && !doiHref && (
                            <span className="text-xs text-destructive">
                              {isVerified ? "sem link validável" : "links bloqueados: ID não validado"}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {a.verification_status && a.verification_status !== "verified" && (
                    <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/5 p-2 text-[11px] text-muted-foreground">
                      <span className="font-medium text-destructive">Crivo bibliográfico falhou.</span>{" "}
                      {a.verification_matched_title
                        ? <>O identificador resolve para “{a.verification_matched_title}”{typeof a.verification_similarity === "number" ? ` (similaridade ${Math.round(a.verification_similarity * 100)}%)` : ""}, não para o título cadastrado.</>
                        : "Não foi possível confirmar esse título por DOI/PMID no PubMed/Crossref."}
                      {a.verification_reason ? ` Motivo: ${a.verification_reason}.` : ""}
                    </div>
                  )}

                  {a.pedro_score_status && a.pedro_score_status !== "verified" && a.pedro_score_status !== "not_applicable" && (
                    <div className="mt-2 rounded-md border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-2 text-[11px] text-amber-900 dark:text-amber-200">
                      <span className="font-medium">⚠️ Aviso PEDro (opcional).</span>{" "}
                      {a.pedro_score_reason || "A nota PEDro não foi confirmada na base PEDro."}
                      {a.pedro_record_id ? ` Registro PEDro: ${a.pedro_record_id}.` : ""}{" "}
                      Não bloqueia aprovação — um bom artigo em periódico exigente pode não constar na PEDro. Avalie e decida.
                    </div>
                  )}

                  {a.pedro_score_status === "not_applicable" && (
                    <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-2 text-[11px] text-muted-foreground">
                      <span className="font-medium text-primary">PEDro validado como N/A.</span>{" "}
                      Revisão/meta-análise mantida, mas sem nota numérica para não alucinar score.
                    </div>
                  )}


                  {editingId === a.id ? (
                    <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
                      <p className="text-xs font-medium text-foreground">
                        Editar identificadores e revalidar contra PubMed/Crossref
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-muted-foreground">PMID (preferido)</label>
                          <Input
                            value={editPmid}
                            onChange={(e) => setEditPmid(e.target.value)}
                            placeholder="ex.: 31234567"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-muted-foreground">DOI</label>
                          <Input
                            value={editDoi}
                            onChange={(e) => setEditDoi(e.target.value)}
                            placeholder="ex.: 10.1016/j.xxx.2020.01.001"
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        O sistema vai resolver no PubMed/Crossref e <strong>só aprovar se o título bater</strong> com este registro.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={verifyingOne} className="gap-1.5">
                          <X className="h-3.5 w-3.5" /> Cancelar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleVerifyOne(a.id, false)} disabled={verifyingOne} className="gap-1.5">
                          {verifyingOne ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                          Validar
                        </Button>
                        {status === "pending" && (
                          <Button size="sm" onClick={() => handleVerifyOne(a.id, true)} disabled={verifyingOne} className="gap-1.5">
                            {verifyingOne ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Validar e aprovar
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {status === "pending" && (
                        <div className="flex flex-wrap gap-2 mt-3 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(a)} disabled={busyId === a.id} className="gap-1.5">
                            <Pencil className="h-3.5 w-3.5" /> Editar DOI/PMID
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(a.id)} disabled={busyId === a.id} className="gap-1.5 text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" /> Reprovar
                          </Button>
                          <Button size="sm" onClick={() => handleApprove(a.id)} disabled={busyId === a.id} className="gap-1.5">
                            {busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            Aprovar
                          </Button>
                        </div>
                      )}
                      {status === "approved" && (
                        <div className="flex flex-wrap gap-2 mt-3 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(a)} disabled={busyId === a.id} className="gap-1.5">
                            <Pencil className="h-3.5 w-3.5" /> Editar DOI/PMID
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(a.id)} disabled={busyId === a.id} className="gap-1.5 text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" /> Remover
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
