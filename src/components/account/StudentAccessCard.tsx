import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GraduationCap, Loader2 } from "lucide-react";

/**
 * "Acesso Estudante" — toggle that turns a regular professional account into an
 * Alivia Acadêmico account: CREFITO becomes optional, marketplace listing is
 * disabled, and PDFs/links display the academic disclaimer.
 */
const StudentAccessCard = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isPt = language === "pt";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [hasProfRecord, setHasProfRecord] = useState(false);
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
      };

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("professionals")
        .select("id, full_name, is_student, student_institution, student_period")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setHasProfRecord(true);
        setIsStudent(!!(data as any).is_student);
        setFullName(data.full_name || "");
        setInstitution((data as any).student_institution || "");
        setPeriod((data as any).student_period || "");
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
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    if (isStudent && (!fullName.trim() || !institution.trim() || !period.trim())) {
      toast({ title: t.required, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (hasProfRecord) {
        const { error } = await supabase
          .from("professionals")
          .update({
            is_student: isStudent,
            student_institution: isStudent ? institution.trim() : null,
            student_period: isStudent ? period.trim() : null,
            full_name: fullName.trim() || undefined,
            // Students must not appear in the marketplace
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
        </CardTitle>
        <CardDescription>{t.desc}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
};

export default StudentAccessCard;
