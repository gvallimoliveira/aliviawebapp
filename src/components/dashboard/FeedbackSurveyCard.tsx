import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Copy, Check, MessageSquareHeart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getPublicOrigin } from "@/lib/getPublicOrigin";

const SERVICE_OPTIONS = [
  { value: "", label: { pt: "Todos os serviços", en: "All services", es: "Todos los servicios" } },
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
  const [service, setService] = useState("");
  const [copied, setCopied] = useState(false);

  const link = `${getPublicOrigin()}/feedback/clinic/${clinicId}${service ? `?service=${service}` : ""}`;

  const copy = () => {
    navigator.clipboard.writeText(link);
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

        <Select value={service} onValueChange={setService}>
          <SelectTrigger className="h-9 text-xs">
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

        <div className="flex gap-2">
          <code className="flex-1 text-[10px] bg-muted/60 px-3 py-2 rounded-lg text-muted-foreground truncate">
            {link}
          </code>
          <Button onClick={copy} variant="outline" size="sm" className="gap-1.5 shrink-0">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? (lang === "pt" ? "Copiado" : "Copied") : (lang === "pt" ? "Copiar" : "Copy")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedbackSurveyCard;
