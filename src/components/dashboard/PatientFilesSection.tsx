import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Upload, Trash2, Download, Loader2, FileCheck, AlertCircle, Pencil, Share2 } from "lucide-react";
import { downloadStorageFile } from "@/lib/downloadFile";
import { createShortShareLink } from "@/lib/shortLink";

interface PatientFilesSectionProps {
  patientId?: string | null;
  patientEmail: string;
  patientName?: string;
  clinicId?: string | null;
  professionalId?: string;
  readOnly?: boolean;
  isDemo?: boolean;
}

interface PatientFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  mime_type: string;
  description: string | null;
  created_at: string;
  uploaded_by: string;
}

const MAX_FILES = 20;
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

const PatientFilesSection = ({ patientId, patientEmail, patientName, clinicId, professionalId, readOnly: readOnlyProp, isDemo }: PatientFilesSectionProps) => {
  const readOnly = readOnlyProp || isDemo;
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const lang = language as "pt" | "en" | "es";

  const [files, setFiles] = useState<PatientFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PatientFile | null>(null);
  const [renameTarget, setRenameTarget] = useState<PatientFile | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [patientId, patientEmail, clinicId, professionalId]);

  useEffect(() => {
    const refresh = () => { loadFiles(); };
    window.addEventListener("patient-files-changed", refresh);
    return () => window.removeEventListener("patient-files-changed", refresh);
  }, [patientId, patientEmail, clinicId, professionalId]);

  const loadFiles = async () => {
    setLoading(true);
    if (isDemo) {
      const { mockPatientFiles } = await import("@/data/mockProDemoExtras");
      const list = (mockPatientFiles[patientEmail] || []).map((f) => ({ ...f, file_path: "demo://" + f.id, uploaded_by: "demo" }));
      setFiles(list as unknown as PatientFile[]);
      setLoading(false);
      return;
    }
    let query = supabase.from("patient_files").select("*");
    if (patientId) query = query.or(`patient_id.eq.${patientId},and(patient_id.is.null,patient_email.eq.${JSON.stringify(patientEmail)})`);
    else query = query.eq("patient_email", patientEmail);
    if (clinicId) query = query.eq("clinic_id", clinicId);
    else if (professionalId) query = query.eq("professional_id", professionalId);
    const { data } = await query.order("created_at", { ascending: false });
    setFiles((data as PatientFile[]) || []);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > MAX_SIZE_BYTES) {
      toast({ title: lang === "pt" ? "Arquivo muito grande (máx 20MB)" : "File too large (max 20MB)", variant: "destructive" });
      return;
    }

    if (files.length >= MAX_FILES) {
      toast({ title: lang === "pt" ? `Limite de ${MAX_FILES} arquivos atingido` : `${MAX_FILES} files limit reached`, variant: "destructive" });
      return;
    }

    const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    const isAccepted = ACCEPTED.includes(file.type) || /\.(pdf|jpe?g|png|webp|heic|heif)$/i.test(file.name);
    if (!isAccepted) {
      toast({ title: lang === "pt" ? "Formato não suportado (use PDF ou imagem)" : "Unsupported format (use PDF or image)", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Sanitize path: Storage keys must be ASCII-safe (no accents, spaces, or special chars).
      const sanitize = (s: string) =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9._-]+/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "");
      const safeEmail = sanitize(patientEmail).toLowerCase() || "patient";
      const safeName = sanitize(file.name) || "file";
      const prefix = clinicId ? `clinic/${clinicId}` : `pro/${professionalId}`;
      const filePath = `${prefix}/${safeEmail}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("patient-files")
        .upload(filePath, file, { contentType: file.type || "application/octet-stream" });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("patient_files").insert({
        patient_id: patientId || null,
        clinic_id: clinicId || null,
        professional_id: clinicId ? null : professionalId || null,
        patient_email: patientEmail,
        patient_name: patientName || null,
        file_name: file.name,
        file_path: filePath,
        file_size_bytes: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      });

      if (dbError) throw dbError;

      toast({ title: lang === "pt" ? "Arquivo enviado!" : "File uploaded!" });
      loadFiles();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({ title: lang === "pt" ? "Erro ao enviar arquivo" : "Upload error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownload = async (file: PatientFile) => {
    try {
      await downloadStorageFile({ bucket: "patient-files", filePath: file.file_path, fileName: file.file_name });
    } catch (err: any) {
      toast({ title: lang === "pt" ? "Erro ao baixar" : "Download error", description: err?.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { data: report } = await supabase.from("physiotech_reports").select("id").eq("file_id", deleteTarget.id).maybeSingle();
    let error;
    if (report) {
      const result = await supabase.functions.invoke("physiotech-report-file", { body: { reportId: report.id, action: "delete" } });
      error = result.error || (result.data?.ok ? null : new Error("delete_failed"));
    } else {
      const result = await supabase.from("patient_files").delete().eq("id", deleteTarget.id).select("id");
      error = result.error || (result.data?.length ? null : new Error("forbidden"));
      if (!error) { const result = await supabase.storage.from("patient-files").remove([deleteTarget.file_path]); error = result.error; }
    }
    if (error) { toast({ title: lang === "pt" ? "Não foi possível excluir o arquivo" : "Could not delete file", variant: "destructive" }); return; }
    toast({ title: lang === "pt" ? "Arquivo removido" : "File removed" });
    setDeleteTarget(null);
    loadFiles();
    window.dispatchEvent(new Event("patient-files-changed"));
  };

  const handleShare = async (file: PatientFile) => {
    const url = await createShortShareLink({ bucket: "patient-files", filePath: file.file_path, ttlSeconds: 60 * 60 });
    if (!url) {
      toast({ title: lang === "pt" ? "Erro ao gerar link" : "Error generating link", variant: "destructive" });
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: file.file_name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: lang === "pt" ? "Link copiado (válido por 1h)" : "Link copied (valid 1h)" });
      }
    } catch {
      // user cancelled share
    }
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    let newName = renameValue.trim();
    const origExt = renameTarget.file_name.match(/\.[a-z0-9]+$/i)?.[0] || "";
    if (origExt && !new RegExp(`${origExt.replace(".", "\\.")}$`, "i").test(newName)) newName += origExt;
    const { error } = await supabase
      .from("patient_files")
      .update({ file_name: newName })
      .eq("id", renameTarget.id);
    setRenaming(false);
    if (error) {
      toast({ title: lang === "pt" ? "Erro ao renomear" : "Rename error", variant: "destructive" });
      return;
    }
    toast({ title: lang === "pt" ? "Arquivo renomeado" : "File renamed" });
    setRenameTarget(null);
    setRenameValue("");
    loadFiles();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          {lang === "pt" ? "Documentos do Paciente" : "Patient Documents"}
          <Badge variant="outline" className="text-[10px] ml-auto">
            {files.length}/{MAX_FILES}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!readOnly && (
          <div className="relative">
            <Input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={handleUpload}
              disabled={uploading || files.length >= MAX_FILES}
              className="hidden"
              id="patient-file-upload"
            />
            <label htmlFor="patient-file-upload">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 cursor-pointer"
                disabled={uploading || files.length >= MAX_FILES}
                asChild
              >
                <span>
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading
                    ? (lang === "pt" ? "Enviando..." : "Uploading...")
                    : (lang === "pt" ? "Enviar PDF ou imagem (laudo, exame)" : "Upload PDF or image (report, exam)")}
                </span>
              </Button>
            </label>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
            {lang === "pt" ? "Nenhum documento enviado" : "No documents uploaded"}
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                <FileText className="h-4 w-4 text-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{f.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatSize(f.file_size_bytes)} · {new Date(f.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(f)} title={lang === "pt" ? "Baixar" : "Download"}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleShare(f)} title={lang === "pt" ? "Compartilhar (link 1h)" : "Share (1h link)"}>
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
                {!readOnly && (
                  <>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setRenameTarget(f); setRenameValue(f.file_name.replace(/\.[a-z0-9]+$/i, "")); }} title={lang === "pt" ? "Renomear" : "Rename"}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(f)} title={lang === "pt" ? "Excluir" : "Delete"}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {files.length >= MAX_FILES && !readOnly && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-md p-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {lang === "pt" ? "Limite de arquivos atingido. Remova um para enviar outro." : "File limit reached. Remove one to upload another."}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{lang === "pt" ? "Excluir documento?" : "Delete document?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.file_name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "pt" ? "Cancelar" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {lang === "pt" ? "Excluir" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!renameTarget} onOpenChange={(o) => { if (!o) { setRenameTarget(null); setRenameValue(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lang === "pt" ? "Renomear documento" : "Rename document"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder={lang === "pt" ? "Novo nome" : "New name"}
              autoFocus
            />
            <p className="text-[11px] text-muted-foreground">{renameTarget?.file_name.match(/\.[a-z0-9]+$/i)?.[0] || ""}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRenameTarget(null); setRenameValue(""); }}>
              {lang === "pt" ? "Cancelar" : "Cancel"}
            </Button>
            <Button onClick={handleRename} disabled={renaming || !renameValue.trim()}>
              {renaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (lang === "pt" ? "Salvar" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PatientFilesSection;
