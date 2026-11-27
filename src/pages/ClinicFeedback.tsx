import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, CheckCircle2, Star } from "lucide-react";

const SERVICE_OPTIONS = [
  { value: "fisioterapia", label: "Fisioterapia" },
  { value: "pilates", label: "Pilates" },
  { value: "osteopatia", label: "Osteopatia" },
  { value: "massoterapia", label: "Massoterapia" },
  { value: "rpg", label: "RPG" },
];

const QUALITY_OPTIONS = [
  { value: "excelente", label: "Excelente" },
  { value: "bom", label: "Bom" },
  { value: "regular", label: "Regular" },
  { value: "ruim", label: "Ruim" },
];

const RESULT_OPTIONS = [
  { value: "superou", label: "Superou expectativas" },
  { value: "atendeu", label: "Atendeu" },
  { value: "parcialmente", label: "Parcialmente" },
  { value: "nao_atendeu", label: "Não atendeu" },
];

const RECOMMEND_OPTIONS = [
  { value: "sim", label: "Sim" },
  { value: "talvez", label: "Talvez" },
  { value: "nao", label: "Não" },
];

const PUNCTUALITY_OPTIONS = [
  { value: "sempre", label: "Sempre pontual" },
  { value: "geralmente", label: "Geralmente" },
  { value: "as_vezes", label: "Às vezes atrasa" },
  { value: "frequentemente", label: "Frequentemente atrasa" },
];

const SCHEDULING_OPTIONS = [
  { value: "muito_facil", label: "Muito fácil" },
  { value: "facil", label: "Fácil" },
  { value: "dificil", label: "Difícil" },
  { value: "muito_dificil", label: "Muito difícil" },
];

