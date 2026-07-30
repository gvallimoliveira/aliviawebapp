import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Download, Send } from "lucide-react";

type RequestType = "access" | "portability" | "correction" | "deletion" | "consent_revocation";

const REQUEST_LABELS: Record<RequestType, string> = {
  access: "Acesso — confirmação e detalhe do tratamento",
  portability: "Portabilidade dos meus dados",
  correction: "Correção de dados incorretos",
  deletion: "Exclusão da conta e dos meus dados",
  consent_revocation: "Revogação de consentimento",
};

const PrivacyRightsCard = () => {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [sending, setSending] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>("deletion");
  const [details, setDetails] = useState("");
  const [pending, setPending] = useState<{ id: string; request_type: string; status: string; created_at: string }[]>([]);

  const loadRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("data_subject_requests")
      .select("id, request_type, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    setPending(data ?? []);
  };

  useEffect(() => {
    void loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const [profile, professional, assessments, painDiary, consents, requests, threads] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id),
        supabase.from("professionals").select("*").eq("user_id", user.id),
        supabase.from("assessments").select("*").eq("user_id", user.id),
        supabase.from("pain_diary_entries").select("*").eq("user_id", user.id),
        supabase.from("consent_records").select("*").eq("user_id", user.id),
        supabase.from("data_subject_requests").select("*").eq("user_id", user.id),
        supabase.from("agent_threads").select("*").eq("user_id", user.id),
      ]);

      const payload = {
        exported_at: new Date().toISOString(),
        account: { id: user.id, email: user.email, created_at: user.created_at },
        profile: profile.data ?? [],
        professional: professional.data ?? [],
        assessments: assessments.data ?? [],
        pain_diary: painDiary.data ?? [],
        consents: consents.data ?? [],
        data_subject_requests: requests.data ?? [],
        clinical_agent_threads: threads.data ?? [],
        note:
          "Exportação LGPD (art. 18) dos dados vinculados a esta conta. Dados de pacientes atendidos podem ser exportados no painel profissional (Exportar todos os dados .zip).",
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `alivia-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Exportação concluída", description: "O arquivo foi baixado no seu dispositivo." });
    } catch (e) {
      toast({
        title: "Erro na exportação",
        description: e instanceof Error ? e.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleRequest = async () => {
    if (!user) return;
    setSending(true);
    try {
      const { error } = await supabase.from("data_subject_requests").insert({
        user_id: user.id,
        request_type: requestType,
        details: details.trim() || null,
      });
      if (error) throw error;
      setDetails("");
      await loadRequests();
      toast({
        title: "Solicitação registrada",
        description: "Responderemos em até 15 dias no e-mail da sua conta.",
      });
    } catch (e) {
      toast({
        title: "Não foi possível registrar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          Privacidade e meus dados
        </CardTitle>
        <CardDescription>
          Exerça seus direitos de titular previstos na LGPD. Consulte a{" "}
          <Link to="/privacidade" className="text-primary underline">
            Política de Privacidade
          </Link>{" "}
          e os{" "}
          <Link to="/termos" className="text-primary underline">
            Termos de Uso
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Baixe uma cópia legível de todos os dados vinculados à sua conta (perfil, avaliações, diário de
            dor, consentimentos e conversas com o agente clínico).
          </p>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar meus dados (.json)
          </Button>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <div className="space-y-2">
            <Label htmlFor="dsr-type">Registrar solicitação</Label>
            <Select value={requestType} onValueChange={(v) => setRequestType(v as RequestType)}>
              <SelectTrigger id="dsr-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REQUEST_LABELS) as RequestType[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {REQUEST_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dsr-details">Detalhes (opcional)</Label>
            <Textarea
              id="dsr-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Explique o que você precisa, se quiser."
              rows={3}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Prontuários podem ser mantidos pelo prazo legal de guarda mesmo após o pedido de exclusão, sendo
            os demais dados eliminados ou anonimizados. Encarregado (DPO): Guilherme Vallim de Oliveira —
            aliviawebapp@gmail.com.
          </p>
          <Button size="sm" className="gap-2" onClick={handleRequest} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar solicitação
          </Button>
        </div>

        {pending.length > 0 && (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-medium text-foreground">Minhas solicitações</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {pending.map((r) => (
                <li key={r.id} className="flex justify-between gap-3">
                  <span>{REQUEST_LABELS[r.request_type as RequestType] ?? r.request_type}</span>
                  <span className="shrink-0">
                    {new Date(r.created_at).toLocaleDateString("pt-BR")} · {r.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrivacyRightsCard;
