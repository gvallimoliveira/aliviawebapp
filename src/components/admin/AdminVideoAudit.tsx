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
  const [newName, setNewName] = useState<Record<string, string>>({});


  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error }, { data: pend, error: pendError }] = await Promise.all([
      supabase
        .from("exercise_video_audit_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(12),
      supabase
        .from("exercise_library")
        .select("id, name_pt, video_url, video_status, video_check_note, video_checked_at")
        .in("video_status", REVIEW_STATUSES)
        .order("name_pt"),
    ]);
    if (error || pendError) {
      toast({
        title: "Erro ao carregar auditorias",
        description: (error || pendError)?.message,
        variant: "destructive",
      });
    } else {
      setRuns((data as unknown as AuditRun[]) || []);
      setPending((pend as unknown as PendingVideo[]) || []);
    }
    setLoading(false);
  }, []);

  const decide = async (
    item: PendingVideo,
    decision: "approved" | "needs_replacement",
  ) => {
    setSavingId(item.id);
    const note =
      decision === "approved"
        ? `Aprovado manualmente em ${new Date().toLocaleDateString("pt-BR")}`
        : `Substituição solicitada em ${new Date().toLocaleDateString("pt-BR")}`;
    const { error } = await supabase
      .from("exercise_library")
      .update({
        video_status: decision,
        video_check_note: note,
        video_checked_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Não foi possível salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: decision === "approved" ? "Vídeo aprovado" : "Substituição solicitada",
      description: item.name_pt,
    });
    if (decision === "approved") {
      setPending((prev) => prev.filter((p) => p.id !== item.id));
    } else {
      setPending((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, video_status: decision, video_check_note: note } : p)),
      );
    }
  };

  const saveNewUrl = async (item: PendingVideo) => {
    const url = (newUrl[item.id] || "").trim();
    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
      toast({
        title: "Link inválido",
        description: "Cole um link do YouTube (youtube.com ou youtu.be).",
        variant: "destructive",
      });
      return;
    }
    setSavingId(item.id);
    const { error } = await supabase
      .from("exercise_library")
      .update({
        video_url: url,
        video_status: "approved",
        video_check_note: `Vídeo substituído manualmente em ${new Date().toLocaleDateString("pt-BR")}`,
        video_checked_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Não foi possível substituir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Vídeo substituído", description: item.name_pt });
    setNewUrl((prev) => ({ ...prev, [item.id]: "" }));
    setPending((prev) => prev.filter((p) => p.id !== item.id));
  };


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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {pending.length === 0 ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Nenhum vídeo pendente de revisão
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Vídeos aguardando sua decisão ({pending.length})
              </>
            )}
          </CardTitle>
          <CardDescription>
            Abra o link, confira o vídeo e decida: aprovar (não volta a ser sinalizado),
            solicitar substituição ou colar direto um novo link do YouTube.
            {last && (
              <>
                {" "}Última execução: {new Date(last.started_at).toLocaleString("pt-BR")} (
                {last.source === "cron" ? "automática" : "manual"})
              </>
            )}
          </CardDescription>
        </CardHeader>
        {pending.length > 0 && (
          <CardContent className="space-y-4">
            {pending.map((item) => {
              const runIssue = issues.find((i) => i.id === item.id);
              const busy = savingId === item.id;
              return (
                <div key={item.id} className="rounded-lg border p-3 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{item.name_pt}</p>
                      <p className="text-xs text-muted-foreground">
                        {runIssue?.video_title || item.video_check_note || "—"}
                        {runIssue?.channel ? ` · ${runIssue.channel}` : ""}
                      </p>
                    </div>
                    <Badge variant={item.video_status === "broken" ? "destructive" : "secondary"}>
                      {STATUS_LABEL[item.video_status] || item.video_status}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {item.video_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={item.video_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Ver vídeo
                        </a>
                      </Button>
                    )}
                    <Button size="sm" disabled={busy} onClick={() => decide(item, "approved")}>
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <ThumbsUp className="h-4 w-4 mr-1" />
                      )}
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy || item.video_status === "needs_replacement"}
                      onClick={() => decide(item, "needs_replacement")}
                    >
                      <Replace className="h-4 w-4 mr-1" />
                      Solicitar substituição
                    </Button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      value={newUrl[item.id] || ""}
                      onChange={(e) => setNewUrl((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Colar novo link do YouTube (substitui e aprova)"
                      className="sm:flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy || !(newUrl[item.id] || "").trim()}
                      onClick={() => saveNewUrl(item)}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Salvar novo link
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        )}
      </Card>



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
