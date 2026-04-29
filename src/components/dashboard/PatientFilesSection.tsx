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

interface PatientFilesSectionProps {
  patientEmail: string;
  patientName?: string;
  clinicId?: string | null;
  professionalId?: string;
  readOnly?: boolean;
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

const PatientFilesSection = ({ patientEmail, patientName, clinicId, professionalId, readOnly }: PatientFilesSectionProps) => {
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
  }, [patientEmail, clinicId, professionalId]);

  const loadFiles = async () => {
    setLoading(true);
    let query = supabase.from("patient_files").select("*").eq("patient_email", patientEmail);
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

    if (file.type !== "application/pdf") {
      toast({ title: lang === "pt" ? "Apenas arquivos PDF são aceitos" : "Only PDF files accepted", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const prefix = clinicId ? `clinic/${clinicId}` : `pro/${professionalId}`;
      const filePath = `${prefix}/${patientEmail}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("patient-files")
        .upload(filePath, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("patient_files").insert({
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
    const { data, error } = await supabase.storage
      .from("patient-files")
      .createSignedUrl(file.file_path, 60);

    if (error || !data?.signedUrl) {
      toast({ title: lang === "pt" ? "Erro ao gerar link" : "Error generating link", variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.storage.from("patient-files").remove([deleteTarget.file_path]);
    await supabase.from("patient_files").delete().eq("id", deleteTarget.id);
    toast({ title: lang === "pt" ? "Arquivo removido" : "File removed" });
    setDeleteTarget(null);
    loadFiles();
  };

  const handleShare = async (file: PatientFile) => {
    const { data, error } = await supabase.storage
      .from("patient-files")
      .createSignedUrl(file.file_path, 60 * 60); // 1 hour
    if (error || !data?.signedUrl) {
      toast({ title: lang === "pt" ? "Erro ao gerar link" : "Error generating link", variant: "destructive" });
      return;
    }
    const url = data.signedUrl;
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
    if (!/\.pdf$/i.test(newName)) newName += ".pdf";
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
              accept="application/pdf"
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
                    : (lang === "pt" ? "Enviar PDF (laudo, exame)" : "Upload PDF (report, exam)")}
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
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(f)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
                {!readOnly && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(f)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
    </Card>
  );
};

export default PatientFilesSection;
