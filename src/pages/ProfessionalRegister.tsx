import { useEffect, useState, useRef } from "react";
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
import { ArrowLeft, Loader2, UserPlus, Instagram, Link2, Copy, Check, Camera, X } from "lucide-react";
import logoAlivia from "@/assets/logo-alivia.png";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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

  const [form, setForm] = useState({
    full_name: "",
    crefito: "",
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

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("professionals" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setExisting(data);
          setForm({
            full_name: data.full_name || "",
            crefito: data.crefito || "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.full_name || !form.city || !form.state) {
      toast({ title: t("prof.required_fields"), variant: "destructive" });
      return;
    }
    if (!form.crefito.trim()) {
      toast({ title: t("prof.crefito_required"), variant: "destructive" });
      return;
    }
    if (!form.social_media.trim()) {
      toast({ title: t("prof.social_media_required"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, user_id: user.id };
      if (existing) {
        await (supabase.from("professionals" as any) as any).update(payload).eq("id", existing.id);
      } else {
        await (supabase.from("professionals" as any) as any).insert(payload);
      }
      toast({ title: existing ? t("prof.saved") : t("prof.submitted_for_review") });
      if (!existing) {
        // Re-fetch to show status badge
        const { data: newData } = await (supabase.from("professionals" as any) as any)
          .select("*").eq("user_id", user.id).maybeSingle();
        if (newData) setExisting(newData);
      } else {
        navigate("/dashboard");
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
                  value={`${window.location.origin}/assessment/professional/${existing.id}`}
                  className="text-sm bg-muted/50 font-mono"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/assessment/professional/${existing.id}`);
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("prof.full_name")} *</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>{t("prof.crefito")} *</Label>
                  <Input value={form.crefito} onChange={(e) => setForm({ ...form, crefito: e.target.value })} required />
                </div>
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
                </div>
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

              <Button type="submit" className="w-full rounded-xl py-5" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {existing ? t("prof.update") : t("prof.register")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProfessionalRegister;
