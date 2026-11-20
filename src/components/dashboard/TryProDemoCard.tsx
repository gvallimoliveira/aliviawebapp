import { useNavigate } from "react-router-dom";
import { PlayCircle, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TryProDemoCardProps {
  section?: string;
  className?: string;
}

/**
 * Compact CTA shown to professionals without an active PRO subscription
 * (with or without Aliv.iA Acadêmico mode). Sends them to the public Pro demo.
 */
const TryProDemoCard = ({ section, className }: TryProDemoCardProps) => {
  const navigate = useNavigate();
  return (
    <Card
      className={`border-primary/30 bg-primary/5 px-3 py-2 flex items-center gap-3 ${className || ""}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <PlayCircle className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground leading-tight">
          Conheça o painel PRO na prática
          {section && <span className="text-muted-foreground font-normal"> · {section}</span>}
        </p>
        <p className="text-[11px] text-muted-foreground leading-tight truncate">
          Explore o modo demonstração com dados fictícios.
        </p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-8 px-2 rounded-lg text-primary hover:bg-primary/10 gap-1 text-xs shrink-0"
        onClick={() => navigate("/profissionais/demo")}
      >
        Abrir
        <ArrowRight className="h-3 w-3" />
      </Button>
    </Card>
  );
};

export default TryProDemoCard;
