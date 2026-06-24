import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, ExternalLink, Search, BookOpen } from "lucide-react";
import { AGENT_NICHES, AGENT_NICHE_LABEL } from "@/lib/agentNiches";

type Article = {
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
  pmid: string | null;
  source_url: string | null;
};

const CURRENT_YEAR = new Date().getFullYear();

export default function AgentKnowledgeBrowser() {
  const [niche, setNiche] = useState<string>("all");
  const [pedroMin, setPedroMin] = useState<string>("any");
  const [yearMin, setYearMin] = useState<string>("any");
  const [search, setSearch] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-knowledge", {
        body: {
          action: "list_public",
          niche: niche !== "all" ? niche : undefined,
          pedroMin: pedroMin !== "any" ? Number(pedroMin) : undefined,
          yearMin: yearMin !== "any" ? Number(yearMin) : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setArticles(data?.articles || []);
    } catch (e: any) {
      console.error("[AgentKnowledgeBrowser] list error", e);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niche, pedroMin, yearMin]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) =>
      (a.title || "").toLowerCase().includes(q) ||
      (a.authors || "").toLowerCase().includes(q) ||
      (a.journal || "").toLowerCase().includes(q) ||
      (a.key_findings || "").toLowerCase().includes(q),
    );
  }, [articles, search]);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-border/40 bg-card/50 backdrop-blur-sm space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Biblioteca de evidências</h2>
          <Badge variant="outline" className="text-[10px]">Aprovados · PEDro ≥ 7</Badge>
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">
          Artigos verificados no PubMed/Crossref que alimentam o raciocínio do agente. Use os filtros para explorar por nicho, nota PEDro ou ano.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Select value={niche} onValueChange={setNiche}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Nicho" /></SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="all">Todos os nichos</SelectItem>
              {AGENT_NICHES.map((n) => (
                <SelectItem key={n.slug} value={n.slug}>{n.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <Select value={pedroMin} onValueChange={setPedroMin}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="PEDro mín." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">PEDro: qualquer</SelectItem>
                <SelectItem value="7">PEDro ≥ 7</SelectItem>
                <SelectItem value="8">PEDro ≥ 8</SelectItem>
                <SelectItem value="9">PEDro ≥ 9</SelectItem>
                <SelectItem value="10">PEDro = 10</SelectItem>
              </SelectContent>
            </Select>
            <Select value={yearMin} onValueChange={setYearMin}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="A partir de" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Ano: qualquer</SelectItem>
                <SelectItem value={String(CURRENT_YEAR - 2)}>Últimos 2 anos</SelectItem>
                <SelectItem value={String(CURRENT_YEAR - 5)}>Últimos 5 anos</SelectItem>
                <SelectItem value={String(CURRENT_YEAR - 10)}>Últimos 10 anos</SelectItem>
                <SelectItem value={String(CURRENT_YEAR - 15)}>Últimos 15 anos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, autor, periódico..."
            className="h-9 pl-8 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-2">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            niche !== "all" ? (
              <div className="mx-1 my-6 rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">BETA</Badge>
                  <span className="text-xs font-semibold">Nicho em curadoria</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ainda não há artigos aprovados para <strong>{AGENT_NICHE_LABEL[niche] || niche}</strong> nos filtros atuais.
                  Esta biblioteca está em versão beta — em breve constarão estudos selecionados e validados (PubMed / PEDro) sobre este tema.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Dica: experimente relaxar o filtro de PEDro ou ano, ou escolha “Todos os nichos”.
                </p>
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-10">
                Nenhum artigo encontrado para esses filtros.
              </p>
            )
          ) : (
            <>
              <p className="text-[11px] text-muted-foreground px-1">
                {filtered.length} artigo{filtered.length === 1 ? "" : "s"}
              </p>
              {filtered.map((a) => {
                const cleanDoi = a.doi?.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
                const href = cleanDoi
                  ? `https://doi.org/${cleanDoi}`
                  : a.source_url || `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(a.title)}`;
                const linkLabel = cleanDoi ? "DOI" : a.source_url?.includes("pubmed") ? "PubMed" : "Abrir";
                return (
                  <div key={a.id} className="rounded-lg border border-border/60 bg-card p-3 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold leading-snug flex-1 min-w-0">{a.title}</h3>
                      <div className="flex flex-col gap-1 items-end shrink-0">
                        {a.pedro_score != null && (
                          <Badge variant={a.pedro_score >= 8 ? "default" : "secondary"} className="text-[10px]">
                            PEDro {a.pedro_score}/10
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {a.authors || "—"}{a.year ? ` · ${a.year}` : ""}{a.journal ? ` · ${a.journal}` : ""}
                    </p>
                    {a.key_findings && (
                      <p className="text-xs mt-2">
                        <span className="font-medium text-primary">Achado: </span>
                        {a.key_findings}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      {a.study_type && (
                        <Badge variant="outline" className="text-[10px]">{a.study_type}</Badge>
                      )}
                      {(a.niche_tags || []).slice(0, 3).map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">
                          {AGENT_NICHE_LABEL[t] || t}
                        </Badge>
                      ))}
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 ml-auto"
                      >
                        {linkLabel} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
