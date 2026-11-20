import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Section =
  | "agenda" | "patients" | "insights" | "messages" | "clinic"
  | "management" | "feedback" | "team" | "link" | "agente"
  | "pro-agenda" | "pro-insights" | "pro-messages" | "pro-patients" | "pro-agent";


interface Props {
  section: Section;
  variant?: "clinic" | "pro";
}

const COPY: Record<Section, { title: string; desc: string }> = {
  agenda:        { title: "Agenda multiprofissional",                   desc: "Visualize a semana da equipe e arraste os atendimentos para reagendar — tudo num único calendário compartilhado." },
  patients:      { title: "Pool de pacientes compartilhado",            desc: "Triagem por secretária, atribuição rápida e prontuário com IA — tudo numa fila única da clínica." },
  insights:      { title: "Insights clínicos e de gestão",       desc: "Carga, prontidão, fases STEPS e operação, organizados por categoria — sem consumir créditos de IA." },
  messages:      { title: "Chat seguro com pacientes",                  desc: "Conversas centralizadas por equipe, com videochamada nativa e disclaimer de responsabilidade." },
  clinic:        { title: "Configurações white-label",                  desc: "Logo, cor da marca, equipe, link institucional, gestão financeira e exportação de dados." },
  management:    { title: "KPIs e gráficos em tempo real",              desc: "Faturamento, ticket médio, ocupação e produtividade por profissional — atualizados ao vivo." },
  feedback:      { title: "Pesquisa de satisfação (NPS) integrada",     desc: "Envio automático pós-alta + dashboard de respostas com sentimento e comentários." },
  team:          { title: "Equipe e configurações da clínica",          desc: "Convide até 8 fisios + secretárias, defina horários, especialidades e branding em minutos." },
  link:          { title: "Link institucional anti-abuso",              desc: "Pacientes triados entram no pool da clínica — não no perfil pessoal de um terapeuta." },
  "pro-agenda":  { title: "Agenda PRO com drag-and-drop",               desc: "Organize sua semana e reagende arrastando os cards — visão diária e semanal dos seus pacientes particulares." },
  "pro-insights":{ title: "Insights para autônomos",              desc: "Acompanhe seus pacientes e sua operação por categoria, com cálculos locais e sem consumir créditos de IA." },
  "pro-messages":{ title: "Mensagens com pacientes (PRO)",              desc: "Chat seguro + videochamada, dentro da Aliv.iA, sem WhatsApp pessoal." },
  "pro-patients":{ title: "Prontuário com IA e relatório de evolução",  desc: "Anamnese assistida por voz, plano de tratamento adaptativo e PDF white-label." },
  "agente":      { title: "Agente de Raciocínio Clínico (PRO)",         desc: "Discuta casos (com anonimização automática), gere HEP baseado em evidências e vincule pacientes — direto no chat." },
  "pro-agent":   { title: "Agente de Raciocínio Clínico (PRO)",         desc: "Copiloto clínico para discutir casos, sugerir testes e gerar HEP — com evidência PEDro ≥ 7." },
};


const DemoUpsellBanner = ({ section, variant = "clinic" }: Props) => {
  const navigate = useNavigate();
  const c = COPY[section];
  const ctaLabel = variant === "clinic" ? "Iniciar trial grátis (15 dias)" : "Assinar PRO";
  const ctaTarget = variant === "clinic" ? "/clinic" : "/professional";

  return (
    <Card className="border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
      <CardContent className="py-4 px-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300/40 text-[10px] uppercase tracking-wide">Demo</Badge>
              <p className="text-sm font-semibold text-foreground truncate">{c.title}</p>
            </div>
            <p className="text-xs text-muted-foreground">{c.desc}</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => navigate(ctaTarget)}
          className="rounded-xl shrink-0 gap-1.5 w-full sm:w-auto"
        >
          {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default DemoUpsellBanner;
