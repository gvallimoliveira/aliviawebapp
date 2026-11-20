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
import { GraduationCap, Loader2, Lock, Sparkles, AlertTriangle, CreditCard, Stethoscope, Info } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { isFallbackVip } from "@/lib/vipEmails";
import { hasRealCrefito } from "@/lib/crefito";


/**
 * "Acesso Estudante" — toggle that turns a regular professional account into an
 * Aliv.iA Acadêmico account: CREFITO becomes optional, marketplace listing is
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
  /** Academic access already granted in the DB (admin partner panel or self signup). */
  const [studentGranted, setStudentGranted] = useState(false);
  const [hasProfRecord, setHasProfRecord] = useState(false);
  const [hasCrefito, setHasCrefito] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [hasProAccess, setHasProAccess] = useState(false);
  const [nameLocked, setNameLocked] = useState(false);
  const [originalName, setOriginalName] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [institution, setInstitution] = useState("");
  const [period, setPeriod] = useState("");
  const [activeMode, setActiveMode] = useState<"professional" | "student">("professional");

  const t = isPt
    ? {
        title: "Acesso Estudante — Aliv.iA Acadêmico",
        desc: "Para estudantes de fisioterapia ainda sem CREFITO. Ativa o selo acadêmico; as ferramentas profissionais só liberam com assinatura PRO ativa, exceto parceiro acadêmico habilitado pelo admin.",
        toggle: "Sou estudante de fisioterapia",
        toggle_hint: "Desative para cadastrar seu CREFITO e ter acesso ao painel exclusivamente profissional",
        name: "Nome completo",
        name_lock_warn: "Atenção: por segurança contra compartilhamento de assinatura, você pode editar seu nome no modo acadêmico apenas 1 (uma) vez após o cadastro inicial (para corrigir erro de digitação). Após essa ratificação, o nome ficará bloqueado e aparecerá fixo nos PDFs e links públicos.",
        name_locked: "Nome bloqueado. Você já utilizou a ratificação permitida. O nome em relatórios acadêmicos não pode mais ser alterado para evitar compartilhamento de assinatura. Em caso de erro real (ex.: troca de nome civil), fale com o suporte.",
        cpf_label: "CPF",
        cpf_placeholder: "000.000.000-00",
        cpf_hint: "Obrigatório para vinculação única da conta acadêmica (evita duplicidade e compartilhamento).",
        institution: "Instituição de ensino",
        period: "Período atual",
        period_placeholder: "Ex.: 5º período",
        save: "Salvar",
        saved: "Acesso estudante atualizado!",
        disabled: "Acesso estudante desativado.",
        required: "Preencha nome, CPF, instituição e período.",
        cpf_invalid: "CPF inválido. Use 11 dígitos.",
        error: "Erro ao salvar",
        graduate_title: "Concluiu o curso? Cadastre seu CREFITO",
        graduate_desc: "Para sair do modo Acadêmico você precisa cadastrar seu CREFITO no formulário profissional. Vamos te levar lá agora.",
        graduate_cta: "Cadastrar CREFITO agora",
        locked_title: "Conta profissional com CREFITO",
        locked_desc: "Sua conta já está cadastrada como fisioterapeuta formado. O modo Estudante não pode ser ativado.",
        vip_badge: "VIP · alternância livre",
        vip_desc: "Conta de teste: alternar não apaga seu CREFITO nem seus dados.",
        no_sub_title: "O selo acadêmico não substitui a assinatura PRO",
        no_sub_desc: "O modo Aliv.iA Acadêmico é apenas um identificador visual nos PDFs e links públicos. Para liberar as ferramentas PRO (painel de pacientes, IA clínica, programas de exercício, prontuário) você precisa de uma assinatura ativa.",
        no_sub_note: "É a mesma assinatura PRO do fisioterapeuta formado — mesmo produto, mesmo preço. Enquanto você não cadastrar seu CREFITO, seu perfil continua identificado como Aliv.iA Acadêmico em PDFs e links públicos. Ao registrar o CREFITO depois, o selo acadêmico some automaticamente e a conta passa a operar como Profissional, sem nova cobrança.",
        no_sub_cta: "Assinar PRO (anual)",
        no_sub_cta_monthly: "Ver plano mensal",
        mode_title: "Perfil ativo agora",
        mode_desc: "Define o que aparece nos seus PDFs, no link público de avaliação e no marketplace. Você pode alternar quando quiser.",
        mode_pro: "Profissional",
        mode_pro_desc: "PDFs e links exibem CREFITO; aparece no marketplace.",
        mode_student: "Acadêmico",
        mode_student_desc: "PDFs e links exibem o selo Aliv.iA Acadêmico; sai do marketplace.",
      }
    : {
        title: "Student Access — Aliv.iA Academic",
        desc: "For physiotherapy students without a CREFITO yet. Enables the academic seal; professional tools unlock only with an active PRO subscription, except admin-enabled academic partners.",
        toggle: "I am a physiotherapy student",
        toggle_hint: "Disable to register your CREFITO and access the exclusively professional panel",
        name: "Full name",
        name_lock_warn: "Warning: to prevent subscription sharing, you may edit your name in academic mode only once after the initial registration (to fix typos). After this single ratification, the name will be locked and shown fixed on PDFs and public links.",
        name_locked: "Name locked. You have already used the allowed ratification. The name on academic reports can no longer be changed to prevent subscription sharing. For a real correction (e.g. legal name change), contact support.",
        cpf_label: "CPF (Brazilian ID)",
        cpf_placeholder: "000.000.000-00",
        cpf_hint: "Required to keep the academic account unique (prevents duplicate or shared accounts).",
        institution: "Institution",
        period: "Current term",
        period_placeholder: "e.g. 5th term",
        save: "Save",
        saved: "Student access updated!",
        disabled: "Student access disabled.",
        required: "Fill name, CPF, institution and term.",
        cpf_invalid: "Invalid CPF — 11 digits required.",
        error: "Save error",
        graduate_title: "Graduated? Register your CREFITO",
        graduate_desc: "To leave Academic mode you must register your CREFITO in the professional form. We'll take you there now.",
        graduate_cta: "Register CREFITO now",
        locked_title: "Professional account with CREFITO",
        locked_desc: "Your account is already registered as a licensed therapist. Student mode cannot be enabled.",
        vip_badge: "VIP · free toggle",
        vip_desc: "Test account: toggling does not erase your CREFITO or data.",
        no_sub_title: "The academic seal does not replace a PRO subscription",
        no_sub_desc: "Aliv.iA Academic mode is only a visual identifier on PDFs and public links. To unlock PRO tools (patient panel, clinical AI, exercise programs, chart) you need an active subscription.",
        no_sub_note: "This is the same PRO subscription used by licensed physiotherapists — same product, same price. As long as you don't register your CREFITO, your profile stays labeled as Aliv.iA Academic on PDFs and public links. When you later add a CREFITO, the academic seal is removed automatically and the account starts operating as Professional, with no extra charge.",
        no_sub_cta: "Subscribe to PRO (annual)",
        no_sub_cta_monthly: "See monthly plan",
        mode_title: "Active profile right now",
        mode_desc: "Defines what appears on your PDFs, your public assessment link and the marketplace. You can switch anytime.",
        mode_pro: "Professional",
        mode_pro_desc: "PDFs and links show CREFITO; listed on the marketplace.",
        mode_student: "Academic",
        mode_student_desc: "PDFs and links show the Aliv.iA Academic seal; hidden from marketplace.",
      };

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const [profRes, vipRes] = await Promise.all([
        supabase
          .from("professionals")
          .select("id, full_name, cpf, crefito, is_student, active_profile_mode, student_institution, student_period, student_name_locked, subscription_status, subscription_stripe_id, is_partner, is_partner_account, lifetime_treatment, premium_granted, pro_access_expires_at")
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
        setStudentGranted(!!data.is_student);
        setActiveMode((data.active_profile_mode ?? (data.is_student ? "student" : "professional")) as "professional" | "student");
        // Placeholder CREFITOs (auto-generated when an admin adds a partner)
        // must not classify the account as a licensed professional.
        setHasCrefito(hasRealCrefito(data.crefito));

        setFullName(data.full_name || "");
        setOriginalName(data.full_name || "");
        setCpf(data.cpf || "");
        setInstitution(data.student_institution || "");
        setPeriod(data.student_period || "");
        setNameLocked(!!data.student_name_locked);
        const hasPaidProSubscription = data.subscription_status === "active" && (
          !!data.subscription_stripe_id
          || (data.pro_access_expires_at && new Date(data.pro_access_expires_at) > new Date())
        );
        const isPartner = data.is_partner === true;
        const isAcademicPartner = data.is_partner_account === true && data.is_student === true;
        setHasProAccess(hasPaidProSubscription || isPartner || isAcademicPartner);
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

  // Hard lock only for accounts that have a CREFITO and never received academic
  // access. Once academic access is granted (admin partner panel or self
  // signup), the user keeps full control of the academic fields and of the
  // active profile switch — even with a CREFITO on file.
  const locked = hasCrefito && !isVip && !studentGranted;

  // Wanting to leave student mode without a CREFITO on file → DB trigger
  // would reject the update. Send the user to the professional registration
  // form so they can input their CREFITO (with skip option still available).
  // VIP/admin accounts navigate freely between modes (test/admin accounts).
  const needsCrefitoFlow = !isStudent && hasProfRecord && !hasCrefito && !isVip;

  const handleSave = async () => {
    if (!user?.id) return;
    if (locked) return;
    if (needsCrefitoFlow) {
      try {
        sessionStorage.setItem("signupOrigin", "professional");
        // Signal the registration page to open in professional mode even if
        // the existing record still has is_student=true in the DB.
        sessionStorage.setItem("forceProfessionalMode", "1");
      } catch {}
      navigate("/professional/register");
      return;
    }
    const cpfDigits = cpf.replace(/\D/g, "");
    if (isStudent && (!fullName.trim() || !institution.trim() || !period.trim() || !cpfDigits)) {
      toast({ title: t.required, variant: "destructive" });
      return;
    }
    if (isStudent && cpfDigits.length !== 11) {
      toast({ title: t.cpf_invalid, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Compute effective active mode:
      // - if student access is being disabled → force 'professional'
      // - if no CREFITO and student=true → must be 'student'
      // - otherwise honor user choice
      const effectiveMode: "professional" | "student" =
        !isStudent ? "professional"
        : (!hasCrefito && !isVip ? "student" : activeMode);

      if (hasProfRecord) {
        // IMPORTANT: never touch the existing `crefito` here so VIP testers
        // can flip the switch without losing their professional registration.
        // Name lock: once student_name_locked=true the academic full_name
        // becomes immutable here (prevents subscription sharing by name swap).
        // Name lock rule: the student can rectify the academic name ONCE
        // (typo fix). We only mark it locked when the name was actually
        // changed compared to the previously saved value — that consumes the
        // single allowed ratification. The first save (when there was no
        // previous name) does NOT lock, so the user keeps one editable
        // opportunity afterward.
        const nameChanged =
          isStudent &&
          !!fullName.trim() &&
          !!originalName.trim() &&
          fullName.trim() !== originalName.trim();
        const lockNameNow = nameChanged && !nameLocked && !isVip;
        const { error } = await supabase
          .from("professionals")
          .update({
            is_student: isStudent,
            active_profile_mode: effectiveMode,
            student_institution: isStudent ? institution.trim() : null,
            student_period: isStudent ? period.trim() : null,
            ...(isStudent ? { cpf: cpfDigits } : {}),
            ...(nameLocked && !isVip ? {} : { full_name: fullName.trim() || undefined }),
            ...(lockNameNow ? { student_name_locked: true } : {}),
            ...(effectiveMode === "student" ? { approved: false } : {}),
          } as any)
          .eq("user_id", user.id);
        if (error) throw error;
        if (lockNameNow) setNameLocked(true);
        if (!nameLocked && fullName.trim()) setOriginalName(fullName.trim());
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
          active_profile_mode: effectiveMode,
          student_institution: isStudent ? institution.trim() : null,
          student_period: isStudent ? period.trim() : null,
          cpf: cpfDigits,
        } as any);
        if (error) throw error;
        setHasProfRecord(true);
        // First save creates the name — keep editable for one ratification.
        if (fullName.trim()) setOriginalName(fullName.trim());
      }
      setActiveMode(effectiveMode);
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
              <p className="text-xs text-muted-foreground -mt-2 ml-3">{t.toggle_hint}</p>
            )}

            {isStudent && (hasCrefito || isVip) && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    {t.mode_title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t.mode_desc}</p>
                </div>
                <RadioGroup
                  value={activeMode}
                  onValueChange={(v) => setActiveMode(v as "professional" | "student")}
                  className="space-y-2"
                >
                  <label
                    htmlFor="mode-pro"
                    className={`flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer transition ${activeMode === "professional" ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/40"}`}
                  >
                    <RadioGroupItem value="professional" id="mode-pro" className="mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Stethoscope className="h-3.5 w-3.5" />
                        {t.mode_pro}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{t.mode_pro_desc}</p>
                    </div>
                  </label>
                  <label
                    htmlFor="mode-student"
                    className={`flex items-start gap-2 rounded-md border px-3 py-2 cursor-pointer transition ${activeMode === "student" ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/40"}`}
                  >
                    <RadioGroupItem value="student" id="mode-student" className="mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {t.mode_student}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{t.mode_student_desc}</p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            )}


            {isStudent && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="student-name" className="text-xs text-muted-foreground flex items-center gap-1.5">
                    {t.name}
                    {nameLocked && !isVip && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </Label>
                  <Input
                    id="student-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    readOnly={nameLocked && !isVip}
                    className={nameLocked && !isVip ? "bg-muted/50 cursor-not-allowed" : ""}
                  />
                  {!nameLocked && !isVip && (
                    <p className="text-[11px] text-amber-700 leading-snug flex items-start gap-1">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{t.name_lock_warn}</span>
                    </p>
                  )}
                  {nameLocked && !isVip && (
                    <p className="text-[11px] text-muted-foreground leading-snug flex items-start gap-1">
                      <Lock className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>{t.name_locked}</span>
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="student-cpf" className="text-xs text-muted-foreground">{t.cpf_label} *</Label>
                  <Input
                    id="student-cpf"
                    value={cpf}
                    placeholder={t.cpf_placeholder}
                    inputMode="numeric"
                    maxLength={14}
                    onChange={(e) => {
                      // Mask: 000.000.000-00
                      const d = e.target.value.replace(/\D/g, "").slice(0, 11);
                      let out = d;
                      if (d.length > 9) out = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
                      else if (d.length > 6) out = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
                      else if (d.length > 3) out = `${d.slice(0, 3)}.${d.slice(3)}`;
                      setCpf(out);
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground leading-snug">{t.cpf_hint}</p>
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

            {isStudent && !hasProAccess && !isVip && (
              <div className="rounded-xl border border-amber-300 bg-gradient-to-br from-amber-50 via-amber-50/60 to-background px-3.5 py-3 text-xs space-y-2.5">
                <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {t.no_sub_title}
                </p>
                <p className="text-amber-900/85 leading-relaxed">{t.no_sub_desc}</p>
                <div className="rounded-lg bg-amber-100/70 border border-amber-200 px-2.5 py-2 flex gap-1.5 text-amber-900/90 leading-relaxed">
                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <p>{t.no_sub_note}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 gap-2 rounded-lg"
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.functions.invoke("create-pro-subscription", { body: { plan: "annual" } });
                        if (error) throw error;
                        if (data?.url) window.location.href = data.url;
                      } catch {
                        toast({ title: t.error, variant: "destructive" });
                      }
                    }}
                  >
                    <CreditCard className="h-4 w-4" />
                    {t.no_sub_cta}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-2 rounded-lg"
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.functions.invoke("create-pro-subscription", { body: { plan: "monthly" } });
                        if (error) throw error;
                        if (data?.url) window.location.href = data.url;
                      } catch {
                        toast({ title: t.error, variant: "destructive" });
                      }
                    }}
                  >
                    {t.no_sub_cta_monthly}
                  </Button>
                </div>
              </div>
            )}


            {needsCrefitoFlow && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs text-foreground space-y-2">
                <p className="font-semibold flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  {t.graduate_title}
                </p>
                <p className="opacity-90">{t.graduate_desc}</p>
              </div>
            )}

            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {needsCrefitoFlow ? t.graduate_cta : t.save}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default StudentAccessCard;
