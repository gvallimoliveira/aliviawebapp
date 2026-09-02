import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  RefreshCw,
  Video,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ThumbsUp,
  Replace,
  Save,
} from "lucide-react";

interface AuditIssue {
  id?: string;
  name?: string;
  url?: string;
  status: string;
  video_title?: string;
  channel?: string;
  query_key?: string;
  video_id?: string;
}

interface AuditRun {
  id: string;
  source: string;
  started_at: string;
  finished_at: string | null;
  checked_count: number;
  ok_count: number;
  broken_count: number;
  mismatch_count: number;
  fixed_count: number;
  issues: AuditIssue[] | null;
  error: string | null;
}

interface PendingVideo {
  id: string;
  name_pt: string;
  video_url: string | null;
  video_status: string;
  video_check_note: string | null;
  video_checked_at: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  broken: "Vídeo fora do ar",
  invalid_url: "Link inválido",
  mismatch: "Revisar (título pouco parecido)",
  needs_replacement: "Substituição solicitada",
  cache_broken: "Cache removido",
};

const REVIEW_STATUSES = ["broken", "mismatch", "needs_replacement"];

const AdminVideoAudit = () => {
  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [pending, setPending] = useState<PendingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState<Record<string, string>>({});


  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("exercise_video_audit_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(12);
    if (error) {
      toast({ title: "Erro ao carregar auditorias", description: error.message, variant: "destructive" });
    } else {
      setRuns((data as unknown as AuditRun[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("exercise-video-audit", {
        body: {},
      });
      if (error) throw error;
      toast({
        title: "Auditoria concluída",
        description: `${data?.checked_count ?? 0} vídeos verificados · ${data?.broken_count ?? 0} fora do ar · ${data?.mismatch_count ?? 0} divergentes`,
      });
      await load();
    } catch (e) {
      toast({
        title: "Falha na auditoria",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const last = runs[0];
  const issues = (last?.issues || []).filter((i) => i.status !== "cache_broken");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Auditoria de vídeos dos exercícios
            </CardTitle>
            <CardDescription>
              Roda automaticamente todo dia 1º às 6h (UTC). Verifica cada link do YouTube,
              sinaliza vídeos fora do ar ou com título divergente e limpa o cache do resolvedor.
            </CardDescription>
          </div>
          <Button onClick={runNow} disabled={running} className="shrink-0">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Rodar agora</span>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : !last ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma auditoria registrada ainda. Use "Rodar agora" para a primeira verificação.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Verificados</p>
                <p className="text-2xl font-semibold">{last.checked_count}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">OK</p>
                <p className="text-2xl font-semibold text-primary">{last.ok_count}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Fora do ar</p>
                <p className="text-2xl font-semibold text-destructive">{last.broken_count}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Divergentes</p>
                <p className="text-2xl font-semibold">{last.mismatch_count}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {last && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {issues.length === 0 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Nenhum problema na última auditoria
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Exercícios que precisam de revisão ({issues.length})
                </>
              )}
            </CardTitle>
            <CardDescription>
              Última execução:{" "}
              {new Date(last.started_at).toLocaleString("pt-BR")} ({last.source === "cron" ? "automática" : "manual"})
            </CardDescription>
          </CardHeader>
          {issues.length > 0 && (
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exercício</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Título do vídeo</TableHead>
                    <TableHead>Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((i, idx) => (
                    <TableRow key={`${i.id || i.video_id}-${idx}`}>
                      <TableCell className="font-medium">{i.name || i.query_key}</TableCell>
                      <TableCell>
                        <Badge variant={i.status === "mismatch" ? "secondary" : "destructive"}>
                          {STATUS_LABEL[i.status] || i.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {i.video_title || "—"}
                      </TableCell>
                      <TableCell>
                        {i.url ? (
                          <a
                            href={i.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline text-sm"
                          >
                            abrir
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      )}

      {runs.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Verificados</TableHead>
                  <TableHead>Fora do ar</TableHead>
                  <TableHead>Divergentes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.started_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{r.source === "cron" ? "automática" : "manual"}</TableCell>
                    <TableCell>{r.checked_count}</TableCell>
                    <TableCell>{r.broken_count}</TableCell>
                    <TableCell>{r.mismatch_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminVideoAudit;
