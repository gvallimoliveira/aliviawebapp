import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Upload, FileText, Sparkles, AlertTriangle, FileImage, CheckCircle2, X } from "lucide-react";
import { MOCK_EXTERNAL_INTERPRETATION, type ExternalInterpretation } from "@/data/mockExternalAssessment";

const MAX_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 5;
const ACCEPTED = ".pdf,.jpg,.jpeg,.png,.webp,.heic";
const ACCEPTED_MIMES = new Set([
  "application/pdf",
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic",
]);

interface ExternalAssessmentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionalId?: string;
  clinicId?: string | null;
  patientName?: string;
  patientEmail?: string;
  demoMode?: boolean;
  /** Called when the user confirms — hands the interpretation + uploaded file refs back to the caller, which then opens the ManualAssessmentModal pre-filled. */
  onInterpreted: (payload: {
    interpretation: ExternalInterpretation;
    /** First/primary file (kept for backwards compatibility). */
    sourceFile?: { id: string; name: string; path: string } | null;
    /** All uploaded files (up to 5). */
    sourceFiles?: Array<{ id: string; name: string; path: string }>;
  }) => void;
}

const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result as string;
    const idx = result.indexOf(",");
    resolve(idx >= 0 ? result.slice(idx + 1) : result);
  };
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(file);
});

