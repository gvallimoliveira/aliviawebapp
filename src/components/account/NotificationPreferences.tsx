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
  | "billing";

type Prefs = Record<NotificationCategory, boolean>;

const DEFAULTS: Prefs = {
  assessments: true,
  messages: true,
  red_flags: true,
  questionnaires: true,
  billing: true,
};

const COPY: Record<string, Record<NotificationCategory, { title: string; desc: string }> & { heading: string }> = {
  pt: {
    heading: "O que você quer receber",
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
    billing: {
      title: "Assinatura e cobrança",
      desc: "Renovação confirmada, cobrança recusada ou plano prestes a vencer.",
    },
  },
  en: {
    heading: "What you want to receive",
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
    billing: {
      title: "Subscription and billing",
      desc: "Renewal confirmed, payment failed or plan about to expire.",
    },
  },
  es: {
    heading: "Qué quieres recibir",
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
    billing: {
      title: "Suscripción y cobro",
      desc: "Renovación confirmada, cobro rechazado o plan por vencer.",
    },
  },
};

const ORDER: NotificationCategory[] = [
  "assessments",
  "messages",
  "red_flags",
  "questionnaires",
  "billing",
];

interface Props {
  /** Hide categories that make no sense for the current profile. */
  categories?: NotificationCategory[];
}

const NotificationPreferences = ({ categories }: Props) => {
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
        setPrefs({
          assessments: data.assessments ?? true,
          messages: data.messages ?? true,
          red_flags: data.red_flags ?? true,
          questionnaires: data.questionnaires ?? true,
          billing: data.billing ?? true,
        });
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

  const visible = categories?.length ? ORDER.filter((c) => categories.includes(c)) : ORDER;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {copy.heading}
      </p>
      {visible.map((key) => (
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
      ))}
    </div>
  );
};

export default NotificationPreferences;
