import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Check, Trash2, ExternalLink, BookOpen, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AGENT_NICHES, AGENT_NICHE_LABEL } from "@/lib/agentNiches";

interface Article {
  id: string;
  title: string;
  authors: string | null;
  year: number | null;
  journal: string | null;
  pedro_score: number | null;
  study_type: string | null;
  niche_tags: string[] | null;
  abstract: string | null;
  key_findings: string | null;
  doi: string | null;
  source_url: string | null;
  approved: boolean;
  created_at: string;
}

const agentErrorMessage = async (error: any, fallback = "Falha ao processar a solicitação") => {
  let code = error?.message || fallback;
  const response = error?.context;
  if (response && typeof response.clone === "function") {
    try {
      const payload = await response.clone().json();
      code = payload?.error || payload?.message || code;
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
  const [ingestNiche, setIngestNiche] = useState<string>(AGENT_NICHES[0].slug);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const selectedIngestNiche = useMemo(
    () => AGENT_NICHES.find((n) => n.slug === ingestNiche),
    [ingestNiche],
  );

  const fetchList = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-knowledge", {
        body: { action: "list", status, niche: nicheFilter !== "all" ? nicheFilter : undefined },
      });
      if (error) throw new Error(error.message || "Falha ao consultar artigos");
      if (data?.error) throw new Error(data.error);
      setArticles(data?.articles || []);
    } catch (e: any) {
      console.error("[AdminAgentKnowledge] list error", e);
      toast({ title: "Erro ao listar artigos", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!authLoading && user) fetchList(); /* eslint-disable-next-line */ }, [status, nicheFilter, authLoading, user?.id]);

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
        description: `${data.inserted} artigo(s) adicionados à fila de revisão (de ${data.candidates} candidatos).`,
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

  const handleApprove = async (id: string) => {
    setBusyId(id);
    try {
      const { error } = await supabase.functions.invoke("agent-knowledge", { body: { action: "approve", id } });
      if (error) throw error;
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
            Buscar novos artigos (PEDro ≥ 7)
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
                  <SelectItem key={n.slug} value={n.slug}>{n.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleIngest} disabled={ingesting} className="gap-2">
              {ingesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {ingesting ? "Buscando..." : "Buscar artigos"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            A IA propõe ~6 candidatos por nicho (RCTs/RS/meta-análises com PEDro ≥ 7). Todos entram como <strong>pendentes</strong> para sua revisão.
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
            <div className="flex gap-2">
              <Select value={nicheFilter} onValueChange={setNicheFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os nichos</SelectItem>
                  {AGENT_NICHES.map((n) => (
                    <SelectItem key={n.slug} value={n.slug}>{n.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {articles.map((a) => (
                <div key={a.id} className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground leading-snug">{a.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.authors || "—"}{a.year ? ` · ${a.year}` : ""}{a.journal ? ` · ${a.journal}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 items-end shrink-0">
                      {a.pedro_score != null && (
                        <Badge variant={a.pedro_score >= 8 ? "default" : "secondary"}>PEDro {a.pedro_score}/10</Badge>
                      )}
                      {a.study_type && <Badge variant="outline" className="text-[10px]">{a.study_type}</Badge>}
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
                      const href = cleanDoi
                        ? `https://doi.org/${cleanDoi}`
                        : `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(a.title)}`;
                      const label = cleanDoi ? "DOI" : "PubMed";
                      return (
                        <a href={href} target="_blank" rel="noreferrer"
                           className="text-xs text-primary hover:underline inline-flex items-center gap-1 ml-auto">
                          {label} <ExternalLink className="h-3 w-3" />
                        </a>
                      );
                    })()}
                  </div>


                  {status === "pending" && (
                    <div className="flex gap-2 mt-3 justify-end">
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
                    <div className="flex gap-2 mt-3 justify-end">
                      <Button size="sm" variant="outline" onClick={() => handleReject(a.id)} disabled={busyId === a.id} className="gap-1.5 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Remover
                      </Button>
                    </div>
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
