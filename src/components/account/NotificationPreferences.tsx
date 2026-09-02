import { useCallback, useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export type NotificationCategory =
  | "assessments"
  | "messages"
  | "red_flags"
  | "questionnaires"
  | "load_alerts"
  | "billing"
  | "care_plan"
  | "my_assessment"
  | "payments";

type Prefs = Record<NotificationCategory, boolean>;

const DEFAULTS: Prefs = {
  assessments: true,
  messages: true,
  red_flags: true,
  questionnaires: true,
  load_alerts: true,
  billing: true,
  care_plan: true,
  my_assessment: true,
  payments: true,
};

type Copy = {
  heading: string;
  heading_personal: string;
} & Record<NotificationCategory, { title: string; desc: string }>;

const COPY: Record<string, Copy> = {
  pt: {
    heading: "O que você quer receber",
    heading_personal: "Uso pessoal (você como paciente)",
    assessments: {
      title: "Novas avaliações e reavaliações",
      desc: "Quando um paciente responde o link de autoavaliação ou reavaliação.",
    },
    messages: {
      title: "Mensagens e ligações",
      desc: "Novas mensagens no chat e chamadas de vídeo na plataforma.",
    },
    red_flags: {
      title: "Red flags",
      desc: "Sinais de alerta clínicos detectados em uma avaliação.",
    },
    questionnaires: {
      title: "Questionários e exercícios",
      desc: "Questionário pendente respondido ou exercícios do HEP concluídos.",
    },
    load_alerts: {
      title: "Alertas de carga e prontidão",
      desc: "Carga de treino fora da faixa segura (ACWR) ou queda de prontidão do paciente.",
    },
    billing: {
      title: "Assinatura e cobrança",
      desc: "Renovação confirmada, cobrança recusada ou plano prestes a vencer.",
    },
    care_plan: {
      title: "Meu tratamento e exercícios",
      desc: "Lembrete dos exercícios do dia, diário de dor e marcos da sua sequência.",
    },
    my_assessment: {
      title: "Minha avaliação",
      desc: "Avaliação para retomar, resultado pronto e sugestão de reavaliação.",
    },
    payments: {
      title: "Pagamentos",
      desc: "Boleto a vencer, pagamento confirmado e avaliação premium disponível.",
    },
  },
  en: {
    heading: "What you want to receive",
    heading_personal: "Personal use (you as a patient)",
    assessments: {
      title: "New assessments and reassessments",
      desc: "When a patient completes your self-assessment or reassessment link.",
    },
    messages: { title: "Messages and calls", desc: "New chat messages and video calls." },
    red_flags: { title: "Red flags", desc: "Clinical warning signs detected in an assessment." },
    questionnaires: {
      title: "Questionnaires and exercises",
      desc: "Pending questionnaire answered or home exercises completed.",
    },
    load_alerts: {
      title: "Load and readiness alerts",
      desc: "Training load outside the safe range (ACWR) or a drop in patient readiness.",
    },
    billing: {
      title: "Subscription and billing",
      desc: "Renewal confirmed, payment failed or plan about to expire.",
    },
    care_plan: {
      title: "My treatment and exercises",
      desc: "Daily exercise reminder, pain diary and streak milestones.",
    },
    my_assessment: {
      title: "My assessment",
      desc: "Assessment to resume, results ready and reassessment suggestions.",
    },
    payments: {
      title: "Payments",
      desc: "Invoice about to expire, payment confirmed and premium assessment available.",
    },
  },
  es: {
    heading: "Qué quieres recibir",
    heading_personal: "Uso personal (tú como paciente)",
    assessments: {
      title: "Nuevas evaluaciones y reevaluaciones",
      desc: "Cuando un paciente responde tu enlace de autoevaluación o reevaluación.",
    },
    messages: { title: "Mensajes y llamadas", desc: "Nuevos mensajes del chat y videollamadas." },
    red_flags: { title: "Red flags", desc: "Señales clínicas de alerta detectadas en una evaluación." },
    questionnaires: {
      title: "Cuestionarios y ejercicios",
      desc: "Cuestionario pendiente respondido o ejercicios del HEP completados.",
    },
    load_alerts: {
      title: "Alertas de carga y disposición",
      desc: "Carga de entrenamiento fuera del rango seguro (ACWR) o caída de la disposición del paciente.",
    },
    billing: {
      title: "Suscripción y cobro",
      desc: "Renovación confirmada, cobro rechazado o plan por vencer.",
    },
    care_plan: {
      title: "Mi tratamiento y ejercicios",
      desc: "Recordatorio de los ejercicios del día, diario de dolor y logros de racha.",
    },
    my_assessment: {
      title: "Mi evaluación",
      desc: "Evaluación para retomar, resultado listo y sugerencia de reevaluación.",
    },
    payments: {
      title: "Pagos",
      desc: "Boleto por vencer, pago confirmado y evaluación premium disponible.",
    },
  },
};

/** Categories that only make sense for someone who treats patients. */
const PRO_ORDER: NotificationCategory[] = [
  "assessments",
  "messages",
  "red_flags",
  "questionnaires",
  "load_alerts",
  "billing",
];

/** Categories written from the perspective of a person in pain. */
const PATIENT_ORDER: NotificationCategory[] = [
  "care_plan",
  "my_assessment",
  "messages",
  "payments",
];

const ALL_COLUMNS: NotificationCategory[] = [...PRO_ORDER, "care_plan", "my_assessment", "payments"];

interface Props {
  /**
   * "patient" shows only the personal-care categories.
   * "professional" shows the full clinical list plus a personal-use block,
   * since the same account accumulates both roles.
   */
  variant?: "patient" | "professional";
  /** Optional explicit override (legacy usage). */
  categories?: NotificationCategory[];
}

const NotificationPreferences = ({ variant = "professional", categories }: Props) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const copy = COPY[language] || COPY.pt;
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<NotificationCategory | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await (supabase.from("notification_preferences" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        const next = { ...DEFAULTS };
        for (const key of ALL_COLUMNS) next[key] = data[key] ?? true;
        setPrefs(next);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const toggle = useCallback(
    async (key: NotificationCategory, value: boolean) => {
      if (!user) return;
      const previous = prefs;
      setPrefs({ ...prefs, [key]: value });
      setSaving(key);
      const { error } = await (supabase.from("notification_preferences" as any) as any).upsert(
        { user_id: user.id, ...prefs, [key]: value },
        { onConflict: "user_id" },
      );
      setSaving(null);
      if (error) setPrefs(previous);
    },
    [prefs, user],
  );

  const row = (key: NotificationCategory) => (
    <div key={key} className="flex items-start justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={`notif-${key}`} className="text-sm font-medium text-foreground">
          {copy[key].title}
        </Label>
        <p className="text-xs text-muted-foreground">{copy[key].desc}</p>
      </div>
      <Switch
        id={`notif-${key}`}
        checked={prefs[key]}
        disabled={saving === key}
        onCheckedChange={(v) => toggle(key, v)}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  if (categories?.length) {
    return (
      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {copy.heading}
        </p>
        {ALL_COLUMNS.filter((c) => categories.includes(c)).map(row)}
      </div>
    );
  }

  if (variant === "patient") {
    return (
      <div className="space-y-3 border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {copy.heading}
        </p>
        {PATIENT_ORDER.map(row)}
      </div>
    );
  }

  return (
    <div className="space-y-4 border-t border-border pt-4">
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {copy.heading}
        </p>
        {PRO_ORDER.map(row)}
      </div>
      <div className="space-y-3 border-t border-border/60 pt-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {copy.heading_personal}
        </p>
        {(["care_plan", "my_assessment", "payments"] as NotificationCategory[]).map(row)}
      </div>
    </div>
  );
};

export default NotificationPreferences;
