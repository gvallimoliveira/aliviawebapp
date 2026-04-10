import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Settings, Upload, Trash2, Building2 } from "lucide-react";

const MAX_SIZE = 512 * 1024; // 512 KB

const ClinicSettingsCard = () => {
  const { activeClinic, refetch } = useClinic();
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";

  const [clinicName, setClinicName] = useState(activeClinic?.clinic_name || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canEdit = activeClinic?.role === "owner" || activeClinic?.role === "secretary";

  if (!activeClinic || !canEdit) return null;

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: lang === "pt" ? "Formato inválido" : "Invalid format", description: "JPG, PNG, WEBP", variant: "destructive" });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: lang === "pt" ? "Arquivo muito grande" : "File too large", description: "Max 512KB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `clinic-logos/${activeClinic.clinic_id}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("professional-photos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("professional-photos")
        .getPublicUrl(path);

      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateErr } = await supabase
        .from("clinics")
        .update({ logo_url: logoUrl })
        .eq("id", activeClinic.clinic_id);

      if (updateErr) throw updateErr;

      toast({ title: lang === "pt" ? "Logo atualizada!" : "Logo updated!" });
      await refetch();
    } catch (err: any) {
      toast({ title: lang === "pt" ? "Erro ao enviar logo" : "Upload error", description: err.message, variant: "destructive" });
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleRemoveLogo = async () => {
    if (!confirm(lang === "pt" ? "Remover a logo da clínica?" : "Remove clinic logo?")) return;
    setUploading(true);
    try {
      const { error } = await supabase
        .from("clinics")
        .update({ logo_url: null })
        .eq("id", activeClinic.clinic_id);
      if (error) throw error;
      toast({ title: lang === "pt" ? "Logo removida" : "Logo removed" });
      await refetch();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleSaveName = async () => {
    if (!clinicName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clinics")
        .update({ name: clinicName.trim() })
        .eq("id", activeClinic.clinic_id);
      if (error) throw error;
      toast({ title: lang === "pt" ? "Nome atualizado!" : "Name updated!" });
      await refetch();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings className="h-5 w-5" />
          {lang === "pt" ? "Configurações da Clínica" : lang === "es" ? "Configuración de la Clínica" : "Clinic Settings"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Logo */}
        <div className="space-y-3">
          <Label className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4" />
            {lang === "pt" ? "Logo da Clínica" : "Clinic Logo"}
          </Label>
          <div className="flex items-center gap-4">
            {activeClinic.logo_url ? (
              <img
                src={activeClinic.logo_url}
                alt="Logo"
                className="h-16 w-16 rounded-lg object-contain border border-border bg-background"
              />
            ) : (
              <div className="h-16 w-16 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-muted-foreground/40" />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading
                  ? (lang === "pt" ? "Enviando..." : "Uploading...")
                  : activeClinic.logo_url
                    ? (lang === "pt" ? "Trocar logo" : "Change logo")
                    : (lang === "pt" ? "Adicionar logo" : "Add logo")}
              </Button>
              {activeClinic.logo_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  disabled={uploading}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {lang === "pt" ? "Remover" : "Remove"}
                </Button>
              )}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <p className="text-xs text-muted-foreground">
            {lang === "pt"
              ? "JPG, PNG ou WEBP. Máx. 512KB. Aparecerá nos relatórios e no painel."
              : "JPG, PNG or WEBP. Max 512KB. Will appear in reports and dashboard."}
          </p>
        </div>

        {/* Clinic Name */}
        <div className="space-y-2">
          <Label>{lang === "pt" ? "Nome da Clínica / Consultório" : "Clinic Name"}</Label>
          <div className="flex gap-2">
            <Input
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder={lang === "pt" ? "Ex: Clínica FisioVida" : "e.g. PhysioLife Clinic"}
              maxLength={100}
            />
            <Button
              onClick={handleSaveName}
              disabled={saving || !clinicName.trim() || clinicName.trim() === activeClinic.clinic_name}
              size="sm"
              className="shrink-0"
            >
              {saving ? "..." : (lang === "pt" ? "Salvar" : "Save")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClinicSettingsCard;
