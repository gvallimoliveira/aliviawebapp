import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolveAssessmentBranding } from "@/lib/resolveAssessmentBranding";
import { sanitizeStrengthRows } from "@/components/assessment/StrengthTable";
import { generateMeasurementPdfBlob } from "@/utils/generatePdf";
import { toast } from "sonner";

interface Props {
  kind: "strength" | "questionnaires";
  assessments: any[];
  patientName: string;
  clinicId?: string;
  professionalId?: string;
  questionnaireId?: string;
}

export default function MeasurementReportButton({ kind, assessments, patientName, clinicId, professionalId, questionnaireId }: Props) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const tl = (pt: string, en: string, es: string) => language === "pt" ? pt : language === "es" ? es : en;
  const entries = [...assessments].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).flatMap((a) => {
    if (kind === "strength") return sanitizeStrengthRows(a.anamnesis_data?.strengthTable).length ? [{ assessment: a, result: null, specialty: false, name: tl("Dinamometria", "Dynamometry", "Dinamometría") }] : [];
    const functional = Array.isArray(a.test_results) ? a.test_results.filter((r: any) => r.questionnaireId && r.percentageScore != null).map((result: any) => ({ assessment: a, result, specialty: false, name: result.questionnaireName || result.questionnaireId })) : [];
    const specialty = Array.isArray(a.anamnesis_data?.specialtyResults) ? a.anamnesis_data.specialtyResults.filter((r: any) => r?.score).map((result: any) => ({ assessment: a, result, specialty: true, name: result.questionnaireName || result.questionnaireId })) : [];
    return [...functional, ...specialty].filter((e) => !questionnaireId || e.result.questionnaireId === questionnaireId);
  });
  const download = async (entry: typeof entries[number]) => {
    setLoading(true);
    try {
      const branding = await resolveAssessmentBranding({ clinicId: clinicId || entry.assessment.clinic_id, professionalId: professionalId || entry.assessment.professional_id, userId: user?.id });
      const blob = await generateMeasurementPdfBlob({
        ...branding, kind, patientName, language, date: entry.assessment.created_at,
        strengthTable: kind === "strength" ? sanitizeStrengthRows(entry.assessment.anamnesis_data?.strengthTable) : undefined,
        questionnaireResults: entry.result && !entry.specialty ? [entry.result] : [],
        specialtyResults: entry.result && entry.specialty ? [entry.result] : [],
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `AliviA_${entry.name}_${patientName}_${entry.assessment.created_at.slice(0, 10)}.pdf`.replace(/[<>:"/\\|?*]/g, "_");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      toast.error(tl("Não foi possível gerar o relatório. Tente novamente.", "Could not generate the report. Please retry.", "No se pudo generar el informe. Inténtelo de nuevo."));
    } finally { setLoading(false); }
  };
  if (!entries.length) return null;
  const label = tl("Gerar relatório PDF", "Generate PDF report", "Generar informe PDF");
  const control = <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0" disabled={loading} aria-label={label}>
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}{label}
  </Button>;
  return <DropdownMenu><DropdownMenuTrigger asChild>{control}</DropdownMenuTrigger><DropdownMenuContent align="end" className="max-h-72 max-w-[90vw] overflow-y-auto">
    {entries.map((entry, i) => <DropdownMenuItem key={`${entry.assessment.id}-${i}`} className="whitespace-normal" onSelect={() => { void download(entry); }}>
      {entry.name} · {new Date(entry.assessment.created_at).toLocaleDateString(language === "pt" ? "pt-BR" : language === "es" ? "es-ES" : "en-US")}
    </DropdownMenuItem>)}
  </DropdownMenuContent></DropdownMenu>;
}