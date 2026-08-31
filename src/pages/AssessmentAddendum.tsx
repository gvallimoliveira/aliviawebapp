import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2, MessageSquarePlus } from "lucide-react";
import { setSeo } from "@/lib/seo";

type State = "loading" | "ready" | "done" | "error";

const AssessmentAddendum = () => {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>("loading");
  const [info, setInfo] = useState<{ assessment_date?: string; professional_name?: string | null; patient_name?: string | null } | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    setSeo({
      title: "Adicionar informações à sua avaliação | Aliv.iA",
      description: "Complemente sua avaliação com informações que você lembrou depois.",
    });
  }, []);

  useEffect(() => {
    (async () => {
      if (!token) { setState("error"); setErrorMsg("Link inválido."); return; }
      const { data, error } = await supabase.functions.invoke("assessment-addendum", {
        body: { action: "load", token },
      });
      if (error || !data?.addendum) {
        setState("error");
        setErrorMsg("Não encontramos este link. Ele pode ter expirado ou já ter sido usado.");
        return;
      }
      if (data.addendum.status === "submitted" && (data.addendum.content || "").trim()) {
        setInfo(data.addendum);
        setState("done");
        return;
      }
      setInfo(data.addendum);
      setState("ready");
    })();
  }, [token]);

  const submit = async () => {
    if (content.trim().length < 3) return;
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("assessment-addendum", {
      body: { action: "submit", token, content },
    });
    setSubmitting(false);
    if (error || !data?.ok) {
      setErrorMsg("Não foi possível enviar agora. Tente novamente em instantes.");
      return;
    }
    setState("done");
  };

  const dateLabel = info?.assessment_date
    ? new Date(info.assessment_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Adicionar informações
          </CardTitle>
          {dateLabel && (
            <p className="text-sm text-muted-foreground">
              Estas informações serão adicionadas à sua avaliação de <strong>{dateLabel}</strong>
              {info?.professional_name ? <> e enviadas a <strong>{info.professional_name}</strong></> : null}.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "loading" && (
            <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          )}

          {state === "error" && <p className="text-sm text-destructive">{errorMsg}</p>}

          {state === "ready" && (
            <>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={7}
                maxLength={5000}
                placeholder="Escreva aqui o que você lembrou depois: cirurgias, exames, medicamentos, situações que pioram ou aliviam a dor…"
                className="text-sm"
              />
              {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
              <Button className="w-full rounded-xl gap-2" onClick={submit} disabled={submitting || content.trim().length < 3}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Enviar informações
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Suas informações são confidenciais e ficam registradas no seu prontuário.
              </p>
            </>
          )}

          {state === "done" && (
            <div className="text-center py-6 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-foreground">Informações enviadas!</p>
              <p className="text-xs text-muted-foreground">
                {info?.professional_name ? `${info.professional_name} já pode ver` : "Seu profissional já pode ver"} o complemento na sua avaliação.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default AssessmentAddendum;
