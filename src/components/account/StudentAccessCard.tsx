import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Loader2, Lock, Sparkles } from "lucide-react";
import { isFallbackVip } from "@/lib/vipEmails";

/**
 * "Acesso Estudante" — toggle that turns a regular professional account into an
 * Alivia Acadêmico account: CREFITO becomes optional, marketplace listing is
 * disabled, and PDFs/links display the academic disclaimer.
 *
 * Lock rule: once a professional has registered with a CREFITO, the toggle is
 * disabled (cannot become a student) — UNLESS the e-mail is in `vip_users`,
 * in which case alternating is free for testing both modes without losing data.
 */
const StudentAccessCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isPt = language === "pt";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [hasProfRecord, setHasProfRecord] = useState(false);
  const [hasCrefito, setHasCrefito] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("");
  const [period, setPeriod] = useState("");

  const t = isPt
    ? {
        title: "Acesso Estudante — Alivia Acadêmico",
        desc: "Para estudantes de fisioterapia ainda sem CREFITO. Libera todas as ferramentas do plano profissional; relatórios e links exibem o selo acadêmico com seu nome.",
        toggle: "Sou estudante de fisioterapia",
        name: "Nome completo",
        institution: "Instituição de ensino",
        period: "Período atual",
        period_placeholder: "Ex.: 5º período",
        save: "Salvar",
        saved: "Acesso estudante atualizado!",
        disabled: "Acesso estudante desativado.",
        required: "Preencha nome, instituição e período.",
        error: "Erro ao salvar",
        graduate_title: "Concluiu o curso? Cadastre seu CREFITO",
        graduate_desc: "Para sair do modo Acadêmico você precisa cadastrar seu CREFITO no formulário profissional. Vamos te levar lá agora.",
        graduate_cta: "Cadastrar CREFITO agora",
        locked_title: "Conta profissional com CREFITO",
        locked_desc: "Sua conta já está cadastrada como fisioterapeuta formado. O modo Estudante não pode ser ativado.",
        vip_badge: "VIP · alternância livre",
        vip_desc: "Conta de teste: alternar não apaga seu CREFITO nem seus dados.",
      }
    : {
        title: "Student Access — Alivia Academic",
        desc: "For physiotherapy students without a CREFITO yet. Unlocks every professional tool; reports and links show the academic disclaimer with your name.",
        toggle: "I am a physiotherapy student",
        name: "Full name",
        institution: "Institution",
        period: "Current term",
        period_placeholder: "e.g. 5th term",
        save: "Save",
        saved: "Student access updated!",
        disabled: "Student access disabled.",
        required: "Fill name, institution and term.",
        error: "Save error",
        locked_title: "Professional account with CREFITO",
        locked_desc: "Your account is already registered as a licensed therapist. Student mode cannot be enabled.",
        vip_badge: "VIP · free toggle",
        vip_desc: "Test account: toggling does not erase your CREFITO or data.",
      };

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [profRes, vipRes] = await Promise.all([
        supabase
          .from("professionals")
          .select("id, full_name, crefito, is_student, student_institution, student_period")
          .eq("user_id", user.id)
          .maybeSingle(),
        user.email
          ? supabase.from("vip_users").select("id").eq("email", user.email.toLowerCase()).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);

      const data = profRes.data as any;
      setIsVip(!!vipRes?.data || isFallbackVip(user.email));

      if (data) {
        setHasProfRecord(true);
        setIsStudent(!!data.is_student);
        setHasCrefito(!!(data.crefito && String(data.crefito).trim().length > 0));
        setFullName(data.full_name || "");
        setInstitution(data.student_institution || "");
        setPeriod(data.student_period || "");
      } else {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();
        if (prof?.full_name) setFullName(prof.full_name);
      }
      setLoading(false);
    })();
  }, [user?.id, user?.email]);

  // Hard lock when CREFITO is present and user is not VIP.
  const locked = hasCrefito && !isVip;

  const handleSave = async () => {
    if (!user?.id) return;
    if (locked) return;
    if (isStudent && (!fullName.trim() || !institution.trim() || !period.trim())) {
      toast({ title: t.required, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (hasProfRecord) {
        // IMPORTANT: never touch the existing `crefito` here so VIP testers
        // can flip the switch without losing their professional registration.
        const { error } = await supabase
          .from("professionals")
          .update({
            is_student: isStudent,
            student_institution: isStudent ? institution.trim() : null,
            student_period: isStudent ? period.trim() : null,
            full_name: fullName.trim() || undefined,
            ...(isStudent ? { approved: false } : {}),
          } as any)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("professionals").insert({
          user_id: user.id,
          full_name: fullName.trim(),
          crefito: null,
          city: "",
          state: "",
          email: user.email || null,
          active: true,
          approved: false,
          is_student: isStudent,
          student_institution: isStudent ? institution.trim() : null,
          student_period: isStudent ? period.trim() : null,
        } as any);
        if (error) throw error;
        setHasProfRecord(true);
      }
      toast({ title: isStudent ? t.saved : t.disabled });
    } catch (e: any) {
      toast({ title: t.error, description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          {t.title}
          {isVip && (
            <Badge className="ml-1 text-[10px] bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 gap-1">
              <Sparkles className="h-3 w-3" />
              {t.vip_badge}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>{isVip ? `${t.desc} ${t.vip_desc}` : t.desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {locked ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
            <Lock className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">{t.locked_title}</p>
              <p className="opacity-90">{t.locked_desc}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <Label htmlFor="student-toggle" className="text-sm font-medium cursor-pointer">
                {t.toggle}
              </Label>
              <Switch id="student-toggle" checked={isStudent} onCheckedChange={setIsStudent} />
            </div>

            {isStudent && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="student-name" className="text-xs text-muted-foreground">{t.name}</Label>
                  <Input id="student-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="student-inst" className="text-xs text-muted-foreground">{t.institution}</Label>
                  <Input id="student-inst" value={institution} onChange={(e) => setInstitution(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="student-period" className="text-xs text-muted-foreground">{t.period}</Label>
                  <Input
                    id="student-period"
                    value={period}
                    placeholder={t.period_placeholder}
                    onChange={(e) => setPeriod(e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t.save}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentAccessCard;
