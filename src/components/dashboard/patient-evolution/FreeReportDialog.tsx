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
import { preOpReportText } from "@/lib/aclPreoperative";
import { computePostOpStatus, autoCriteriaFromMeasurements, effectiveCriteria, postOpReportText, type MeasuredAssessment } from "@/lib/postOpTrajectory";

type Template = "blank" | "referral" | "insurance" | "inss" | "summary";

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

const TEMPLATES: Record<Template, { label: string; title: string; body: (p: { name: string; hyp: string; n: number; postOp?: string | null; latest?: any }) => string }> = {
  blank: { label: "Em branco", title: "RELATÓRIO FISIOTERAPÊUTICO", body: () => "" },
  referral: {
    label: "Encaminhamento", title: "ENCAMINHAMENTO",
    body: ({ name, hyp, postOp }) => `Prezado(a) colega,\n\nEncaminho o(a) paciente ${name} para avaliação e conduta conjunta.\n\nHipótese fisioterapêutica: ${hyp || "[descrever]"}\n\n${postOp ? postOp + "\n\n" : ""}Conduta realizada até o momento: [descrever]\n\nSolicitação: [descrever]\n\nColoco-me à disposição para troca de informações.`,
  },
  insurance: {
    label: "Convênio", title: "RELATÓRIO FISIOTERAPÊUTICO",
    body: ({ name, hyp }) => `À operadora de saúde,\n\nO(a) paciente ${name} encontra-se em acompanhamento fisioterapêutico.\n\nHipótese fisioterapêutica: ${hyp || "[descrever]"}\n\nEvolução e achados funcionais: [descrever]\n\nJustificativa para continuidade: [descrever]\n\nFrequência proposta: [nº] sessões/semana por [nº] semanas.\n\nObjetivos terapêuticos: [descrever]`,
  },
  inss: {
    label: "Laudo pericial / INSS", title: "RELATÓRIO FISIOTERAPÊUTICO PARA FINS PERICIAIS",
    body: ({ name, hyp, latest }) => inssBody(name, hyp, latest),
  },
  summary: {
    label: "Resumo do tratamento", title: "DECLARAÇÃO DE ACOMPANHAMENTO",
    body: ({ name, n }) => `Declaro, para os devidos fins, que ${name} está em acompanhamento fisioterapêutico, com ${n} avaliação(ões) registrada(s).\n\nPeríodo: [início] a [fim]\n\nSituação atual: [descrever]`,
  },
};

