import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, UserPlus, Instagram, Link2, Copy, Check, Camera, X, Plus, ShieldCheck, GraduationCap, Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { formatCpf } from "@/utils/masks";
import { isFallbackVip } from "@/lib/vipEmails";
import { hasRealCrefito, isPlaceholderCrefito } from "@/lib/crefito";


import logoAlivia from "@/assets/logo-alivia.png";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const SPECIALTIES = [
  "ortopedia", "esportiva", "neurologica", "respiratoria",
  "pediatrica", "geriatrica", "oncologica", "aquatica",
  "uroginecologica", "reumatologica",
];

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

const ProfessionalRegister = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [showCustomSpecialty, setShowCustomSpecialty] = useState(false);
  const [customSpecialtyInput, setCustomSpecialtyInput] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    crefito: "",
    cpf: "",
    social_media: "",
    specialties: [] as string[],
    city: "",
    state: "",
    bio: "",
    phone: "",
    email: "",
    clinic_name: "",
    clinic_address: "",
  });
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Alivia Acadêmico (student mode) — secondary entry point right in the registration modal
  const [isStudent, setIsStudent] = useState(false);
  const [studentInstitution, setStudentInstitution] = useState("");
  const [studentPeriod, setStudentPeriod] = useState("");
  const [isVip, setIsVip] = useState(false);
  // Lock when the existing professional already has a REAL CREFITO and is not
  // VIP. Placeholder CREFITOs (`NNNNNN-X`, auto-created for admin partners)
  // never lock the academic mode.
  const studentLocked = hasRealCrefito(existing?.crefito) && !isVip;


  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("professionals" as any).select("*").eq("user_id", user.id).maybeSingle() as any,
      user.email
        ? (supabase.from("vip_users" as any) as any).select("id").eq("email", user.email.toLowerCase()).maybeSingle()
        : Promise.resolve({ data: null }),
    ]).then(([profRes, vipRes]: any[]) => {
      const data = profRes?.data;
      setIsVip(!!vipRes?.data || isFallbackVip(user.email));
      let forceProfessional = false;
      let forceStudent = false;
      try { forceProfessional = sessionStorage.getItem("forceProfessionalMode") === "1"; } catch {}
      try { forceStudent = sessionStorage.getItem("forceStudentMode") === "1"; } catch {}
      if (data) {
        setExisting(data);
        setForm({
          full_name: data.full_name || "",
          crefito: isPlaceholderCrefito(data.crefito) ? "" : (data.crefito || ""),
          cpf: data.cpf ? formatCpf(data.cpf) : "",
          social_media: data.social_media || "",
          specialties: data.specialties || [],
          city: data.city || "",
          state: data.state || "",
          bio: data.bio || "",
          phone: data.phone || "",
          email: data.email || "",
          clinic_name: data.clinic_name || "",
          clinic_address: data.clinic_address || "",
        });
        if (data.terms_accepted_at) setTermsAccepted(true);
        if (data.profile_photo_url) setPhotoPreview(data.profile_photo_url);
        if (data.logo_url) setLogoPreview(data.logo_url);
        const hasCrefito = hasRealCrefito(data.crefito);
        if (forceStudent && !hasCrefito) {
          // Veio do card "Estudante" no /auth → ativa o modo acadêmico por padrão
          // (somente quando ainda não há CREFITO cadastrado, para respeitar a trava).
          setIsStudent(true);
          setStudentInstitution(data.student_institution || "");
          setStudentPeriod(data.student_period || "");
          try { sessionStorage.removeItem("forceStudentMode"); } catch {}
        } else if (data.is_student && !forceProfessional) {
          setIsStudent(true);
          setStudentInstitution(data.student_institution || "");
          setStudentPeriod(data.student_period || "");
        } else if (forceProfessional) {
          // User came from "Cadastrar CREFITO" intending to switch to professional mode.
          setIsStudent(false);
          try { sessionStorage.removeItem("forceProfessionalMode"); } catch {}
        }
      } else if (forceStudent) {
        // Novo cadastro vindo do card "Estudante" — abre o formulário já com
        // o toggle acadêmico ligado.
        setIsStudent(true);
        try { sessionStorage.removeItem("forceStudentMode"); } catch {}
      }
      setLoadingProfile(false);
    });
  }, [user]);

  const toggleSpecialty = (s: string) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter((x) => x !== s)
        : [...prev.specialties, s],
    }));
  };

  const getCroppedImg = (imageSrc: string, pixelCrop: Area, size: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(
          img,
          pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
          0, 0, size, size
        );
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
          "image/jpeg",
          0.85
        );
      };
      img.onerror = reject;
      img.src = imageSrc;
    });
  };

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande (máx. 5MB)", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setRawImageUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropModalOpen(true);
  };

  const handleCropConfirm = async () => {
    if (!rawImageUrl || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(rawImageUrl, croppedAreaPixels, 400);
      const croppedFile = new File([croppedBlob], "profile.jpg", { type: "image/jpeg" });
      setPhotoFile(croppedFile);
      setPhotoPreview(URL.createObjectURL(croppedBlob));
    } catch {
      // fallback — shouldn't happen
    }
    setCropModalOpen(false);
    setRawImageUrl(null);
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile || !user) return null;
    setUploadingPhoto(true);
    const path = `${user.id}/profile.jpg`;
    const { error } = await supabase.storage
      .from("professional-photos")
      .upload(path, photoFile, { upsert: true, contentType: "image/jpeg" });
    setUploadingPhoto(false);
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    const { data: urlData } = supabase.storage
      .from("professional-photos")
      .getPublicUrl(path);
    return `${urlData.publicUrl}?t=${Date.now()}`;
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Imagem muito grande (máx. 5MB)", variant: "destructive" });
      return;
    }
    // Resize to max 200x200 on client
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxSize = 200;
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const resizedFile = new File([blob], "logo.png", { type: "image/png" });
        setLogoFile(resizedFile);
        setLogoPreview(URL.createObjectURL(blob));
      }, "image/png");
    };
    img.src = url;
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user) return null;
    const path = `logos/${user.id}/logo.png`;
    const { error } = await supabase.storage
      .from("professional-photos")
      .upload(path, logoFile, { upsert: true, contentType: "image/png" });
    if (error) {
      console.error("Logo upload error:", error);
      return null;
    }
    const { data: urlData } = supabase.storage
      .from("professional-photos")
      .getPublicUrl(path);
    return `${urlData.publicUrl}?t=${Date.now()}`;
  };

  const CREFITO_REGEX = /^\d{1,6}-[A-Z]$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.full_name || !form.city || !form.state) {
      toast({ title: t("prof.required_fields"), variant: "destructive" });
      return;
    }

    // ───────── Alivia Acadêmico branch ─────────
    // Student mode skips CREFITO / CPF / social_media validations.
    if (isStudent) {
      if (!studentInstitution.trim() || !studentPeriod.trim()) {
        toast({
          title: "Dados acadêmicos obrigatórios",
          description: "Informe a instituição e o período atual.",
          variant: "destructive",
        });
        return;
      }
      if (!termsAccepted) {
        toast({
          title: "Confirmação obrigatória",
          description: "Você precisa confirmar que os dados informados são verídicos.",
          variant: "destructive",
        });
        return;
      }
      setSaving(true);
      try {
        let photoUrl: string | null = null;
        if (photoFile) photoUrl = await uploadPhoto();
        let logoUrl: string | null = null;
        if (logoFile) logoUrl = await uploadLogo();

        // VIPs keep their CREFITO when toggling; non-students inserting fresh have crefito=null.
        const studentPayload: any = {
          full_name: form.full_name.trim(),
          city: form.city.trim(),
          state: form.state,
          bio: form.bio,
          phone: form.phone,
          email: form.email || user.email || null,
          social_media: form.social_media || null,
          specialties: form.specialties,
          clinic_name: form.clinic_name,
          clinic_address: form.clinic_address,
          user_id: user.id,
          is_student: true,
          student_institution: studentInstitution.trim(),
          student_period: studentPeriod.trim(),
          approved: false, // students never appear in the marketplace
          active: true,
          terms_accepted_at: new Date().toISOString(),
        };
        if (photoUrl) studentPayload.profile_photo_url = photoUrl;
        if (logoUrl) studentPayload.logo_url = logoUrl;
        // First-time student insert: CREFITO must be null so trigger skips validation.
        if (!existing) studentPayload.crefito = null;

        if (existing) {
          await (supabase.from("professionals" as any) as any).update(studentPayload).eq("id", existing.id);
        } else {
          await (supabase.from("professionals" as any) as any).insert(studentPayload);
        }
        // Clear the "skipped" flag if it was set
        try {
          await (supabase as any).from("profiles").update({ professional_register_skipped: false }).eq("user_id", user.id);
        } catch { /* noop */ }
        toast({ title: "Cadastro acadêmico salvo!", description: "O selo acadêmico está ativo. Para usar as ferramentas, assine o PRO." });
        navigate("/dashboard?tab=professional&subscribe=true");
      } catch (err: any) {
        toast({ title: t("prof.error"), description: err?.message, variant: "destructive" });
      } finally {
        setSaving(false);
      }
      return;
    }

    // ───────── Standard professional branch (unchanged) ─────────
    const normalizedCrefito = form.crefito.trim().toUpperCase();
    if (!normalizedCrefito) {
      toast({ title: t("prof.crefito_required"), variant: "destructive" });
      return;
    }
    if (!CREFITO_REGEX.test(normalizedCrefito)) {
      toast({ title: t("prof.crefito_invalid_format"), variant: "destructive" });
      return;
    }
    if (!form.social_media.trim()) {
      toast({ title: t("prof.social_media_required"), variant: "destructive" });
      return;
    }
    const cpfDigits = form.cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      toast({ title: "CPF inválido", description: "Digite os 11 dígitos do CPF.", variant: "destructive" });
      return;
    }
    if (!termsAccepted) {
      toast({
        title: "Confirmação obrigatória",
        description: "Você precisa confirmar que os dados informados são verídicos.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const { data: dupCheck } = await (supabase.from("professionals" as any) as any)
        .select("id, user_id")
        .eq("crefito", normalizedCrefito)
        .maybeSingle();
      if (dupCheck && dupCheck.user_id !== user.id) {
        toast({ title: t("prof.crefito_already_registered"), variant: "destructive" });
        setSaving(false);
        return;
      }
      const { data: cpfDup } = await (supabase.from("professionals" as any) as any)
        .select("id, user_id")
        .eq("cpf", cpfDigits)
        .maybeSingle();
      if (cpfDup && cpfDup.user_id !== user.id) {
        toast({
          title: "CPF já cadastrado",
          description: "Este CPF já está vinculado a outra conta profissional.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
      let photoUrl: string | null = null;
      if (photoFile) photoUrl = await uploadPhoto();
      let logoUrl: string | null = null;
      if (logoFile) logoUrl = await uploadLogo();

      const payload: any = {
        ...form,
        crefito: normalizedCrefito,
        cpf: cpfDigits,
        user_id: user.id,
        approved: true,
        is_student: false,
        active_profile_mode: "professional",
        student_institution: null,
        student_period: null,
        terms_accepted_at: new Date().toISOString(),
      };
      if (photoUrl) payload.profile_photo_url = photoUrl;
      if (logoUrl) payload.logo_url = logoUrl;

      if (existing) {
        await (supabase.from("professionals" as any) as any).update(payload).eq("id", existing.id);
        toast({ title: t("prof.saved") });
        navigate("/dashboard?tab=professional");
      } else {
        await (supabase.from("professionals" as any) as any).insert(payload);
        toast({ title: t("prof.saved") });
        navigate("/dashboard?tab=professional&subscribe=true");
      }
    } catch {
      toast({ title: t("prof.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
            <span className="text-xl font-bold text-foreground">Aliv.iA</span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            {t("diagnosis.back")}
          </Button>
        </div>
      </header>

      <main className="container max-w-2xl py-8 px-4 space-y-6">
        {/* Assessment Link Card for approved professionals */}
        {existing?.approved && (existing.subscription_status === "active" || existing.is_partner) && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                {t("prof.assessment_link_title")}
              </CardTitle>
              <CardDescription>{t("prof.assessment_link_desc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${getPublicOrigin()}/assessment/professional/${existing.id}`}
                  className="text-sm bg-muted/50 font-mono"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(`${getPublicOrigin()}/assessment/professional/${existing.id}`);
                    setLinkCopied(true);
                    toast({ title: t("prof.link_copied") });
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                >
                  {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {t("prof.copy_link")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className="rounded-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-2">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t("prof.register_title")}</CardTitle>
            <CardDescription>{t("prof.register_desc")}</CardDescription>
            {existing && (
              <Badge
                variant="outline"
                className={`mt-2 ${existing.approved
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-200"
                  : "bg-amber-500/10 text-amber-600 border-amber-200"}`}
              >
                {existing.approved ? t("prof.approved") : t("prof.pending_approval")}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ─────── Alivia Acadêmico toggle ─────── */}
              <div className={`rounded-xl border p-3 ${isStudent ? "bg-primary/5 border-primary/40" : "bg-muted/30 border-border"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="shrink-0 mt-0.5 rounded-full bg-primary/15 p-1.5">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">Sou estudante — Alivia Acadêmico</p>
                        {isVip && (
                          <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 gap-1">
                            <Sparkles className="h-3 w-3" /> VIP · alternância livre
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        Estudantes de fisioterapia sem CREFITO. Ativa o selo acadêmico; as ferramentas profissionais exigem assinatura PRO ativa.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isStudent}
                    onCheckedChange={setIsStudent}
                    disabled={studentLocked}
                    aria-label="Ativar modo acadêmico"
                  />
                </div>
                {studentLocked && (
                  <p className="mt-2 text-[11px] text-amber-700 leading-relaxed">
                    Sua conta já está cadastrada como fisioterapeuta formado (CREFITO informado). O modo Estudante não pode ser ativado.
                  </p>
                )}
              </div>

              {/* Student-only academic + essentials (movidos para cima para evitar confusão) */}
              {isStudent && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
                  <p className="text-[11px] uppercase tracking-wide text-primary font-semibold">
                    Dados obrigatórios — Acadêmico
                  </p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Instituição de ensino *</Label>
                    <Input value={studentInstitution} onChange={(e) => setStudentInstitution(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Período atual *</Label>
                    <Input value={studentPeriod} onChange={(e) => setStudentPeriod(e.target.value)} placeholder="Ex.: 5º período" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome completo *</Label>
                    <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cidade *</Label>
                      <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Estado (UF) *</Label>
                      <select
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                      >
                        <option value="">{t("prof.select_state")}</option>
                        {STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Photo Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-2 border-border">
                    <AvatarImage src={photoPreview || undefined} alt="Profile" />
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                      {form.full_name ? form.full_name.charAt(0).toUpperCase() : <Camera className="h-8 w-8" />}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera className="h-6 w-6 text-foreground" />
                  </button>
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm text-primary hover:underline"
                >
                  {photoPreview ? t("prof.change_photo") : t("prof.add_photo")}
                </button>
              </div>

              {/* Crop Modal */}
              <Dialog open={cropModalOpen} onOpenChange={(open) => {
                if (!open) { setCropModalOpen(false); setRawImageUrl(null); }
              }}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t("prof.crop_photo") || "Ajustar foto"}</DialogTitle>
                  </DialogHeader>
                  <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden">
                    {rawImageUrl && (
                      <Cropper
                        image={rawImageUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        cropShape="round"
                        showGrid={false}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-3 px-1">
                    <span className="text-xs text-muted-foreground shrink-0">Zoom</span>
                    <Slider
                      value={[zoom]}
                      min={1}
                      max={3}
                      step={0.05}
                      onValueChange={(v) => setZoom(v[0])}
                      className="flex-1"
                    />
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => { setCropModalOpen(false); setRawImageUrl(null); }}>
                      {t("diagnosis.back") || "Cancelar"}
                    </Button>
                    <Button onClick={handleCropConfirm}>
                      {t("prof.confirm_crop") || "Confirmar"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Logo Upload */}
              {!isStudent && (
                <>
                  <div className="flex flex-col items-center gap-3 pt-2 border-t border-border/40">
                    <Label className="text-sm font-medium text-foreground">{t("prof.logo_label") || "Logo da Clínica / Empresa"}</Label>
                    <div className="relative group">
                      <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/20 overflow-hidden">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-xs text-muted-foreground text-center px-1">Logo</span>
                        )}
                      </div>
                      {logoPreview && (
                        <button
                          type="button"
                          onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                          className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={handleLogoSelect}
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="text-sm text-primary hover:underline"
                    >
                      {logoPreview ? "Alterar logo" : "Adicionar logo profissional"}
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("prof.full_name")} *</Label>
                      <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("prof.crefito")} *</Label>
                      <Input
                        value={form.crefito}
                        onChange={(e) => setForm({ ...form, crefito: e.target.value.toUpperCase() })}
                        placeholder="000000-F"
                        maxLength={8}
                        required
                      />
                      <p className="text-xs text-muted-foreground">{t("prof.crefito_invalid_format")}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>CPF *</Label>
                    <Input
                      value={form.cpf}
                      onChange={(e) => setForm({ ...form, cpf: formatCpf(e.target.value) })}
                      placeholder="000.000.000-00"
                      inputMode="numeric"
                      maxLength={14}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Usado apenas para validar sua identidade e evitar cadastros duplicados. Não é exibido publicamente.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Instagram className="h-4 w-4 text-muted-foreground" />
                      {t("prof.social_media")} *
                    </Label>
                    <Input
                      value={form.social_media}
                      onChange={(e) => setForm({ ...form, social_media: e.target.value })}
                      placeholder="@seu_perfil"
                      required
                    />
                    <p className="text-xs text-muted-foreground">{t("prof.social_media_hint")}</p>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("prof.specialties")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {SPECIALTIES.map((s) => (
                        <Badge
                          key={s}
                          variant={form.specialties.includes(s) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleSpecialty(s)}
                        >
                          {t(`prof.spec.${s}`)}
                        </Badge>
                      ))}
                      <Badge
                        variant="outline"
                        className="cursor-pointer gap-1"
                        onClick={() => setShowCustomSpecialty(true)}
                      >
                        <Plus className="h-3 w-3" />
                        {t("prof.spec.other")}
                      </Badge>
                    </div>
                    {showCustomSpecialty && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={customSpecialtyInput}
                          onChange={(e) => setCustomSpecialtyInput(e.target.value)}
                          placeholder={t("prof.spec.other_placeholder")}
                          className="max-w-xs"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const val = customSpecialtyInput.trim();
                              if (val && !form.specialties.includes(val)) {
                                setForm({ ...form, specialties: [...form.specialties, val] });
                              }
                              setCustomSpecialtyInput("");
                              setShowCustomSpecialty(false);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const val = customSpecialtyInput.trim();
                            if (val && !form.specialties.includes(val)) {
                              setForm({ ...form, specialties: [...form.specialties, val] });
                            }
                            setCustomSpecialtyInput("");
                            setShowCustomSpecialty(false);
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {form.specialties.filter(s => !SPECIALTIES.includes(s)).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {form.specialties.filter(s => !SPECIALTIES.includes(s)).map(s => (
                          <Badge key={s} variant="default" className="cursor-pointer gap-1" onClick={() => toggleSpecialty(s)}>
                            {s} <X className="h-3 w-3" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("prof.city")} *</Label>
                      <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("prof.state")} *</Label>
                      <select
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        required
                      >
                        <option value="">{t("prof.select_state")}</option>
                        {STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("prof.bio")}</Label>
                    <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("prof.phone")}</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("prof.email_prof")}</Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>{t("prof.clinic_name")}</Label>
                      <Input value={form.clinic_name} onChange={(e) => setForm({ ...form, clinic_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t("prof.clinic_address")}</Label>
                      <Input value={form.clinic_address} onChange={(e) => setForm({ ...form, clinic_address: e.target.value })} />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-3">
                <Checkbox
                  id="terms-truth-pro"
                  checked={termsAccepted}
                  onCheckedChange={(c) => setTermsAccepted(c === true)}
                  className="mt-0.5"
                />
                <label htmlFor="terms-truth-pro" className="text-xs text-muted-foreground leading-relaxed cursor-pointer flex-1">
                  <ShieldCheck className="inline h-3.5 w-3.5 text-primary mr-1 -mt-0.5" />
                  {isStudent
                    ? "Declaro, sob minha responsabilidade, que sou estudante regularmente matriculado(a) na instituição informada e que os dados acima são verídicos. Estou ciente de que informações falsas podem levar à suspensão imediata da conta."
                    : "Declaro, sob minha responsabilidade, que todos os dados informados (nome, CREFITO e CPF) são verídicos e correspondem ao meu cadastro profissional ativo. Estou ciente de que informações falsas podem levar à suspensão imediata da conta."}
                </label>
              </div>

              <Button type="submit" className="w-full rounded-xl py-5" disabled={saving || !termsAccepted}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isStudent
                  ? (existing ? "Atualizar cadastro acadêmico" : "Criar cadastro acadêmico")
                  : (existing ? t("prof.update") : t("prof.register"))}
              </Button>
              {!existing && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-xl"
                  disabled={saving}
                  onClick={async () => {
                    if (!user) return;
                    try {
                      await (supabase as any)
                        .from("profiles")
                        .update({ professional_register_skipped: true })
                        .eq("user_id", user.id);
                      try { sessionStorage.removeItem("signupOrigin"); } catch {}
                    } catch {}
                    toast({
                      title: "Você pode concluir depois",
                      description: "Sem o cadastro PRO, você não aparece na vitrine nem acessa o painel profissional.",
                    });
                    navigate("/dashboard", { replace: true });
                  }}
                >
                  Pular por agora
                </Button>
              )}
              {existing?.registration_pending && (
                <Button type="button" variant="ghost" className="w-full rounded-xl" disabled={saving}
                  onClick={() => navigate("/dashboard?tab=professional", { replace: true })}>
                  Concluir depois e ir ao painel PRO
                </Button>
              )}
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProfessionalRegister;