const ClinicFeedback = () => {
  const { clinicId } = useParams();
  const [searchParams] = useSearchParams();
  const rawService = searchParams.get("service") || "";
  const preService = SERVICE_OPTIONS.some((o) => o.value === rawService) ? rawService : "";
  const preProfessionalId = searchParams.get("professional_id") || "";
  const memberId = searchParams.get("member_id") || "";
  const [clinicianName, setClinicianName] = useState<string | null>(null);
  const [clinicianLoading, setClinicianLoading] = useState(!!memberId);
  const [submitError, setSubmitError] = useState("");

  const [clinic, setClinic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [serviceType, setServiceType] = useState(preService || "");
  const [serviceAnswers, setServiceAnswers] = useState<Record<string, string>>({});
  const [serviceObs, setServiceObs] = useState("");
  const [proAnswers, setProAnswers] = useState<Record<string, string>>({});
  const [proObs, setProObs] = useState("");
  const [clinicAnswers, setClinicAnswers] = useState<Record<string, string>>({});
  const [clinicObs, setClinicObs] = useState("");
  const [generalObs, setGeneralObs] = useState("");

  useEffect(() => {
    if (!clinicId) return;
    (supabase as any)
      .rpc("get_clinics_public", { _ids: [clinicId] })
      .then(({ data }: any) => {
        setClinic(data?.[0] ?? null);
        setLoading(false);
      });
  }, [clinicId]);

  useEffect(() => {
    let cancelled = false;
    if (!clinicId || !memberId) { setClinicianLoading(false); setClinicianName(null); return; }
    setClinicianLoading(true);
    void supabase.rpc("get_feedback_clinician_name", { _clinic_id: clinicId, _member_id: memberId }).then(({ data, error }) => {
      if (cancelled) return;
      setClinicianName(error ? null : data);
      setClinicianLoading(false);
    });
    return () => { cancelled = true; };
  }, [clinicId, memberId]);

  const brandColor = clinic?.brand_color || "hsl(var(--primary))";

  const handleSubmit = async () => {
    if (!clinicId || submitting || (memberId && !clinicianName)) return;
    setSubmitError("");
    setSubmitting(true);
    const { error } = await supabase.from("clinic_feedback_surveys").insert({
      clinic_id: clinicId,
      service_type: serviceType || "fisioterapia",
      professional_id: memberId ? null : preProfessionalId || null,
      clinician_member_id: memberId || null,
      // Anonymous survey: never collect identity.
      patient_name: null,
      patient_email: null,
      service_answers: { ...serviceAnswers, observations: serviceObs },
      professional_answers: { ...proAnswers, observations: proObs },
      clinic_answers: { ...clinicAnswers, observations: clinicObs },
      general_observations: generalObs || null,
    });
    if (error) {
      setSubmitting(false);
      setSubmitError("Não foi possível enviar sua resposta. Seus dados continuam aqui; tente novamente. Se o profissional saiu da equipe, peça um novo link à clínica.");
      return;
    }

    // Fire-and-forget notification to owner/secretary
    supabase.functions.invoke("notify-feedback", {
      body: {
        clinic_id: clinicId,
        service_type: serviceType || "fisioterapia",
        patient_name: null,
      },
    }).catch(() => {});

    setSubmitting(false);
    setSubmitted(true);
  };

  if (loading || clinicianLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Clínica não encontrada.</p>
      </div>
    );
  }

  if (memberId && !clinicianName) return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <p className="max-w-md text-center text-muted-foreground">Este profissional não está disponível para esta pesquisa. Peça um novo link à clínica.</p>
    </div>
  );

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12 space-y-4">
            <CheckCircle2 className="h-16 w-16 mx-auto" style={{ color: brandColor }} />
            <h2 className="text-xl font-bold">Obrigado pelo seu feedback!</h2>
            <p className="text-sm text-muted-foreground">
              Sua avaliação é muito importante para melhorarmos nossos serviços.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const RadioQuestion = ({
    label,
    options,
    value,
    onChange,
  }: {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <RadioGroup value={value} onValueChange={onChange} className="space-y-1.5">
        {options.map((opt) => (
          <div key={opt.value} className="flex items-center gap-2">
            <RadioGroupItem value={opt.value} id={`${label}-${opt.value}`} />
            <Label htmlFor={`${label}-${opt.value}`} className="text-sm font-normal cursor-pointer">
              {opt.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );

  const allSteps = [
    // Step 1: Service selection
    <div key="svc" className="space-y-4">
      <h3 className="text-lg font-semibold">Serviço avaliado</h3>
      <Select value={serviceType} onValueChange={setServiceType}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione o serviço" />
        </SelectTrigger>
        <SelectContent>
          {SERVICE_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>,

    // Step 2: Service evaluation
    <div key="svc-eval" className="space-y-5">
      <h3 className="text-lg font-semibold">Avaliação do Serviço</h3>
      <RadioQuestion label="Qualidade do atendimento" options={QUALITY_OPTIONS} value={serviceAnswers.quality || ""} onChange={(v) => setServiceAnswers((p) => ({ ...p, quality: v }))} />
      <RadioQuestion label="Resultado percebido" options={RESULT_OPTIONS} value={serviceAnswers.result || ""} onChange={(v) => setServiceAnswers((p) => ({ ...p, result: v }))} />
      <RadioQuestion label="Recomendaria o serviço?" options={RECOMMEND_OPTIONS} value={serviceAnswers.recommend || ""} onChange={(v) => setServiceAnswers((p) => ({ ...p, recommend: v }))} />
      <div className="space-y-2">
        <Label>Observações sobre o serviço (opcional)</Label>
        <Textarea value={serviceObs} onChange={(e) => setServiceObs(e.target.value)} placeholder="Conte mais sobre sua experiência..." rows={2} />
      </div>
    </div>,

    // Step 3: Professional evaluation
    <div key="pro-eval" className="space-y-5">
      <h3 className="text-lg font-semibold">Avaliação do Profissional</h3>
      {clinicianName && <p className="break-words text-sm font-medium text-primary">{clinicianName}</p>}
      <RadioQuestion label="Comunicação e clareza" options={QUALITY_OPTIONS} value={proAnswers.communication || ""} onChange={(v) => setProAnswers((p) => ({ ...p, communication: v }))} />
      <RadioQuestion label="Pontualidade" options={PUNCTUALITY_OPTIONS} value={proAnswers.punctuality || ""} onChange={(v) => setProAnswers((p) => ({ ...p, punctuality: v }))} />
      <RadioQuestion label="Acolhimento e empatia" options={QUALITY_OPTIONS} value={proAnswers.empathy || ""} onChange={(v) => setProAnswers((p) => ({ ...p, empathy: v }))} />
      <div className="space-y-2">
        <Label>Observações sobre o profissional (opcional)</Label>
        <Textarea value={proObs} onChange={(e) => setProObs(e.target.value)} placeholder="Conte mais..." rows={2} />
      </div>
    </div>,

    // Step 4: Clinic evaluation
    <div key="clinic-eval" className="space-y-5">
      <h3 className="text-lg font-semibold">Avaliação da Clínica</h3>
      <RadioQuestion label="Limpeza e organização" options={QUALITY_OPTIONS} value={clinicAnswers.cleanliness || ""} onChange={(v) => setClinicAnswers((p) => ({ ...p, cleanliness: v }))} />
      <RadioQuestion label="Facilidade de agendamento" options={SCHEDULING_OPTIONS} value={clinicAnswers.scheduling || ""} onChange={(v) => setClinicAnswers((p) => ({ ...p, scheduling: v }))} />
      <RadioQuestion label="Ambiente e conforto" options={QUALITY_OPTIONS} value={clinicAnswers.environment || ""} onChange={(v) => setClinicAnswers((p) => ({ ...p, environment: v }))} />
      <div className="space-y-2">
        <Label>Observações sobre a clínica (opcional)</Label>
        <Textarea value={clinicObs} onChange={(e) => setClinicObs(e.target.value)} placeholder="Conte mais..." rows={2} />
      </div>
    </div>,

    // Step 5: General observations
    <div key="general" className="space-y-4">
      <h3 className="text-lg font-semibold">Observações gerais</h3>
      <p className="text-sm text-muted-foreground">
        Gostaria de compartilhar algo mais sobre sua experiência?
      </p>
      <Textarea
        value={generalObs}
        onChange={(e) => setGeneralObs(e.target.value)}
        placeholder="Suas sugestões, elogios ou críticas são muito bem-vindos..."
        rows={4}
      />
    </div>,
  ];
  // Link with a fixed service skips the selection step (locked to that service).
  const steps = preService ? allSteps.filter((el) => el.key !== "svc") : allSteps;

  const canAdvance = () => {
    if (steps[step]?.key === "svc" && !serviceType) return false;
    return true;
  };

  const isLastStep = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {clinic.logo_url && (
          <img src={clinic.logo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
        )}
        <div>
          <h1 className="text-lg font-bold">{clinic.name}</h1>
          <p className="text-xs text-muted-foreground">
            Pesquisa de satisfação anônima
            {preService ? ` · ${SERVICE_OPTIONS.find((o) => o.value === preService)?.label}` : ""}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5 mb-6 w-full max-w-md">
        {steps.map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors"
            style={{ backgroundColor: i <= step ? brandColor : "hsl(var(--muted))" }}
          />
        ))}
      </div>

      {/* Step content */}
      <Card className="w-full max-w-md">
        <CardContent className="py-6">
          {steps[step]}
          {submitError && <p role="alert" className="mt-4 text-sm text-destructive">{submitError}</p>}

          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                Voltar
              </Button>
            )}
            {isLastStep ? (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1"
                style={{ backgroundColor: brandColor }}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
                Enviar feedback
              </Button>
            ) : (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canAdvance()}
                className="flex-1"
                style={{ backgroundColor: brandColor }}
              >
                Próximo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClinicFeedback;
