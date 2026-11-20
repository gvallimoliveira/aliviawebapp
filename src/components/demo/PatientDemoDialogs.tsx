import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity, AlertCircle, Brain, Calendar, CheckCircle2, ClipboardCheck, ClipboardList,
  Crown, Dumbbell, FileText, Info, Lock, MapPin, ShieldCheck, Sparkles, Stethoscope,
  Target, Users,
} from "lucide-react";

interface DemoAssessment {
  id: string;
  label: string;
  type: string;
  created_at: string;
  status: string;
  pain_score: number;
  pain_regions: string[];
  hypothesis: string;
  confidence: string;
  odi: number;
  sf36: number;
  redFlags: boolean;
  anamnesis: {
    onset: string;
    character: string;
    aggravators: string;
    relievers: string;
    sleep: string;
    goals: string;
  };
  tests: Array<{ name: string; result: string; flag: "positive" | "warning" | "ok" }>;
  questionnaires: Array<{ name: string; score: number; severity: string; color: string }>;
  plan: string[];
}

interface PatientDemoDialogsProps {
  assessmentDialog: "basic" | "premium" | null;
  closeAssessmentDialog: () => void;
  findProDialog: boolean;
  closeFindProDialog: () => void;
  openAssessment: DemoAssessment | null;
  closeOpenAssessment: () => void;
  goBasic: () => void;
  goSubscribe: () => void;
  painRegionLabels: Record<string, string>;
}

