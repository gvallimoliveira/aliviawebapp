import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Settings, Upload, Trash2, Building2, Phone, MapPin, Clock, CalendarDays, Palette } from "lucide-react";

const MAX_SIZE = 512 * 1024;

const DAY_LABELS: Record<string, string[]> = {
  pt: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  es: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
};

const BRAND_COLORS = [
  { value: null, label: "Padrão", hex: "hsl(168 55% 38%)" },
  { value: "#eaff00", label: "Amarelo Neon", hex: "#eaff00" },
  { value: "#facc15", label: "Marca-texto", hex: "#facc15" },
  { value: "#2563eb", label: "Azul", hex: "#2563eb" },
  { value: "#059669", label: "Verde", hex: "#059669" },
  { value: "#7c3aed", label: "Roxo", hex: "#7c3aed" },
  { value: "#dc2626", label: "Vermelho", hex: "#dc2626" },
  { value: "#d97706", label: "Âmbar", hex: "#d97706" },
  { value: "#0891b2", label: "Ciano", hex: "#0891b2" },
  { value: "#be185d", label: "Rosa", hex: "#be185d" },
];

const ClinicSettingsCard = () => {
  const { activeClinic, refetch, canManageClinic } = useClinic();
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";

  const [clinicName, setClinicName] = useState(activeClinic?.clinic_name || "");
  const [phone, setPhone] = useState(activeClinic?.phone || "");
  const [address, setAddress] = useState(activeClinic?.address || "");
  const [hoursStart, setHoursStart] = useState(activeClinic?.operating_hours_start || "08:00");
  const [hoursEnd, setHoursEnd] = useState(activeClinic?.operating_hours_end || "18:00");
  const [satEnabled, setSatEnabled] = useState<boolean>(
    !!(activeClinic?.saturday_hours_start && activeClinic?.saturday_hours_end)
  );
  const [satStart, setSatStart] = useState(activeClinic?.saturday_hours_start || "08:00");
  const [satEnd, setSatEnd] = useState(activeClinic?.saturday_hours_end || "12:00");
  const [workingDays, setWorkingDays] = useState<number[]>(activeClinic?.working_days || [1, 2, 3, 4, 5]);
  const [rooms, setRooms] = useState<string>(activeClinic?.rooms_count ? String(activeClinic.rooms_count) : "");
  const [brandColor, setBrandColor] = useState<string | null>(activeClinic?.brand_color || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canEdit = canManageClinic;

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

      const { data: urlData } = supabase.storage.from("professional-photos").getPublicUrl(path);
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
      const { error } = await supabase.from("clinics").update({ logo_url: null }).eq("id", activeClinic.clinic_id);
      if (error) throw error;
      toast({ title: lang === "pt" ? "Logo removida" : "Logo removed" });
      await refetch();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const toggleDay = (day: number) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const arraysEqual = (a: number[], b: number[]) =>
    a.length === b.length && a.every((v, i) => v === b[i]);

  const hasChanges =
    clinicName.trim() !== (activeClinic.clinic_name || "") ||
    phone.trim() !== (activeClinic.phone || "") ||
    address.trim() !== (activeClinic.address || "") ||
    hoursStart !== (activeClinic.operating_hours_start || "08:00") ||
    hoursEnd !== (activeClinic.operating_hours_end || "18:00") ||
    (satEnabled ? satStart : null) !== (activeClinic.saturday_hours_start || null) ||
    (satEnabled ? satEnd : null) !== (activeClinic.saturday_hours_end || null) ||
    !arraysEqual(workingDays, activeClinic.working_days || [1, 2, 3, 4, 5]) ||
    (rooms ? Number(rooms) : null) !== (activeClinic.rooms_count ?? null) ||
    brandColor !== (activeClinic.brand_color || null);

  const handleSave = async () => {
    if (!clinicName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("clinics")
        .update({
          name: clinicName.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          operating_hours_start: hoursStart,
          operating_hours_end: hoursEnd,
          saturday_hours_start: satEnabled ? satStart : null,
          saturday_hours_end: satEnabled ? satEnd : null,
          working_days: workingDays,
          rooms_count: rooms ? Number(rooms) : null,
          brand_color: brandColor,
        } as any)
        .eq("id", activeClinic.clinic_id);
      if (error) throw error;
      toast({ title: lang === "pt" ? "Dados atualizados!" : "Settings saved!" });
      await refetch();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const dayLabels = DAY_LABELS[lang] || DAY_LABELS.pt;

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
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1.5">
                <Upload className="h-3.5 w-3.5" />
                {uploading
                  ? (lang === "pt" ? "Enviando..." : "Uploading...")
                  : activeClinic.logo_url
                    ? (lang === "pt" ? "Trocar logo" : "Change logo")
                    : (lang === "pt" ? "Adicionar logo" : "Add logo")}
              </Button>
              {activeClinic.logo_url && (
                <Button variant="ghost" size="sm" onClick={handleRemoveLogo} disabled={uploading} className="gap-1.5 text-destructive hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                  {lang === "pt" ? "Remover" : "Remove"}
                </Button>
              )}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
          <p className="text-xs text-muted-foreground">
            {lang === "pt"
              ? "JPG, PNG ou WEBP. Máx. 512KB. Aparecerá nos relatórios e no painel."
              : "JPG, PNG or WEBP. Max 512KB. Will appear in reports and dashboard."}
          </p>
        </div>

        {/* Clinic Name */}
        <div className="space-y-2">
          <Label>{lang === "pt" ? "Nome da Clínica / Consultório" : "Clinic Name"}</Label>
          <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} placeholder={lang === "pt" ? "Ex: Clínica FisioVida" : "e.g. PhysioLife Clinic"} maxLength={100} />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Phone className="h-4 w-4" />
            {lang === "pt" ? "Telefone / WhatsApp" : "Phone / WhatsApp"}
          </Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" maxLength={20} />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {lang === "pt" ? "Endereço" : "Address"}
          </Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={lang === "pt" ? "Rua, número, bairro, cidade - UF" : "Full address"} maxLength={200} />
        </div>

        {/* Operating Hours */}
        <div className="space-y-2">
          <Label>{lang === "pt" ? "Macas / boxes de atendimento" : lang === "es" ? "Camillas / boxes de atención" : "Treatment rooms / boxes"}</Label>
          <Input
            type="number"
            min={1}
            value={rooms}
            onChange={(e) => setRooms(e.target.value)}
            placeholder={lang === "pt" ? "Ex: 3" : "E.g. 3"}
            className="w-28"
          />
          <p className="text-xs text-muted-foreground">
            {lang === "pt"
              ? "Usado no insight de gargalo de capacidade (macas × terapeutas)."
              : lang === "es"
                ? "Usado en el insight de cuello de botella de capacidad."
                : "Used by the capacity bottleneck insight (rooms × therapists)."}
          </p>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {lang === "pt" ? "Horário de Funcionamento" : lang === "es" ? "Horario de Atención" : "Operating Hours"}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={hoursStart}
              onChange={(e) => setHoursStart(e.target.value)}
              className="w-28"
            />
            <span className="text-muted-foreground text-sm">{lang === "pt" ? "às" : "to"}</span>
            <Input
              type="time"
              value={hoursEnd}
              onChange={(e) => setHoursEnd(e.target.value)}
              className="w-28"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {lang === "pt"
              ? "Aplica-se a segunda a sexta. Configure o sábado separadamente abaixo."
              : lang === "es"
                ? "Se aplica de lunes a viernes. Configure el sábado por separado."
                : "Applies Monday–Friday. Configure Saturday separately below."}
          </p>

          {/* Saturday-specific hours */}
          <div className="mt-3 rounded-md border border-border bg-muted/30 p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={satEnabled}
                onChange={(e) => setSatEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-sm font-medium">
                {lang === "pt"
                  ? "Sábado com horário diferente (meio expediente)"
                  : lang === "es"
                    ? "Sábado con horario distinto (medio día)"
                    : "Saturday has different hours (half day)"}
              </span>
            </label>
            {satEnabled && (
              <div className="flex items-center gap-2 pl-6">
                <Input
                  type="time"
                  value={satStart}
                  onChange={(e) => setSatStart(e.target.value)}
                  className="w-28"
                />
                <span className="text-muted-foreground text-sm">{lang === "pt" ? "às" : "to"}</span>
                <Input
                  type="time"
                  value={satEnd}
                  onChange={(e) => setSatEnd(e.target.value)}
                  className="w-28"
                />
              </div>
            )}
            {satEnabled && !workingDays.includes(6) && (
              <p className="text-xs text-amber-600 dark:text-amber-500 pl-6">
                {lang === "pt"
                  ? "⚠️ Ative o sábado nos dias de atendimento abaixo."
                  : "⚠️ Enable Saturday in working days below."}
              </p>
            )}
          </div>
        </div>

        {/* Working Days */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {lang === "pt" ? "Dias de Atendimento" : lang === "es" ? "Días de Atención" : "Working Days"}
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {dayLabels.map((label, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleDay(idx)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  workingDays.includes(idx)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Brand Color */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5">
            <Palette className="h-4 w-4" />
            {lang === "pt" ? "Cor do Link Institucional" : lang === "es" ? "Color del Enlace" : "Branding Color"}
          </Label>
          <p className="text-xs text-muted-foreground">
            {lang === "pt"
              ? "Personaliza a cor de destaque na página de avaliação da clínica."
              : "Customizes the accent color on the clinic assessment page."}
          </p>
          <div className="flex flex-wrap gap-2">
            {BRAND_COLORS.map((c) => (
              <button
                key={c.value ?? "default"}
                type="button"
                onClick={() => setBrandColor(c.value)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  brandColor === c.value
                    ? "border-foreground scale-110 ring-2 ring-ring ring-offset-2 ring-offset-background"
                    : "border-border hover:scale-105"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.label}
              />
            ))}
          </div>
          {brandColor && (
            <Badge variant="outline" className="text-xs gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: brandColor }} />
              {BRAND_COLORS.find((c) => c.value === brandColor)?.label}
            </Badge>
          )}
        </div>

        {/* Save button */}
        <Button onClick={handleSave} disabled={saving || !hasChanges || !clinicName.trim()} className="w-full">
          {saving ? (lang === "pt" ? "Salvando..." : "Saving...") : (lang === "pt" ? "Salvar alterações" : "Save changes")}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ClinicSettingsCard;
