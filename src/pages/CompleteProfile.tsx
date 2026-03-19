import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck } from "lucide-react";
import logoAlivia from "@/assets/logo-alivia.png";

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

const CREFITO_REGEX = /^\d{1,6}-[A-Z]$/;

const CompleteProfile = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [professional, setProfessional] = useState<any>(null);

  const [form, setForm] = useState({
    full_name: "",
    crefito: "",
    city: "",
    state: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (supabase.from("professionals" as any) as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!data) {
          navigate("/dashboard");
          return;
        }
        // If profile is already complete, redirect
        if (data.crefito !== "000000-X" && data.city !== "A definir") {
          navigate("/dashboard");
          return;
        }
        setProfessional(data);
        setForm({
          full_name: data.full_name === data.email?.split("@")[0] ? "" : data.full_name || "",
          crefito: data.crefito === "000000-X" ? "" : data.crefito || "",
          city: data.city === "A definir" ? "" : data.city || "",
          state: data.state === "XX" ? "" : data.state || "",
        });
        setLoading(false);
      });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !professional) return;

    if (!form.full_name.trim() || !form.city.trim() || !form.state) {
      toast({ title: t("prof.required_fields"), variant: "destructive" });
      return;
    }

    const normalizedCrefito = form.crefito.trim().toUpperCase();
    if (!CREFITO_REGEX.test(normalizedCrefito)) {
      toast({ title: t("prof.crefito_invalid_format"), variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Check duplicate CREFITO
      const { data: dupCheck } = await (supabase.from("professionals" as any) as any)
        .select("id, user_id")
        .eq("crefito", normalizedCrefito)
        .maybeSingle();
      if (dupCheck && dupCheck.user_id !== user.id) {
        toast({ title: t("prof.crefito_already_registered"), variant: "destructive" });
        setSaving(false);
        return;
      }

      await (supabase.from("professionals" as any) as any)
        .update({
          full_name: form.full_name.trim(),
          crefito: normalizedCrefito,
          city: form.city.trim(),
          state: form.state,
        })
        .eq("id", professional.id);

      toast({ title: t("prof.saved") });
      navigate("/dashboard");
    } catch {
      toast({ title: t("prof.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="text-center">
          <img src={logoAlivia} alt="Aliv.iA" className="h-10 mx-auto mb-2" />
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-2">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{t("prof.complete_profile_title")}</CardTitle>
          <CardDescription>{t("prof.complete_profile_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("prof.full_name")} *</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
              />
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

            <div className="space-y-2">
              <Label>{t("prof.city")} *</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                required
              />
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

            <Button type="submit" className="w-full rounded-xl py-5" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t("prof.complete_profile_btn")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompleteProfile;