const ExternalAssessmentUploadModal = ({
  open, onOpenChange, professionalId, clinicId, patientName, patientEmail, demoMode = false, onInterpreted,
}: ExternalAssessmentUploadModalProps) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isPt = language === "pt";
  const isEs = language === "es";

  const [files, setFiles] = useState<File[]>([]);
  const [interpreting, setInterpreting] = useState(false);
  const [interpretation, setInterpretation] = useState<ExternalInterpretation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (pt: string, en: string, es?: string) => isPt ? pt : isEs && es ? es : en;

  const reset = () => {
    setFiles([]);
    setInterpretation(null);
    setInterpreting(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handlePickFiles = (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    const incoming = Array.from(picked);
    const accepted: File[] = [];
    for (const f of incoming) {
      if (!ACCEPTED_MIMES.has(f.type) && !f.name.match(/\.(pdf|jpe?g|png|webp|heic)$/i)) {
        toast({ title: t("Formato não suportado", "Unsupported format"), description: `${f.name}: ${t("Use PDF ou imagem (JPG, PNG, WEBP, HEIC).", "Use PDF or image (JPG, PNG, WEBP, HEIC).")}`, variant: "destructive" });
        continue;
      }
      if (f.size > MAX_SIZE_BYTES) {
        toast({ title: t("Arquivo muito grande (máx 20MB)", "File too large (max 20MB)"), description: f.name, variant: "destructive" });
        continue;
      }
      accepted.push(f);
    }
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of accepted) {
        if (merged.length >= MAX_FILES) {
          toast({ title: t(`Máximo de ${MAX_FILES} arquivos por upload`, `Maximum of ${MAX_FILES} files per upload`), variant: "destructive" });
          break;
        }
        if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f);
      }
      return merged;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleInterpret = async () => {
    if (demoMode) {
      setInterpreting(true);
      await new Promise((r) => setTimeout(r, 1200));
      setInterpretation(MOCK_EXTERNAL_INTERPRETATION as ExternalInterpretation);
      setInterpreting(false);
      return;
    }
    if (files.length === 0) return;
    setInterpreting(true);
    try {
      const payloadFiles = await Promise.all(
        files.map(async (f) => ({
          fileBase64: await fileToBase64(f),
          mimeType: f.type || "application/octet-stream",
          fileName: f.name,
        })),
      );
      const { data, error } = await supabase.functions.invoke("interpret-external-assessment", {
        body: {
          files: payloadFiles,
          // Backwards-compat single-file fields (first file)
          fileBase64: payloadFiles[0].fileBase64,
          mimeType: payloadFiles[0].mimeType,
          fileName: payloadFiles[0].fileName,
          language,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const interp = data?.interpretation as ExternalInterpretation;
      if (!interp) throw new Error(t("Resposta inválida da IA.", "Invalid AI response."));
      if (interp.interpretable === false) {
        toast({
          title: t("Arquivos não interpretáveis", "Files not interpretable"),
          description: interp.unreadableReason || t("Tente arquivos mais legíveis.", "Try clearer files."),
          variant: "destructive",
        });
        setInterpreting(false);
        return;
      }
      setInterpretation(interp);
    } catch (err: any) {
      console.error("interpret error:", err);
      toast({
        title: t("Erro ao interpretar", "Interpretation error"),
        description: err?.message || t("Tente novamente em instantes.", "Please try again."),
        variant: "destructive",
      });
    } finally {
      setInterpreting(false);
    }
  };

  const uploadSourceFiles = async (): Promise<Array<{ id: string; name: string; path: string }>> => {
    if (!user || demoMode || files.length === 0) return [];
    const results: Array<{ id: string; name: string; path: string }> = [];
    for (const file of files) {
      try {
        const prefix = clinicId ? `clinic/${clinicId}` : `pro/${professionalId}`;
        const safeEmail = patientEmail || `unknown/${user.id}`;
        const filePath = `${prefix}/${safeEmail}/external_${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from("patient-files").upload(filePath, file, { contentType: file.type });
        if (upErr) throw upErr;
        const { data: row, error: dbErr } = await supabase.from("patient_files").insert({
          clinic_id: clinicId || null,
          professional_id: clinicId ? null : professionalId || null,
          patient_email: patientEmail || "",
          patient_name: patientName || null,
          file_name: file.name,
          file_path: filePath,
          file_size_bytes: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
          description: "external_assessment",
        }).select("id").single();
        if (dbErr) throw dbErr;
        results.push({ id: row.id, name: file.name, path: filePath });
      } catch (err: any) {
        console.error("uploadSourceFile failed", err);
        toast({
          title: t("Não foi possível salvar um arquivo original", "Could not save an original file"),
          description: `${file.name}${err?.message ? ` — ${err.message}` : ""}`,
        });
      }
    }
    return results;
  };

  const handleConfirm = async () => {
    if (!interpretation) return;
    const sourceFiles = await uploadSourceFiles();
    onInterpreted({ interpretation, sourceFile: sourceFiles[0] || null, sourceFiles });
    reset();
    onOpenChange(false);
  };

  const renderUploadStep = () => (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-6 text-center space-y-3">
        <Sparkles className="h-8 w-8 text-primary mx-auto" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {t(
              "Envie até 5 PDFs ou imagens da avaliação externa",
              "Upload up to 5 PDFs or images of the external assessment",
              "Envía hasta 5 PDFs o imágenes de la evaluación externa",
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {t(
              "A IA vai interpretar o conteúdo combinado de todos os arquivos, encaixar nos campos do padrão Aliv.iA e levar o que não couber para um bloco de “informações externas adicionais”. Você revisa tudo antes de salvar.",
              "The AI will parse the combined content of all files, map it to Aliv.iA's native fields and place anything that doesn't fit into an “additional external info” block. You review everything before saving.",
            )}
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => handlePickFiles(e.target.files)}
        />

        {files.length > 0 && (
          <div className="flex flex-col gap-1.5 items-stretch">
            {files.map((f, idx) => (
              <div key={`${f.name}-${idx}`} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs">
                {f.type.includes("pdf") ? <FileText className="h-4 w-4 text-primary shrink-0" /> : <FileImage className="h-4 w-4 text-primary shrink-0" />}
                <span className="font-medium truncate flex-1 text-left">{f.name}</span>
                <span className="text-muted-foreground shrink-0">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => removeFile(idx)} aria-label={t("Remover arquivo", "Remove file")}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {files.length < MAX_FILES && (
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
            <Upload className="h-4 w-4" />
            {files.length === 0
              ? t("Selecionar arquivos", "Choose files")
              : t(`Adicionar mais (${files.length}/${MAX_FILES})`, `Add more (${files.length}/${MAX_FILES})`)}
          </Button>
        )}

        <p className="text-[11px] text-muted-foreground">
          {t(
            `PDF, JPG, PNG, WEBP ou HEIC — até 20MB cada, máx ${MAX_FILES} arquivos por upload.`,
            `PDF, JPG, PNG, WEBP or HEIC — up to 20MB each, max ${MAX_FILES} files per upload.`,
          )}
        </p>
      </div>

      <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          {t(
            "A interpretação por IA é um ponto de partida — revise todos os campos no formulário de avaliação antes de salvar.",
            "The AI interpretation is a starting point — review every field in the assessment form before saving.",
          )}
        </span>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    const summary = interpretation!;
    const fieldCount = summary.aiInterpretedFields?.length || 0;
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-medium text-sm">{t("Interpretação concluída", "Interpretation complete")}</p>
          </div>
          <p className="text-xs text-emerald-800/80">
            {t(
              `A IA preencheu ${fieldCount} campo(s) a partir de ${files.length || 1} arquivo(s). Você abrirá o formulário de avaliação manual com tudo já carregado para revisar, editar e salvar.`,
              `The AI filled ${fieldCount} field(s) from ${files.length || 1} file(s). You will open the manual assessment form with everything pre-loaded, ready to review, edit and save.`,
            )}
          </p>
        </div>

        <div className="space-y-2 text-xs">
          {summary.chiefComplaint && (
            <div>
              <span className="font-medium text-foreground">{t("Queixa principal: ", "Chief complaint: ")}</span>
              <span className="text-muted-foreground">{summary.chiefComplaint}</span>
            </div>
          )}
          {summary.painRegions?.length > 0 && (
            <div>
              <span className="font-medium text-foreground">{t("Regiões de dor: ", "Pain regions: ")}</span>
              <span className="text-muted-foreground">{summary.painRegions.join(", ")}</span>
            </div>
          )}
          {summary.diagnosis?.hypothesis && (
            <div>
              <span className="font-medium text-foreground">{t("Hipótese sugerida: ", "Suggested hypothesis: ")}</span>
              <span className="text-muted-foreground">{summary.diagnosis.hypothesis}</span>
              {summary.diagnosis.confidence && (
                <Badge variant="outline" className="ml-1 text-[10px] capitalize">{summary.diagnosis.confidence}</Badge>
              )}
            </div>
          )}
          {summary.additionalExternalInfo && (
            <div>
              <span className="font-medium text-foreground">{t("Informações externas adicionais: ", "Additional external info: ")}</span>
              <span className="text-muted-foreground line-clamp-3">{summary.additionalExternalInfo}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {(summary.aiInterpretedFields || []).map((f) => (
            <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            {t("Upload de avaliação externa", "External assessment upload", "Subir evaluación externa")}
          </DialogTitle>
          <DialogDescription>
            {t(
              "Carregue até 5 PDFs ou imagens de uma avaliação feita fora do Aliv.iA. A IA organiza dentro do nosso padrão para sua revisão.",
              "Upload up to 5 PDFs or images of an assessment done outside Aliv.iA. The AI organizes it into our native format for your review.",
            )}
          </DialogDescription>
        </DialogHeader>

        {!interpretation ? renderUploadStep() : renderReviewStep()}

        <DialogFooter className="gap-2">
          {!interpretation ? (
            <>
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={interpreting}>
                {t("Cancelar", "Cancel")}
              </Button>
              <Button onClick={handleInterpret} disabled={(files.length === 0 && !demoMode) || interpreting} className="gap-1.5">
                {interpreting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {interpreting ? t("Interpretando…", "Interpreting…") : t("Interpretar com IA", "Interpret with AI")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setInterpretation(null)}>
                {t("Voltar", "Back")}
              </Button>
              <Button onClick={handleConfirm} className="gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                {t("Abrir para revisão", "Open for review")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExternalAssessmentUploadModal;
