import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { localISODate } from "@/lib/periodization";
import { computePostOpStatus, autoCriteriaFromMeasurements, effectiveCriteria, postOpReportText, type MeasuredAssessment } from "@/lib/postOpTrajectory";

type Template = "blank" | "referral" | "insurance" | "summary";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientName: string;
  patientBirthDate?: string | null;
  latestHypothesis?: string | null;
  assessmentCount: number;
  clinicId?: string | null;
  professionalId?: string | null;
  language: string;
  patientId?: string | null;
  assessments?: MeasuredAssessment[];
}

const TEMPLATES: Record<Template, { label: string; title: string; body: (p: { name: string; hyp: string; n: number; postOp?: string | null }) => string }> = {
  blank: { label: "Em branco", title: "RELATÓRIO FISIOTERAPÊUTICO", body: () => "" },
  referral: {
    label: "Encaminhamento", title: "ENCAMINHAMENTO",
    body: ({ name, hyp, postOp }) => `Prezado(a) colega,\n\nEncaminho o(a) paciente ${name} para avaliação e conduta conjunta.\n\nHipótese fisioterapêutica: ${hyp || "[descrever]"}\n\n${postOp ? postOp + "\n\n" : ""}Conduta realizada até o momento: [descrever]\n\nSolicitação: [descrever]\n\nColoco-me à disposição para troca de informações.`,
  },
  insurance: {
    label: "Convênio", title: "RELATÓRIO FISIOTERAPÊUTICO",
    body: ({ name, hyp }) => `À operadora de saúde,\n\nO(a) paciente ${name} encontra-se em acompanhamento fisioterapêutico.\n\nHipótese fisioterapêutica: ${hyp || "[descrever]"}\n\nEvolução e achados funcionais: [descrever]\n\nJustificativa para continuidade: [descrever]\n\nFrequência proposta: [nº] sessões/semana por [nº] semanas.\n\nObjetivos terapêuticos: [descrever]`,
  },
  summary: {
    label: "Resumo do tratamento", title: "DECLARAÇÃO DE ACOMPANHAMENTO",
    body: ({ name, n }) => `Declaro, para os devidos fins, que ${name} está em acompanhamento fisioterapêutico, com ${n} avaliação(ões) registrada(s).\n\nPeríodo: [início] a [fim]\n\nSituação atual: [descrever]`,
  },
};

export default function FreeReportDialog({ open, onOpenChange, patientName, patientBirthDate, latestHypothesis, assessmentCount, clinicId, professionalId, language, patientId, assessments = [] }: Props) {
  const [template, setTemplate] = useState<Template>("blank");
  const [title, setTitle] = useState(TEMPLATES.blank.title);
  const [recipient, setRecipient] = useState("");
  const [issueDate, setIssueDate] = useState(localISODate());
  const [body, setBody] = useState("");
  const [withSignature, setWithSignature] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setIssueDate(localISODate()); } }, [open]);
  const [postOpText, setPostOpText] = useState<string | null>(null);
  // Beta admin: o acesso à trajetória é validado no servidor; sem acesso, nada é retornado.
  useEffect(() => {
    if (!open || !patientId) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase.from("post_op_profiles" as any).select("*").eq("patient_id", patientId).maybeSingle();
      if (cancel || !data) { if (!cancel) setPostOpText(null); return; }
      const row = data as any;
      const crit = effectiveCriteria(row.criteria, autoCriteriaFromMeasurements(assessments, row.surgery_date));
      setPostOpText(postOpReportText(computePostOpStatus({ ...row, criteria: crit }, localISODate()), row.surgery_date, crit));
    })();
    return () => { cancel = true; };
  }, [open, patientId, assessments]);

  const applyTemplate = (t: Template) => {
    if (body.trim() && !window.confirm("Substituir o texto atual pelo modelo?")) return;
    setTemplate(t);
    setTitle(TEMPLATES[t].title);
    setBody(TEMPLATES[t].body({ name: patientName, hyp: latestHypothesis || "", n: assessmentCount, postOp: postOpText }));
  };

  const generate = async () => {
    if (!body.trim()) { toast({ title: "Escreva o conteúdo do relatório", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Entre na sua conta para emitir o relatório.");
      const { resolveAssessmentBranding } = await import("@/lib/resolveAssessmentBranding");
      const { resolveResponsibleProfessional } = await import("@/lib/getResponsibleProfessional");
      const { generateFreeReportPdfBlob } = await import("@/utils/generatePdf");
      // Emissor = quem está logado: cada colaborador da clínica assina o próprio relatório.
      const branding = await resolveAssessmentBranding({ clinicId: clinicId || null, professionalId: clinicId ? null : professionalId || null, userId: user?.id || null });
      const responsible = await resolveResponsibleProfessional({ userId: user?.id || null, clinicId: clinicId || null, includeSignature: withSignature });
      if (!responsible?.name) throw new Error("Cadastre seu nome completo em Minha conta antes de emitir o relatório.");
      const blob = await generateFreeReportPdfBlob({
        title, recipient, patientName, patientBirthDate, issueDate, body, language,
        clinicLogoUrl: branding.clinicLogoUrl, professionalLogoUrl: branding.professionalLogoUrl,
        clinicName: branding.clinicName, brandColor: branding.brandColor, responsibleProfessional: responsible,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Relatorio_${patientName.replace(/\s+/g, "_")}_${issueDate}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      if (withSignature && !responsible?.signatureImageDataUrl) {
        toast({ title: "Relatório gerado sem imagem de assinatura", description: "Cadastre sua assinatura em Minha conta → Assinatura digital." });
      } else toast({ title: "Relatório gerado" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Não foi possível gerar o relatório", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Relatório Fisioterapêutico</DialogTitle>
          <DialogDescription>Texto livre para convênios, médicos e encaminhamentos, com a identidade visual e sua assinatura.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TEMPLATES) as Template[]).map((t) => (
              <Button key={t} type="button" size="sm" variant={template === t ? "default" : "outline"} onClick={() => applyTemplate(t)}>{TEMPLATES[t].label}</Button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <div className="space-y-1.5"><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} /></div>
            <div className="space-y-1.5"><Label>Data de emissão</Label><Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Destinatário (opcional)</Label><Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Ex.: Ao Dr. Fulano — Ortopedia" maxLength={160} /></div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Conteúdo</Label>
              <div className="flex flex-wrap justify-end">
              {postOpText && <Button type="button" variant="ghost" size="sm" onClick={() => setBody((b) => `${b}${b ? "\n\n" : ""}${postOpText}`)}>Inserir trajetória pós-operatória</Button>}
              {latestHypothesis && <Button type="button" variant="ghost" size="sm" onClick={() => setBody((b) => `${b}${b ? "\n\n" : ""}Hipótese fisioterapêutica: ${latestHypothesis}`)}>Inserir hipótese atual</Button>}
              </div>
            </div>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={14} className="text-sm leading-relaxed" placeholder="Escreva o relatório…" maxLength={12000} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><p className="text-sm font-medium">Incluir assinatura digital</p><p className="text-xs text-muted-foreground">Usa a assinatura cadastrada em Minha conta de quem emite.</p></div>
            <Switch checked={withSignature} onCheckedChange={setWithSignature} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button type="button" onClick={generate} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Gerar PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
