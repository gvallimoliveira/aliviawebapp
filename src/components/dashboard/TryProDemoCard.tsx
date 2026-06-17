import { useNavigate } from "react-router-dom";
import { PlayCircle, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TryProDemoCardProps {
  /** Short context label shown above the title (e.g. "Pacientes", "Agenda", "Agente"). */
  section?: string;
  className?: string;
}

/**
 * CTA shown to professionals that have signed up but do NOT yet have an active PRO subscription
 * (with or without Alivia Acadêmico mode). Sends them to the public Pro demo so they can explore
 * the platform dynamics before subscribing.
 */
const TryProDemoCard = ({ section, className }: TryProDemoCardProps) => {
  const navigate = useNavigate();
  return (
    <Card
      className={`border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-background ${className || ""}`}
    >
      <CardContent className="py-5 px-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <PlayCircle className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] uppercase tracking-wide gap-1">
              <Sparkles className="h-3 w-3" /> Modo demonstração
            </Badge>
            {section && (
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{section}</span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground">
            Conheça o painel profissional na prática
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Explore pacientes simulados, agenda, insights, mensagens e o Agente de Raciocínio Clínico — sem precisar assinar agora. Tudo com dados fictícios para você sentir a dinâmica completa da Aliv.iA.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl border-primary/40 text-primary hover:bg-primary/10 gap-1.5 self-start sm:self-center shrink-0"
          onClick={() => navigate("/profissionais/demo")}
        >
          Abrir demo
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default TryProDemoCard;
