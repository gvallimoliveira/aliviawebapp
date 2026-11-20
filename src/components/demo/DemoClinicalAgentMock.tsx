import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain, Plus, MessageSquare, Sparkles, Dumbbell, ClipboardList,
  UserPlus, BookOpen, Stethoscope, ChevronRight, Send, Lock, ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_CLINICAL_THREADS, DEMO_DEEP_REPLIES, type DemoTool, type DemoMessage, type DemoThread } from "@/data/demoClinicalConversations";

type Tool = DemoTool;
type Msg = DemoMessage;
type Thread = DemoThread;
const PREBAKED = DEMO_CLINICAL_THREADS;
const NEW_CASCADES = DEMO_CLINICAL_THREADS.map(thread => ({ topic: thread.title, steps: thread.messages.slice(1) }));
const SCRIPTED_REPLIES = DEMO_DEEP_REPLIES;

const FAREWELL_MSG: Msg = {
  role: "assistant",
  text: "Esta conversa é roteirizada e não gravou dados de pacientes. No modo real, o profissional revisa o histórico, as evidências disponíveis e as propostas antes de aplicar qualquer conduta.",
};


// ───────── UI ─────────
function ToolCard({ tool }: { tool: Tool }) {
  const base = "mt-2 rounded-lg border bg-muted/30 p-3 text-xs space-y-1.5";
  if (tool.kind === "hep") {
    return (
      <div className={base}>
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Dumbbell className="h-3.5 w-3.5 text-primary" /> {tool.title}
        </div>
        <ul className="space-y-0.5 pl-4 list-disc text-muted-foreground">
          {tool.items.map((i, k) => <li key={k}>{i}</li>)}
        </ul>
      </div>
    );
  }
  if (tool.kind === "tests") {
    return (
      <div className={base}>
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <ClipboardList className="h-3.5 w-3.5 text-primary" /> {tool.title}
        </div>
        <ul className="space-y-0.5 pl-4 list-disc text-muted-foreground">
          {tool.items.map((i, k) => <li key={k}>{i}</li>)}
        </ul>
      </div>
    );
  }
  if (tool.kind === "link") {
    return (
      <div className={base}>
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <UserPlus className="h-3.5 w-3.5 text-primary" /> {tool.title}
        </div>
        <div className="text-muted-foreground">{tool.patient}</div>
      </div>
    );
  }
  return (
    <div className={base}>
      <div className="flex items-center gap-1.5 font-semibold text-foreground">
        <BookOpen className="h-3.5 w-3.5 text-primary" /> {tool.title}
      </div>
      <ul className="space-y-0.5 pl-4 list-disc text-muted-foreground">
        {tool.refs.map((i, k) => <li key={k}>{i}</li>)}
      </ul>
    </div>
  );
}

