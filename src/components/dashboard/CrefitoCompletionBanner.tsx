import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ShieldAlert, Loader2 } from "lucide-react";
import { hasRealCrefito } from "@/lib/crefito";


/**
 * Shown to clinic therapists who don't yet have a CREFITO registered.
 * Without a CREFITO, generated PDFs sign under the clinic owner instead of the
 * therapist. This banner lets them complete it inline.
 */
const CrefitoCompletionBanner = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const lang = language as "pt" | "en" | "es";

  const [needsCrefito, setNeedsCrefito] = useState(false);
  const [open, setOpen] = useState(false);
  const [crefito, setCrefito] = useState("");
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasProfRecord, setHasProfRecord] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("professionals")
        .select("id, full_name, crefito, is_student, active_profile_mode")
        .eq("user_id", user.id)
        .maybeSingle();
      // Hide for students operating in academic mode (don't need CREFITO).
      const activeMode = (data as any)?.active_profile_mode
        ?? ((data as any)?.is_student ? "student" : "professional");
      if (activeMode === "student") {
        setNeedsCrefito(false);
        return;
      }
      // Placeholder CREFITOs (`NNNNNN-X`) count as "missing": they are only
      // auto-generated to create partner accounts, never a real registration.
      if (!data || !hasRealCrefito(data.crefito)) {

        setNeedsCrefito(true);
        setHasProfRecord(!!data);
        if (data?.full_name) setFullName(data.full_name);
        else {
          const { data: prof } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", user.id)
            .maybeSingle();
          if (prof?.full_name) setFullName(prof.full_name);
        }
      }
    })();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    if (!/^\d{1,6}-[A-Z]$/.test(crefito.trim().toUpperCase())) {
      toast({
        title: lang === "pt" ? "Formato inválido" : "Invalid format",
        description: "123456-F",
        variant: "destructive",
      });
      return;
    }
    if (!fullName.trim()) {
      toast({ title: lang === "pt" ? "Nome obrigatório" : "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const formattedCrefito = crefito.trim().toUpperCase();
      // Explicitly graduate from academic mode (the DB trigger
      // `auto_graduate_on_crefito_trg` enforces the same change as a safety net
      // for any other entry point).
      if (hasProfRecord) {
        const { error } = await supabase
          .from("professionals")
          .update({
            crefito: formattedCrefito,
            full_name: fullName.trim(),
            is_student: false,
            active_profile_mode: "professional",
            student_institution: null,
            student_period: null,
            approved: true,
          } as any)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("professionals").insert({
          user_id: user.id,
          full_name: fullName.trim(),
          crefito: formattedCrefito,
          city: "",
          state: "",
          email: user.email || null,
          active: true,
          approved: true,
          is_student: false,
          active_profile_mode: "professional",
        } as any);
        if (error) throw error;
      }
      // Refresh PRO subscription cache so the dashboard unlocks the
      // professional tools immediately, without requiring a re-login.
      try {
        await supabase.functions.invoke("check-pro-subscription");
      } catch {}
      toast({
        title: lang === "pt" ? "CREFITO salvo! Modo profissional ativado." : "CREFITO saved! Professional mode active.",
        description: lang === "pt"
          ? "Sua assinatura PRO foi mantida — sem nova cobrança."
          : "Your PRO subscription was kept — no new charge.",
      });
      setNeedsCrefito(false);
      setOpen(false);
      // Soft reload so any cached "student" UI state across the dashboard
      // (badges, gates, marketplace visibility) refreshes immediately.
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast({
        title: lang === "pt" ? "Erro ao salvar" : "Save error",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!needsCrefito) return null;

  return (
    <>
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="py-3 px-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-amber-700">
                {lang === "pt"
                  ? "Cadastre seu CREFITO"
                  : "Register your CREFITO"}
              </span>{" "}
              {lang === "pt"
                ? "para que seus relatórios sejam assinados em seu nome."
                : "so reports are signed under your name."}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="shrink-0">
            {lang === "pt" ? "Cadastrar" : "Add"}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {lang === "pt" ? "Responsável Técnico" : "Technical Responsible"}
            </DialogTitle>
            <DialogDescription>
              {lang === "pt"
                ? "Esses dados aparecem no rodapé dos relatórios PDF que você gerar."
                : "These details appear in the footer of PDF reports you generate."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground">
                {lang === "pt" ? "Nome completo" : "Full name"}
              </label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">CREFITO</label>
              <Input
                value={crefito}
                placeholder="123456-F"
                onChange={(e) => setCrefito(e.target.value.toUpperCase())}
                maxLength={8}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {lang === "pt" ? "Formato: 123456-F" : "Format: 123456-F"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              {lang === "pt" ? "Cancelar" : "Cancel"}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {lang === "pt" ? "Salvar" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CrefitoCompletionBanner;
