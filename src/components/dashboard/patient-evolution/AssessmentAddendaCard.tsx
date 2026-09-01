import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { anchorScroll } from "@/hooks/useScrollAnchor";
import {
  AssessmentAddendum,
  createPatientAddendumRequest,
  createProfessionalAddendum,
  deleteAddendum,
  fetchAssessmentAddenda,
  filledAddenda,
  pendingReinterpretation,
  reinterpretAssessmentWithAddenda,
} from "@/lib/assessmentAddenda";
import { Copy, Link2, Loader2, MessageSquarePlus, Plus, Sparkles, Trash2, User, UserRound } from "lucide-react";

interface Props {
  assessment: any;
  patientName?: string | null;
  professionalName?: string | null;
  readOnly?: boolean;
  isDemo?: boolean;
  /** Called after a successful reinterpretation with the new diagnosis object. */
  onReinterpreted?: (diagnosis: any) => void;
}

export const AssessmentAddendaCard = ({
  assessment,
  patientName,
  professionalName,
  readOnly,
  isDemo,
  onReinterpreted,
}: Props) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [addenda, setAddenda] = useState<AssessmentAddendum[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [reinterpreting, setReinterpreting] = useState(false);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const addendaRef = useRef<AssessmentAddendum[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);

  const assessmentId = assessment?.id;
  const dateLabel = assessment?.created_at
    ? new Date(assessment.created_at).toLocaleDateString(language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR", { day: "2-digit", month: "long", year: "numeric" })
    : "";

  const load = async () => {
    if (!assessmentId || isDemo) { setLoading(false); return; }
    setLoading(true);
    setAddenda(await fetchAssessmentAddenda(assessmentId));
    setLoading(false);
  };

  useEffect(() => {
    addendaRef.current = addenda;
  }, [addenda]);

  useEffect(() => {
    load();
    // Atualiza automaticamente enquanto houver links pendentes de resposta.
    if (!assessmentId || isDemo) return;
    const interval = setInterval(() => {
      const hasPendingLinks = addendaRef.current.some((a) => a.status === "pending" && a.token);
      if (hasPendingLinks) load();
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessmentId, isDemo]);

  const filled = filledAddenda(addenda);
  const pending = pendingReinterpretation(addenda);
  const openLinks = addenda.filter((a) => a.status === "pending" && a.token);

  const handleSave = async () => {
    if (draft.trim().length < 3) return;
    setSaving(true);
    try {
      await createProfessionalAddendum({ assessmentId, content: draft, authorName: professionalName ?? null });
      setDraft("");
      setComposing(false);
      await load();
      toast({ title: "Informação adicional registrada" });
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateLink = async () => {
    setLinking(true);
    try {
      const { token } = await createPatientAddendumRequest({ assessmentId, patientName: patientName ?? null });
      const url = `${getPublicOrigin()}/adendo/${token}`;
      setLastLink(url);
      try { await navigator.clipboard.writeText(url); } catch { /* clipboard blocked */ }
      await load();
      toast({ title: "Link gerado e copiado", description: "Envie ao paciente para complementar esta avaliação." });
    } catch (e: any) {
      toast({ title: "Erro ao gerar link", description: e?.message, variant: "destructive" });
    } finally {
      setLinking(false);
    }
  };

  const handleReinterpret = async () => {
    const restoreScroll = anchorScroll(() => cardRef.current || document.getElementById("sec-adendos"), 3000);
    setReinterpreting(true);
    try {
      const diagnosis = await reinterpretAssessmentWithAddenda({ assessmentId, addenda, language });
      restoreScroll();
      await load();
      onReinterpreted?.(diagnosis);
      toast({ title: "Avaliação reinterpretada", description: "Hipótese atualizada com as novas informações." });
    } catch (e: any) {
      restoreScroll();
      toast({ title: "Erro ao reinterpretar", description: e?.message, variant: "destructive" });
    } finally {
      setReinterpreting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAddendum(id);
      await load();
    } catch (e: any) {
      toast({ title: "Erro ao remover", description: e?.message, variant: "destructive" });
    }
  };

  if (isDemo) return null;
  if (loading && addenda.length === 0) return null;
  if (readOnly && filled.length === 0) return null;

  return (
    <Card ref={cardRef} className={pending.length > 0 ? "border-primary/40 bg-primary/[0.03]" : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4 text-primary" />
              Informações adicionais
              {pending.length > 0 && (
                <Badge className="bg-primary text-primary-foreground text-[10px]">
                  {pending.length} {pending.length === 1 ? "novo adendo" : "novos adendos"}
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complementos da avaliação de {dateLabel}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filled.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhuma informação adicional registrada nesta avaliação.
          </p>
        )}

        {filled.map((a) => (
          <div key={a.id} className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {a.author_type === "patient" ? <UserRound className="h-3 w-3" /> : <User className="h-3 w-3" />}
                <span>{a.author_name || (a.author_type === "patient" ? "Paciente" : "Profissional")}</span>
                <span>•</span>
                <span>{new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</span>
                {a.considered_at ? (
                  <Badge variant="outline" className="text-[9px] ml-1">já interpretado</Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] ml-1 border-primary/40 text-primary">não interpretado</Badge>
                )}
              </div>
              {!readOnly && (
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => handleDelete(a.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{a.content}</p>
          </div>
        ))}

        {!readOnly && pending.length > 0 && (
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              Se estas informações mudam o raciocínio, reinterprete a avaliação com a IA (consome créditos).
              Se forem irrelevantes, basta manter registradas aqui.
            </p>
            <Button size="sm" className="rounded-xl gap-1.5 text-xs" onClick={handleReinterpret} disabled={reinterpreting}>
              {reinterpreting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {reinterpreting ? "Reinterpretando…" : "Reinterpretar avaliação"}
            </Button>
          </div>
        )}

        {!readOnly && (
          <div className="space-y-2 pt-1">
            {composing ? (
              <div className="space-y-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Ex.: paciente relembrou cirurgia de menisco em 2019 e uso de anti-inflamatório na última semana."
                  rows={4}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="rounded-xl text-xs" onClick={handleSave} disabled={saving || draft.trim().length < 3}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Salvar adendo
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setComposing(false); setDraft(""); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-xs" onClick={() => setComposing(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar informações
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-xs" onClick={handleGenerateLink} disabled={linking}>
                  {linking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}
                  Gerar link para o paciente
                </Button>
              </div>
            )}

            {lastLink && (
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 p-2">
                <p className="text-[11px] text-muted-foreground truncate flex-1">{lastLink}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px] gap-1"
                  onClick={() => { navigator.clipboard.writeText(lastLink); toast({ title: "Link copiado" }); }}
                >
                  <Copy className="h-3 w-3" />
                  Copiar
                </Button>
              </div>
            )}

            {openLinks.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {openLinks.length === 1
                  ? "1 link enviado aguardando resposta do paciente."
                  : `${openLinks.length} links enviados aguardando resposta do paciente.`}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AssessmentAddendaCard;