/** Monta o laudo pericial com os dados reais da avaliação mais recente; campos sem dado ficam como [descrever]. */
function inssBody(name: string, hyp: string, a: any): string {
  const an = a?.anamnesis_data || {};
  const dx = a?.diagnosis || {};
  const fill = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "[descrever]");
  const evalDate = a?.created_at ? new Date(a.created_at).toLocaleDateString("pt-BR") : "[data]";
  const complaint = [an.chiefComplaint, an.additionalComplaint].filter((x: any) => typeof x === "string" && x.trim()).join(" ");
  const rom = (Array.isArray(an.romTable) ? an.romTable : []).filter((r: any) => r?.joint).map((r: any) => `- ${r.joint}: esquerdo ${r.leftValue || "—"}° / direito ${r.rightValue || "—"}°`);
  const strength = (Array.isArray(an.strengthTable) ? an.strengthTable : []).filter((r: any) => r?.movement).map((r: any) => `- ${r.movement}: esquerdo ${r.leftValue || "—"} kgf / direito ${r.rightValue || "—"} kgf`);
  const scales = (Array.isArray(a?.test_results) ? a.test_results : []).filter((t: any) => t?.questionnaireName).map((t: any) => `- ${t.questionnaireName}: ${t.totalScore ?? "—"}/${t.maxScore ?? "—"}${t.interpretation_pt ? ` (${t.interpretation_pt})` : ""}`);
  const deficits = [
    rom.length ? `Amplitude de movimento:\n${rom.join("\n")}` : "",
    strength.length ? `Força muscular (dinamometria):\n${strength.join("\n")}` : "",
    typeof an.functionalTests === "string" && an.functionalTests.trim() ? `Testes funcionais:\n${an.functionalTests.trim()}` : "",
    scales.length ? `Escalas funcionais validadas:\n${scales.join("\n")}` : "",
  ].filter(Boolean).join("\n\n") || "[descrever]";
  const objectives = Array.isArray(dx.clinicalImpression?.therapeuticObjectives) && dx.clinicalImpression.therapeuticObjectives.length
    ? dx.clinicalImpression.therapeuticObjectives.map((o: string) => `- ${o}`).join("\n") : "[descrever]";
  return `Declaro, para fins de perícia médica, que ${name} encontra-se em acompanhamento fisioterapêutico sob minha responsabilidade, com avaliação realizada em ${evalDate}.

1. HISTÓRICO E QUADRO CLÍNICO
Queixa principal: ${fill(complaint)}
Histórico do agravo: ${fill(an.history)}
Tempo de evolução: ${fill(an.duration || an.painDuration)}
Intensidade da dor (EVA): ${a?.pain_score ?? an.painScore ?? "[nº]"}/10
Fatores de piora: ${fill(an.aggravatingFactors)}

2. IMPRESSÃO CLÍNICA
${fill(dx.clinicalImpression?.overview || dx.summary)}

3. PRINCIPAIS DÉFICITS FUNCIONAIS
${deficits}

4. DIAGNÓSTICO CINÉTICO-FUNCIONAL (HIPÓTESE FISIOTERAPÊUTICA)
${fill(hyp)}

5. OBJETIVOS DO TRATAMENTO
${objectives}

6. CONDUTAS REALIZADAS
[descrever: recursos e técnicas aplicados, nº de sessões e período]

7. LIMITAÇÕES FUNCIONAIS E CONCLUSÃO
Os achados acima configuram limitação funcional para [descrever atividades: marcha prolongada, ortostatismo, carga, atividade laboral]. Indica-se a continuidade do tratamento fisioterapêutico, ${"[nº]"} sessões/semana por ${"[nº]"} semanas, com reavaliação ao final do período.

Este relatório descreve a condição cinético-funcional observada e não substitui a avaliação médico-pericial.`;
}

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
      if (cancel) return;
      if (!data) {
        const { data: preparation } = await supabase.from("pre_op_profiles").select("planned_surgery_date, criteria").eq("patient_id", patientId).maybeSingle();
        if (!cancel) setPostOpText(preparation ? preOpReportText({ ...preparation, criteria: preparation.criteria as Record<string, boolean> }, localISODate()) : null);
        return;
      }
      const row = data as any;
      const auto = row.surgery_type === "rotator_cuff_repair" ? {} : autoCriteriaFromMeasurements(assessments, row.surgery_date);
      const crit = effectiveCriteria(row.criteria, auto);
      setPostOpText(postOpReportText(computePostOpStatus({ ...row, criteria: crit }, localISODate()), row.surgery_date, crit, row.surgery_type));
    })();
    return () => { cancel = true; };
  }, [open, patientId, assessments]);

  const latestAssessment = [...(assessments as any[])].filter((a) => a?.diagnosis).sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)))[0] || null;
  const applyTemplate = (t: Template) => {
    if (body.trim() && !window.confirm("Substituir o texto atual pelo modelo?")) return;
    setTemplate(t);
    setTitle(TEMPLATES[t].title);
    setBody(TEMPLATES[t].body({ name: patientName, hyp: latestHypothesis || "", n: assessmentCount, postOp: postOpText, latest: latestAssessment }));
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
              {postOpText && <Button type="button" variant="ghost" size="sm" onClick={() => setBody((b) => `${b}${b ? "\n\n" : ""}${postOpText}`)}>Inserir trajetória cirúrgica</Button>}
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
