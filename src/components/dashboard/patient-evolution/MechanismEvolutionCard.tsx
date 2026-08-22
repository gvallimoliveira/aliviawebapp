/**
 * Bloco F1 — evolução longitudinal do mecanismo de dor no prontuário.
 *
 * Só renderiza quando existem 2+ avaliações com triagem registrada. Complementa
 * a hipótese diagnóstica (nunca substitui) e não dispara nenhuma escrita.
 */
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  buildMechanismTimeline,
  compareMechanismSnapshots,
  type AssessmentLikeForMechanism,
} from "@/lib/painMechanismEvolution";
import {
  getMechanismLabel,
  getMechanismTokenClass,
  getSubtypeLabel,
} from "@/lib/painMechanism";

interface Props {
  assessments: AssessmentLikeForMechanism[];
}

const MechanismEvolutionCard = ({ assessments }: Props) => {
  const { language } = useLanguage();
  const lang = (language === "en" ? "en" : language === "es" ? "es" : "pt") as "pt" | "en" | "es";
  const timeline = React.useMemo(() => buildMechanismTimeline(assessments), [assessments]);

  if (timeline.length < 2) return null;

  const change = compareMechanismSnapshots(timeline[0], timeline[timeline.length - 1], lang);
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";

  const DirIcon =
    change.direction === "improving" ? TrendingDown : change.direction === "worsening" ? TrendingUp : Minus;
  const dirLabel =
    change.direction === "improving"
      ? lang === "pt" ? "Evolução favorável" : lang === "es" ? "Evolución favorable" : "Favorable trend"
      : change.direction === "worsening"
        ? lang === "pt" ? "Atenção — quadro mais central/difuso" : lang === "es" ? "Atención — cuadro más central/difuso" : "Watch — more central/diffuse"
        : lang === "pt" ? "Estável" : lang === "es" ? "Estable" : "Stable";
  const dirClass =
    change.direction === "improving"
      ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300"
      : change.direction === "worsening"
        ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300"
        : "bg-muted text-muted-foreground";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          {lang === "pt" ? "Mecanismo de Dor — Evolução" : lang === "es" ? "Mecanismo de Dolor — Evolución" : "Pain Mechanism — Evolution"}
        </CardTitle>
        <CardDescription className="text-xs">
          {timeline.length}{" "}
          {lang === "pt" ? "triagens registradas" : lang === "es" ? "triajes registrados" : "screenings recorded"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Badge variant="outline" className={`text-[10px] gap-1 ${dirClass}`}>
          <DirIcon className="h-3 w-3" />
          {dirLabel}
        </Badge>

        <ol className="space-y-2">
          {timeline.map((s, i) => (
            <li key={`${s.assessmentId || i}`} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground w-20 shrink-0">
                {s.date ? new Date(s.date).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
              </span>
              <Badge variant="outline" className={`text-[10px] ${getMechanismTokenClass(s.mechanism.mechanism)}`}>
                {getMechanismLabel(s.mechanism.mechanism, lang)}
              </Badge>
              {s.mechanism.subtype && (
                <span className="text-muted-foreground">{getSubtypeLabel(s.mechanism.subtype, lang)}</span>
              )}
              {s.mechanism.central_sensitization_likely && (
                <Badge variant="outline" className="text-[10px]">
                  {lang === "en" ? "central sensitization" : "sensibilização central"}
                </Badge>
              )}
              {s.extent != null && (
                <span className="text-muted-foreground">
                  ~{s.extent.toFixed(1)}% {lang === "en" ? "surface" : "superfície"}
                </span>
              )}
              {typeof s.mechanism.csi_score === "number" && (
                <span className="text-muted-foreground">CSI {s.mechanism.csi_score}</span>
              )}
            </li>
          ))}
        </ol>

        <ul className="space-y-1 border-t border-border/60 pt-2">
          {change.lines.map((l, i) => (
            <li key={i} className="text-xs text-muted-foreground leading-relaxed">• {l}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default MechanismEvolutionCard;
