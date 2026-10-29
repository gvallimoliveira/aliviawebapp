import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Pen, Upload, Trash2 } from "lucide-react";
import SignaturePad from "./SignaturePad";
import { cleanSignatureBlob } from "@/lib/cleanSignature";
import { isAutoSignEnabled, setAutoSignEnabled } from "@/lib/getResponsibleProfessional";

/**
 * Lets a professional upload (or replace) a PNG signature image and toggle the
 * "auto-sign my PDFs" preference. Uses the private `signatures` storage bucket.
 */
const SignatureManager = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isPt = language === "pt";

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [autoSign, setAutoSign] = useState(isAutoSignEnabled());
  const [drawMode, setDrawMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = isPt
    ? {
        title: "Assinatura digital",
        desc: "Sua assinatura aparece no rodapé dos PDFs profissionais quando ativada.",
        none: "Nenhuma assinatura cadastrada.",
        upload: "Enviar imagem (PNG ou JPG)",
        draw: "Assinar na tela",
        replace: "Substituir",
        remove: "Remover",
        autosign_label: "Aplicar minha assinatura nos próximos relatórios",
        autosign_desc: "Você pode ativar/desativar a qualquer momento. Padrão: desativado.",
        invalid: "Envie um arquivo PNG ou JPG (máx. 5MB).",
        saved: "Assinatura salva!",
        removed: "Assinatura removida.",
        upload_error: "Erro ao enviar assinatura.",
      }
    : {
        title: "Digital signature",
        desc: "Your signature appears in the footer of professional PDFs when enabled.",
        none: "No signature registered.",
        upload: "Upload image (PNG or JPG)",
        draw: "Sign on screen",
        replace: "Replace",
        remove: "Remove",
        autosign_label: "Apply my signature to upcoming reports",
        autosign_desc: "Toggle anytime. Default: off.",
        invalid: "Upload a PNG or JPG file (max 5MB).",
        saved: "Signature saved!",
        removed: "Signature removed.",
        upload_error: "Could not upload signature.",
      };

  const path = user ? `${user.id}/signature.png` : null;

  const loadCurrent = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: prof } = await supabase
      .from("professionals")
      .select("signature_image_url")
      .eq("user_id", user.id)
      .maybeSingle();
    const sigPath = (prof as any)?.signature_image_url;
    if (sigPath) {
      setHasSignature(true);
      const { data: signed } = await supabase.storage
        .from("signatures")
        .createSignedUrl(sigPath, 300);
      setSignedUrl(signed?.signedUrl || null);
    } else {
      setHasSignature(false);
      setSignedUrl(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleFile = async (file: Blob) => {
    if (!user?.id || !path) return;
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast({ title: t.invalid, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      // Remove white/checkerboard backgrounds so only the ink reaches the PDF
      const cleaned = await cleanSignatureBlob(file);
      const { error: upErr } = await supabase.storage
        .from("signatures")
        .upload(path, cleaned, { upsert: true, contentType: "image/png" });
      if (upErr) throw upErr;

      // Ensure professional record exists, then save path
      const { data: existing } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await supabase
          .from("professionals")
          .update({ signature_image_url: path })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        // No professional row yet — create a minimal one
        const { error } = await supabase.from("professionals").insert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || user.email || "Profissional",
          crefito: "0-X",
          city: "",
          state: "",
          email: user.email || null,
          active: false,
          approved: false,
          signature_image_url: path,
        } as any);
        if (error) throw error;
      }
      toast({ title: t.saved });
      setDrawMode(false);
      await loadCurrent();
    } catch (e: any) {
      toast({ title: t.upload_error, description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user?.id || !path) return;
    setRemoving(true);
    try {
      await supabase.storage.from("signatures").remove([path]);
      await supabase
        .from("professionals")
        .update({ signature_image_url: null })
        .eq("user_id", user.id);
      toast({ title: t.removed });
      await loadCurrent();
    } finally {
      setRemoving(false);
    }
  };

  const onAutoSignChange = (v: boolean) => {
    setAutoSign(v);
    setAutoSignEnabled(v);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Pen className="h-4 w-4" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg border bg-muted/30 p-4 min-h-[120px] flex items-center justify-center">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : signedUrl ? (
            <img
              src={signedUrl}
              alt="signature preview"
              className="max-h-24 max-w-full object-contain"
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t.none}</p>
          )}
        </div>

        {drawMode ? (
          <SignaturePad isPt={isPt} saving={uploading} onSave={handleFile} onCancel={() => setDrawMode(false)} />
        ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setDrawMode(true)} disabled={uploading} className="gap-2">
            <Pen className="h-4 w-4" />
            {t.draw}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {hasSignature ? t.replace : t.upload}
          </Button>
          {hasSignature && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={removing}
              className="gap-2 text-destructive"
            >
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t.remove}
            </Button>
          )}
        </div>
        )}

        <div className="flex items-start justify-between gap-4 pt-2 border-t">
          <div>
            <Label className="text-sm font-medium">{t.autosign_label}</Label>
            <p className="text-xs text-muted-foreground mt-1">{t.autosign_desc}</p>
          </div>
          <Switch checked={autoSign} onCheckedChange={onAutoSignChange} />
        </div>
      </CardContent>
    </Card>
  );
};

export default SignatureManager;
