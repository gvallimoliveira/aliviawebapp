import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Link2, ChevronRight } from "lucide-react";

interface SoloUpgradeBannerProps {
  hasActiveProSubscription: boolean;
}

const SoloUpgradeBanner = ({ hasActiveProSubscription }: SoloUpgradeBannerProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  // Only show when therapist doesn't have their own Pro subscription
  if (hasActiveProSubscription) return null;

  const labels = {
    pt: {
      title: "Tenha seu próprio painel profissional",
      desc: "Assine o plano Pro individual para ter seu link de avaliação exclusivo, painel independente e gestão de pacientes particulares.",
      cta: "Conhecer plano Pro",
    },
    en: {
      title: "Get your own professional dashboard",
      desc: "Subscribe to the individual Pro plan for your exclusive assessment link, independent dashboard and private patient management.",
      cta: "See Pro plan",
    },
    es: {
      title: "Ten tu propio panel profesional",
      desc: "Suscríbete al plan Pro individual para tener tu enlace de evaluación exclusivo, panel independiente y gestión de pacientes privados.",
      cta: "Ver plan Pro",
    },
  };

  const l = labels[language as keyof typeof labels] || labels.pt;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/[0.02]">
      <CardContent className="py-5 px-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 shrink-0">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <h3 className="text-sm font-semibold text-foreground">{l.title}</h3>
            <p className="text-xs text-muted-foreground">{l.desc}</p>
            <div className="flex items-center gap-1.5 text-xs text-primary/80 pt-0.5">
              <Link2 className="h-3 w-3" />
              <span>Link exclusivo • Painel independente • Pacientes particulares</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 gap-1.5 rounded-xl border-primary/30 text-primary hover:bg-primary/5"
            onClick={() => navigate("/dashboard?tab=pro&subscribe=true")}
          >
            {l.cta}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SoloUpgradeBanner;
