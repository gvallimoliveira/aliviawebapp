import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Image as ImageIcon, Upload, Trash2, Loader2, AlertCircle, Camera, Pencil, Share2, Download } from "lucide-react";
import { downloadStorageFile } from "@/lib/downloadFile";
import { preparePhoto } from "@/lib/preparePhoto";
import { createShortShareLink } from "@/lib/shortLink";
import { DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PatientPhotosSectionProps {
  patientEmail: string;
  patientName?: string;
  clinicId?: string | null;
  professionalId?: string;
  readOnly?: boolean;
}

interface PatientPhoto {
  id: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number;
  mime_type: string;
  category: string;
  created_at: string;
  signedUrl?: string;
}

const MAX_PHOTOS = 30;
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const PatientPhotosSection = ({ patientEmail, patientName, clinicId, professionalId, readOnly }: PatientPhotosSectionProps) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isPt = language === "pt";

  const [photos, setPhotos] = useState<PatientPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<string>("postural");
  const [deleteTarget, setDeleteTarget] = useState<PatientPhoto | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<PatientPhoto | null>(null);
  const [renameTarget, setRenameTarget] = useState<PatientPhoto | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, [patientEmail, clinicId, professionalId]);

  const loadPhotos = async () => {
    setLoading(true);
    let query = (supabase.from("patient_photos" as any) as any).select("*").eq("patient_email", patientEmail);
    if (clinicId) query = query.eq("clinic_id", clinicId);
    else if (professionalId) query = query.eq("professional_id", professionalId);
    const { data } = await query.order("created_at", { ascending: false });
    const list = (data as PatientPhoto[]) || [];

    // Generate signed URLs for thumbnails
    const withUrls = await Promise.all(
      list.map(async (p) => {
        const { data: signed } = await supabase.storage
          .from("patient-photos")
          .createSignedUrl(p.file_path, 300);
        return { ...p, signedUrl: signed?.signedUrl };
      })
    );
    setPhotos(withUrls);
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: isPt ? "Apenas JPG, PNG ou WEBP" : "Only JPG, PNG or WEBP", variant: "destructive" });
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast({ title: isPt ? "Foto muito grande (máx 10MB)" : "Photo too large (max 10MB)", variant: "destructive" });
      e.target.value = "";
      return;
    }
    if (photos.length >= MAX_PHOTOS) {
      toast({ title: isPt ? `Limite de ${MAX_PHOTOS} fotos atingido` : `${MAX_PHOTOS} photos limit reached`, variant: "destructive" });
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const payload = await preparePhoto(file);
      const prefix = clinicId ? `clinic/${clinicId}` : `pro/${professionalId}`;
      const safeEmail = patientEmail.replace(/[^a-zA-Z0-9@._-]/g, "_");
      const filePath = `${prefix}/${safeEmail}/${Date.now()}_${payload.name}`;

      const { error: uploadError } = await supabase.storage
        .from("patient-photos")
        .upload(filePath, payload, { contentType: payload.type });
      if (uploadError) throw uploadError;

      const { error: dbError } = await (supabase.from("patient_photos" as any) as any).insert({
        clinic_id: clinicId || null,
        professional_id: clinicId ? null : professionalId || null,
        patient_email: patientEmail,
        patient_name: patientName || null,
        file_name: payload.name,
        file_path: filePath,
        file_size_bytes: payload.size,
        mime_type: payload.type,
        category,
        uploaded_by: user.id,
      });
      if (dbError) {
        await supabase.storage.from("patient-photos").remove([filePath]);
        throw dbError;
      }

      toast({ title: isPt ? "Foto enviada!" : "Photo uploaded!" });
      loadPhotos();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({ title: isPt ? "Erro ao enviar foto" : "Upload error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.storage.from("patient-photos").remove([deleteTarget.file_path]);
    await (supabase.from("patient_photos" as any) as any).delete().eq("id", deleteTarget.id);
    toast({ title: isPt ? "Foto removida" : "Photo removed" });
    setDeleteTarget(null);
    loadPhotos();
  };

  const handleShare = async (p: PatientPhoto) => {
    const url = await createShortShareLink({ bucket: "patient-photos", filePath: p.file_path, ttlSeconds: 60 * 60 });
    if (!url) {
      toast({ title: isPt ? "Erro ao gerar link" : "Error generating link", variant: "destructive" });
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: p.file_name, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: isPt ? "Link copiado (válido por 1h)" : "Link copied (valid 1h)" });
      }
    } catch {}
  };

  const handleDownload = async (p: PatientPhoto) => {
    try {
      await downloadStorageFile({ bucket: "patient-photos", filePath: p.file_path, fileName: p.file_name });
    } catch (err: any) {
      toast({ title: isPt ? "Erro ao baixar" : "Download error", description: err?.message, variant: "destructive" });
    }
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    const ext = (renameTarget.file_name.match(/\.[a-z0-9]+$/i)?.[0] || "").toLowerCase();
    let newName = renameValue.trim();
    if (ext && !new RegExp(ext + "$", "i").test(newName)) newName += ext;
    const { error } = await (supabase.from("patient_photos" as any) as any)
      .update({ file_name: newName })
      .eq("id", renameTarget.id);
    setRenaming(false);
    if (error) {
      toast({ title: isPt ? "Erro ao renomear" : "Rename error", variant: "destructive" });
      return;
    }
    toast({ title: isPt ? "Foto renomeada" : "Photo renamed" });
    setRenameTarget(null);
    setRenameValue("");
    loadPhotos();
  };

  const categoryLabel = (cat: string) => {
    if (cat === "postural") return isPt ? "Postural" : "Postural";
    if (cat === "follow_up") return isPt ? "Acompanhamento" : "Follow-up";
    return isPt ? "Outro" : "Other";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          {isPt ? "Fotos do Paciente" : "Patient Photos"}
          <Badge variant="outline" className="text-[10px] ml-auto">
            {photos.length}/{MAX_PHOTOS}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!readOnly && (
          <div className="space-y-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="postural">{isPt ? "Avaliação postural" : "Postural assessment"}</SelectItem>
                <SelectItem value="follow_up">{isPt ? "Acompanhamento" : "Follow-up"}</SelectItem>
                <SelectItem value="other">{isPt ? "Outro" : "Other"}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              disabled={uploading || photos.length >= MAX_PHOTOS}
              className="hidden"
              id="patient-photo-upload"
            />
            <label htmlFor="patient-photo-upload">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 cursor-pointer"
                disabled={uploading || photos.length >= MAX_PHOTOS}
                asChild
              >
                <span>
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading
                    ? (isPt ? "Enviando..." : "Uploading...")
                    : (isPt ? "Enviar foto (JPG, PNG, WEBP)" : "Upload photo (JPG, PNG, WEBP)")}
                </span>
              </Button>
            </label>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-30" />
            {isPt ? "Nenhuma foto enviada" : "No photos uploaded"}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                {p.signedUrl ? (
                  <img
                    src={p.signedUrl}
                    alt={p.file_name}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setPreviewPhoto(p)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                <Badge variant="secondary" className="absolute top-1 left-1 text-[9px] px-1 py-0">
                  {categoryLabel(p.category)}
                </Badge>
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); handleShare(p); }}
                    title={isPt ? "Compartilhar (link 1h)" : "Share (1h link)"}
                  >
                    <Share2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => { e.stopPropagation(); handleDownload(p); }}
                    title={isPt ? "Baixar" : "Download"}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  {!readOnly && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); setRenameTarget(p); setRenameValue(p.file_name.replace(/\.[a-z0-9]+$/i, "")); }}
                        title={isPt ? "Renomear" : "Rename"}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }}
                        title={isPt ? "Excluir" : "Delete"}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {photos.length >= MAX_PHOTOS && !readOnly && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-md p-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {isPt ? "Limite de fotos atingido. Remova uma para enviar outra." : "Photo limit reached. Remove one to upload another."}
          </div>
        )}
      </CardContent>

      {/* Lightbox preview */}
      <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="max-w-3xl p-0 bg-background">
          {previewPhoto?.signedUrl && (
            <img src={previewPhoto.signedUrl} alt={previewPhoto.file_name} className="w-full h-auto max-h-[85vh] object-contain" />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isPt ? "Excluir foto?" : "Delete photo?"}</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget?.file_name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{isPt ? "Cancelar" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {isPt ? "Excluir" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!renameTarget} onOpenChange={(o) => { if (!o) { setRenameTarget(null); setRenameValue(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isPt ? "Renomear foto" : "Rename photo"}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder={isPt ? "Novo nome" : "New name"}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRenameTarget(null); setRenameValue(""); }}>
              {isPt ? "Cancelar" : "Cancel"}
            </Button>
            <Button onClick={handleRename} disabled={renaming || !renameValue.trim()}>
              {renaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (isPt ? "Salvar" : "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PatientPhotosSection;
