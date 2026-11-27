import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Copy, Check, MessageSquareHeart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { useFeedbackClinicians } from "@/hooks/useFeedbackClinicians";
import { feedbackLink } from "@/lib/feedbackClinicians";

const SERVICE_OPTIONS = [
  { value: "all", label: { pt: "Todos os serviços", en: "All services", es: "Todos los servicios" } },
  { value: "fisioterapia", label: { pt: "Fisioterapia", en: "Physiotherapy", es: "Fisioterapia" } },
  { value: "pilates", label: { pt: "Pilates", en: "Pilates", es: "Pilates" } },
  { value: "osteopatia", label: { pt: "Osteopatia", en: "Osteopathy", es: "Osteopatía" } },
  { value: "massoterapia", label: { pt: "Massoterapia", en: "Massage Therapy", es: "Masoterapia" } },
  { value: "rpg", label: { pt: "RPG", en: "RPG", es: "RPG" } },
];

interface FeedbackSurveyCardProps {
  clinicId: string;
  lang: "pt" | "en" | "es";
}

const FeedbackSurveyCard = ({ clinicId, lang }: FeedbackSurveyCardProps) => {
  const { toast } = useToast();
  const [service, setService] = useState("all");
  const [copied, setCopied] = useState(false);
  const [member, setMember] = useState("all");
  const { data: clinicians = [], isLoading, isError } = useFeedbackClinicians(clinicId);
  const activeMember = clinicians.some((c) => c.member_id === member) ? member : "all";
  const t = (pt: string, en: string, es: string) => lang === "pt" ? pt : lang === "es" ? es : en;

  const link = feedbackLink(getPublicOrigin(), clinicId, service, activeMember);

  const copy = async () => {
    try {
      const { createShortAppLink } = await import("@/lib/shortLink");
      const short = await createShortAppLink(link);
      await navigator.clipboard.writeText(short);
    } catch {
      await navigator.clipboard.writeText(link);
    }
    setCopied(true);
    toast({ title: lang === "pt" ? "Link copiado!" : "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardContent className="py-4 px-5 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquareHeart className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">
            {lang === "pt" ? "Pesquisa de Feedback" : lang === "es" ? "Encuesta de Feedback" : "Feedback Survey"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {lang === "pt"
            ? "Gere um link de pesquisa de satisfação para enviar aos pacientes."
            : "Generate a satisfaction survey link to send to patients."}
        </p>

        <Select value={service} onValueChange={(v) => { setService(v); setCopied(false); }}>
          <SelectTrigger className="h-9 text-xs" aria-label={t("Serviço da pesquisa", "Survey service", "Servicio de la encuesta")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label[lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={activeMember} onValueChange={(v) => { setMember(v); setCopied(false); }} disabled={isLoading || isError}>
          <SelectTrigger className="h-9 text-xs" aria-label={t("Profissional avaliado", "Professional being rated", "Profesional evaluado")}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Sem profissional específico", "No specific professional", "Sin profesional específico")}</SelectItem>
            {clinicians.map((c) => <SelectItem key={c.member_id} value={c.member_id}>{c.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        {isError && <p className="text-xs text-destructive">{t("Não foi possível carregar a equipe. Recarregue para tentar novamente.", "Could not load the team. Reload to retry.", "No se pudo cargar el equipo. Recargue para reintentar.")}</p>}

        <div className="flex gap-2">
          <code className="min-w-0 flex-1 text-[10px] bg-muted/60 px-3 py-2 rounded-lg text-muted-foreground truncate">
            {link}
          </code>
          <Button type="button" onClick={copy} disabled={isLoading || isError} variant="outline" size="sm" className="gap-1.5 shrink-0">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? (lang === "pt" ? "Copiado" : "Copied") : (lang === "pt" ? "Copiar" : "Copy")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackSurveyCard;