const PatientDemoDialogs = ({
  assessmentDialog,
  closeAssessmentDialog,
  findProDialog,
  closeFindProDialog,
  openAssessment,
  closeOpenAssessment,
  goBasic,
  goSubscribe,
  painRegionLabels,
}: PatientDemoDialogsProps) => {
  return (
    <>
      <Dialog open={!!assessmentDialog} onOpenChange={(o) => !o && closeAssessmentDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">
              {assessmentDialog === "premium" ? "Autoavaliação Premium" : "Autoavaliação básica"}
            </DialogTitle>
            <DialogDescription className="text-center pt-1">
              Você está no <strong>modo demonstração</strong>. Para iniciar uma autoavaliação real:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3">
              <ClipboardList className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Autoavaliação básica (gratuita)</p>
                <p className="text-xs text-muted-foreground">
                  Acesse pela landing page e faça sua triagem inicial sem custo.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/[0.03] p-3">
              <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Autoavaliação Premium</p>
                <p className="text-xs text-muted-foreground">
                  Hipótese preliminar aprofundada, plano de tratamento, diário de dor e comparativo de evolução —
                  disponível com a assinatura Premium.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => { closeAssessmentDialog(); goBasic(); }} className="rounded-xl">
              Iniciar autoavaliação básica
            </Button>
            <Button onClick={() => { closeAssessmentDialog(); goSubscribe(); }} className="rounded-xl gap-1.5">
              <Crown className="h-4 w-4" /> Assinar Premium
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={findProDialog} onOpenChange={(o) => !o && closeFindProDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-2">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">Encontre um fisioterapeuta parceiro</DialogTitle>
            <DialogDescription className="text-center pt-1">
              No app real, aqui aparece uma <strong>lista de fisioterapeutas verificados</strong> cadastrados na plataforma Aliv.iA — com foto, especialidades, cidade, avaliações e botão para iniciar contato.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            {[
              { name: "Dra. Ana Costa", spec: "Coluna · Dor crônica", city: "São Paulo - SP", rating: "4.9" },
              { name: "Dr. Rafael Lima", spec: "Esportiva · Reabilitação", city: "Belo Horizonte - MG", rating: "4.8" },
              { name: "Dra. Beatriz Souza", spec: "Neurodinâmica · Pilates clínico", city: "Curitiba - PR", rating: "5.0" },
            ].map((p) => (
              <div key={p.name} className="flex items-center gap-3 rounded-lg border border-border/60 p-3 opacity-80">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <Stethoscope className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{p.spec} · {p.city}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">★ {p.rating}</Badge>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground italic text-center pt-1">
              Visualização ilustrativa — disponível para assinantes Premium.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={closeFindProDialog} className="rounded-xl">
              Voltar ao demo
            </Button>
            <Button onClick={() => { closeFindProDialog(); goSubscribe(); }} className="rounded-xl gap-1.5">
              <Crown className="h-4 w-4" /> Assinar Premium
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openAssessment} onOpenChange={(o) => !o && closeOpenAssessment()}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
          {openAssessment && (
            <>
              <DialogHeader className="px-6 pt-6 pb-3 border-b">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">
                    <Sparkles className="h-3 w-3 mr-1" /> Premium
                  </Badge>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Concluída
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(openAssessment.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                  </span>
                </div>
                <DialogTitle className="text-left text-lg pt-1">{openAssessment.label}</DialogTitle>
                <DialogDescription className="text-left">
                  Prontuário simulado — Mariana Silva (Demo) · 34 anos · ciatalgia direita
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[65vh] px-6 py-4">
                <div className="space-y-5">
                  <section className="rounded-lg border border-primary/20 bg-primary/[0.03] p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">Hipótese preliminar (IA)</h4>
                      <Badge variant="outline" className="text-[10px] ml-auto bg-emerald-500/10 text-emerald-700 border-emerald-200">
                        Confiança: {({ high: "alta", medium: "moderada", moderate: "moderada", low: "baixa", alta: "alta", média: "moderada", moderada: "moderada", baixa: "baixa" } as Record<string, string>)[String(openAssessment.confidence).toLowerCase()] ?? openAssessment.confidence}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{openAssessment.hypothesis}</p>
                  </section>

                  <section className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-800">
                      <strong>Red flags:</strong> nenhuma detectada. Caso liberado para abordagem fisioterapêutica.
                    </p>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" /> Métricas principais
                    </h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">EVA</p>
                        <p className="text-xl font-bold text-foreground">{openAssessment.pain_score}/10</p>
                      </div>
                      <div className="rounded-lg border p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">ODI</p>
                        <p className="text-xl font-bold text-foreground">{openAssessment.odi}%</p>
                      </div>
                      <div className="rounded-lg border p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">SF-36</p>
                        <p className="text-xl font-bold text-foreground">{openAssessment.sf36}%</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" /> Regiões de dor
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {openAssessment.pain_regions.map((r) => (
                        <span key={r} className="text-xs bg-muted text-foreground px-2.5 py-1 rounded-full">
                          {painRegionLabels[r] || r}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-muted-foreground" /> Anamnese resumida
                    </h4>
                    <div className="rounded-lg border divide-y text-sm">
                      {[
                        ["Início", openAssessment.anamnesis.onset],
                        ["Caráter da dor", openAssessment.anamnesis.character],
                        ["Fatores de piora", openAssessment.anamnesis.aggravators],
                        ["Fatores de alívio", openAssessment.anamnesis.relievers],
                        ["Sono", openAssessment.anamnesis.sleep],
                        ["Objetivos do paciente", openAssessment.anamnesis.goals],
                      ].map(([k, v]) => (
                        <div key={k} className="px-3 py-2 grid grid-cols-[120px_1fr] gap-2">
                          <span className="text-xs text-muted-foreground">{k}</span>
                          <span className="text-xs text-foreground">{v}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" /> Testes funcionais
                    </h4>
                    <div className="rounded-lg border divide-y">
                      {openAssessment.tests.map((t) => {
                        const color =
                          t.flag === "positive" ? "text-destructive" :
                          t.flag === "warning" ? "text-amber-600" : "text-emerald-600";
                        const Icon =
                          t.flag === "positive" ? AlertCircle :
                          t.flag === "warning" ? AlertCircle : CheckCircle2;

                        return (
                          <div key={t.name} className="px-3 py-2 flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${color} shrink-0`} />
                            <span className="text-xs text-foreground flex-1">{t.name}</span>
                            <span className={`text-xs font-medium ${color}`}>{t.result}</span>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" /> Questionários validados
                    </h4>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {openAssessment.questionnaires.map((q) => (
                        <div key={q.name} className="rounded-lg border p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-foreground">{q.name}</p>
                            <p className={`text-base font-bold ${q.color}`}>{q.score}</p>
                          </div>
                          <p className={`text-[11px] ${q.color}`}>{q.severity}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-muted-foreground" /> Plano de tratamento (STEPS)
                    </h4>
                    <ul className="rounded-lg border divide-y text-sm">
                      {openAssessment.plan.map((step, i) => (
                        <li key={i} className="px-3 py-2 flex items-start gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-xs text-foreground">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <div className="rounded-lg border border-amber-300/40 bg-amber-50/40 p-3 flex items-start gap-2">
                    <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-900/80">
                      Esta é uma visualização ilustrativa do prontuário. No app real, cada autoavaliação
                      gera um <strong>PDF clínico completo</strong> que pode ser compartilhado com seu fisioterapeuta.
                    </p>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter className="px-6 py-3 border-t bg-muted/30 flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={closeOpenAssessment} className="rounded-xl">
                  Fechar
                </Button>
                <Button onClick={() => { closeOpenAssessment(); goSubscribe(); }} className="rounded-xl gap-1.5">
                  <Crown className="h-4 w-4" /> Quero meu prontuário real
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PatientDemoDialogs;