const DemoClinicalAgentMock = ({ patientNames }: { patientNames?: string[] }) => {
  const available = patientNames ? PREBAKED.filter(t => !t.patient || patientNames.includes(t.patient)) : PREBAKED;
  const [threads, setThreads] = useState<Thread[]>(available);
  const [activeId, setActiveId] = useState<string>(available[0]?.id ?? "");
  const [isNew, setIsNew] = useState(false);
  const [pending, setPending] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = useMemo(() => threads.find((t) => t.id === activeId), [threads, activeId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages.length, isNew]);

  const openThread = (id: string) => {
    setActiveId(id);
    setIsNew(false);
    setMobileView("chat");
  };

  const startNew = () => {
    const id = `new-${Date.now()}`;
    const thread: Thread = {
      id, title: "Nova conversa", preview: "—", updatedAt: "agora",
      messages: [{
        role: "assistant",
        text: "Olá! Sou o **Agente de Raciocínio Clínico** da Aliv.iA. Posso discutir casos (com anonimização automática), sugerir testes, gerar HEP baseado em evidências e vincular pacientes. Por onde quer começar?",
        suggestions: NEW_CASCADES.filter(c => available.some(t => t.title === c.topic)).map((c) => c.topic),
      }],
    };
    setThreads((prev) => [thread, ...prev]);
    setActiveId(id);
    setIsNew(true);
    setMobileView("chat");
  };

  const pickSuggestion = (text: string) => {
    if (!active || pending) return;
    setPending(true);

    // For new conversations, drive through NEW_CASCADES. For prebaked threads, suggestion just appends a polite closing.
    const cascade = NEW_CASCADES.find((c) => c.topic === text);

    // Append user message immediately
    setThreads((prev) => prev.map((t) => t.id === active.id
      ? { ...t, title: t.title === "Nova conversa" ? text.slice(0, 60) : t.title, messages: [...t.messages, { role: "user", text }] }
      : t));

    if (cascade) {
      // Play cascade steps with delays
      cascade.steps.forEach((step, idx) => {
        setTimeout(() => {
          setThreads((prev) => prev.map((t) => t.id === active.id
            ? { ...t, messages: [...t.messages, step] }
            : t));
          if (idx === cascade.steps.length - 1) setPending(false);
        }, 700 * (idx + 1));
      });
    } else {
      // Play a real scripted reply (if available) and then the farewell + PRO CTA.
      const reply = SCRIPTED_REPLIES[text];
      const steps: Msg[] = reply ? [reply] : [FAREWELL_MSG];
      steps.forEach((step, idx) => {
        setTimeout(() => {
          setThreads((prev) => prev.map((t) => t.id === active.id
            ? { ...t, messages: [...t.messages, step] }
            : t));
          if (idx === steps.length - 1) setPending(false);
        }, 800 * (idx + 1));
      });
    }

  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold">Agente de Raciocínio Clínico</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> Simulação · respostas roteirizadas para demonstração
              </p>
            </div>
          </div>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300/40 text-[10px]">
            Modo demo
          </Badge>
        </div>

        <div className="grid md:grid-cols-[260px_1fr] min-h-[520px]">
          {/* Sidebar */}
          <aside className={cn(
            "md:border-r md:border-b-0 border-b bg-muted/10",
            mobileView === "chat" ? "hidden md:block" : "block"
          )}>
            <div className="p-3">
              <Button onClick={startNew} className="w-full gap-1.5 rounded-xl" size="sm">
                <Plus className="h-3.5 w-3.5" /> Nova conversa
              </Button>
            </div>
            <ScrollArea className="h-[420px] md:h-[460px]">
              <div className="px-2 pb-3 space-y-1">
                {threads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openThread(t.id)}
                    className={cn(
                      "w-full text-left rounded-lg px-2.5 py-2 text-xs transition-colors",
                      t.id === activeId ? "bg-primary/10 text-foreground" : "hover:bg-muted/60 text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-medium text-foreground line-clamp-1">
                      <MessageSquare className="h-3 w-3 shrink-0" /> {t.title}
                    </div>
                    <div className="line-clamp-1 mt-0.5 pl-4">{t.preview}</div>
                    <div className="pl-4 mt-0.5 text-[10px] opacity-70">{t.updatedAt}{t.patient ? ` · ${t.patient}` : ""}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </aside>

          {/* Chat */}
          <section className={cn(
            "flex flex-col",
            mobileView === "list" ? "hidden md:flex" : "flex"
          )}>
            {/* Mobile chat header with back */}
            <div className="md:hidden flex items-center gap-2 border-b bg-muted/20 px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileView("list")}
                className="h-7 gap-1 px-2 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Conversas
              </Button>
              <span className="text-xs font-medium text-foreground line-clamp-1 flex-1">
                {active?.title}
              </span>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[460px]">
              {active?.messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted/50 text-foreground rounded-bl-sm"
                  )}>
                    <div className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{
                      __html: m.text
                        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\*(.+?)\*/g, "<em>$1</em>"),
                    }} />
                    {m.tool && <ToolCard tool={m.tool} />}
                    {m.suggestions && m.suggestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {m.suggestions.map((s, k) => (
                          <button
                            key={k}
                            disabled={pending}
                            onClick={() => pickSuggestion(s)}
                            className="text-[11px] inline-flex items-center gap-1 rounded-full border border-primary/30 bg-background px-2.5 py-1 text-foreground hover:bg-primary/5 disabled:opacity-50"
                          >
                            <Sparkles className="h-3 w-3 text-primary" /> {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {pending && (
                <div className="flex justify-start">
                  <div className="bg-muted/50 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm text-muted-foreground italic">
                    Pensando<span className="animate-pulse">…</span>
                  </div>
                </div>
              )}
            </div>

            {/* Fake composer */}
            <div className="border-t bg-background p-3">
              <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 opacity-70">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground flex-1">
                  {isNew || pending
                    ? "Clique numa sugestão acima para simular a conversa…"
                    : "Composer desabilitado no demo · use as sugestões para emular a conversa"}
                </span>
                <Button size="icon" variant="ghost" disabled className="h-7 w-7">
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground text-center flex items-center justify-center gap-1">
                <ChevronRight className="h-3 w-3" /> No modo real, o agente acessa o histórico do paciente, evidência atualizada e gera HEP prontos para envio.
              </p>
            </div>
          </section>
        </div>
      </CardContent>
    </Card>
  );
};

export default DemoClinicalAgentMock;
