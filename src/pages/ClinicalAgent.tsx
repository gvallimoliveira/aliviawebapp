import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useClinicalAgentAccess } from "@/hooks/useClinicalAgentAccess";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  Loader2, Send, Plus, Menu, Trash2, ArrowLeft,
  UserPlus, X, BookOpen, Sparkles, AlertTriangle, Archive, Pencil, Check,
} from "lucide-react";
import logoAlivia from "@/assets/logo-alivia.png";

type Thread = {
  id: string;
  title: string;
  patient_id: string | null;
  archived: boolean;
  updated_at: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  parts: Array<{ type: string; text?: string }>;
  citations: Array<{ id: string; title: string; authors?: string; year?: number; pedro_score?: number; doi?: string; source_url?: string }> | null;
  created_at: string;
};

const PROMPT_STARTERS = [
  "Discutir hipótese deste paciente",
  "Sugerir testes funcionais",
  "Revisar o HEP atual",
  "/evidência dor lombar crônica",
];
function ThreadRow({
  thread, patientName, active, onOpen, onDelete,
}: {
  thread: Thread;
  patientName?: string;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const dragging = useRef(false);
  const didSwipe = useRef(false);
  const REVEAL = 72;

  useEffect(() => {
    if (!active) {
      setOffset(0);
      setRevealed(false);
      didSwipe.current = false;
    }
  }, [active]);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    dragging.current = false;
    didSwipe.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - (startY.current ?? 0);
    if (!dragging.current) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) dragging.current = true;
      else return;
    }
    didSwipe.current = true;
    const base = revealed ? -REVEAL : 0;
    const next = Math.min(0, Math.max(-REVEAL, base + dx));
    setOffset(next);
  };
  const onTouchEnd = () => {
    if (dragging.current) {
      const shouldReveal = offset < -REVEAL / 2;
      setRevealed(shouldReveal);
      setOffset(shouldReveal ? -REVEAL : 0);
    }
    startX.current = null;
    startY.current = null;
    setTimeout(() => { dragging.current = false; }, 0);
  };
  const onTouchCancel = () => {
    setOffset(revealed ? -REVEAL : 0);
    startX.current = null;
    startY.current = null;
    dragging.current = false;
  };
  const handleClick = () => {
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    if (revealed) { setRevealed(false); setOffset(0); return; }
    onOpen();
  };
  const actionTranslate = Math.max(0, REVEAL + offset);
  const actionVisible = revealed || offset <= -6;

  return (
    <div className="relative overflow-hidden rounded-lg">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute inset-y-0 right-0 z-0 w-[72px] flex items-center justify-center bg-destructive text-destructive-foreground transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${actionTranslate}px)`,
          opacity: actionVisible ? 1 : 0,
          pointerEvents: actionVisible ? "auto" : "none",
        }}
        aria-label="Excluir conversa"
      >
        <Trash2 className="h-5 w-5" />
      </button>
      <div
        className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
          active ? "bg-primary/10 text-foreground" : "bg-background hover:bg-muted/50 text-muted-foreground"
        }`}
        style={{ transform: `translateX(${offset}px)`, transition: dragging.current ? "none" : "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)", willChange: "transform", touchAction: "pan-y" }}
        onClick={handleClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        <div className="flex-1 min-w-0">
          <div className="truncate font-medium">{thread.title}</div>
          {patientName && <div className="text-[10px] text-primary/80 truncate">📋 {patientName}</div>}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="hidden md:block opacity-0 group-hover:opacity-100 transition p-1 hover:text-destructive"
          aria-label="Excluir conversa"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}


const ClinicalAgent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { threadId } = useParams();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get("patient");
  const { hasAccess, isBetaInternal, checked } = useClinicalAgentAccess();
  const { activeClinic, isClinicMode } = useClinic();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [creatingThread, setCreatingThread] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [patients, setPatients] = useState<Array<{ id: string; full_name: string }>>([]);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [generatingHep, setGeneratingHep] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Access gate
  useEffect(() => {
    if (checked && !hasAccess) {
      navigate("/dashboard", { replace: true });
    }
  }, [checked, hasAccess, navigate]);

  // Seed input from sessionStorage (set by "Discutir com agente" on prontuário)
  useEffect(() => {
    try {
      const seed = sessionStorage.getItem("agent_seed_input");
      if (seed) {
        setInput(seed);
        sessionStorage.removeItem("agent_seed_input");
      }
    } catch {}
  }, []);

  // Load threads + patients
  useEffect(() => {
    if (!user || !hasAccess) return;
    (async () => {
      const sb = supabase as any;
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const thRes: any = await sb.from("agent_threads")
        .select("id, title, patient_id, archived, updated_at")
        .eq("user_id", user.id).eq("archived", false)
        .gte("updated_at", sevenDaysAgo)
        .order("updated_at", { ascending: false });


      // Load patients matching the user's professional/clinic context
      // (patients table uses professional_id and clinic_id, NOT user_id)
      let professionalId: string | null = null;
      const { data: proRow } = await sb.from("professionals")
        .select("id").eq("user_id", user.id).maybeSingle();
      professionalId = proRow?.id || null;

      const clinicId = isClinicMode && activeClinic ? activeClinic.clinic_id : null;

      let pt: Array<{ id: string; full_name: string }> = [];
      if (clinicId) {
        const { data } = await sb.from("patients")
          .select("id, full_name").eq("clinic_id", clinicId).order("full_name");
        pt = data || [];
      } else if (professionalId) {
        const { data } = await sb.from("patients")
          .select("id, full_name").eq("professional_id", professionalId).order("full_name");
        pt = data || [];
      }

      const th = thRes.data as Thread[] | null;
      setThreads(th || []);
      setPatients(pt);
      setLoadingThreads(false);

      // Bootstrap thread selection
      if (threadId) {
        const found = (th || []).find(t => t.id === threadId);
        if (found) {
          setActiveThread(found);
        } else {
          navigate("/agente", { replace: true });
        }
      } else if (initialPatientId) {
        await createThread(initialPatientId);
      } else if ((th || []).length > 0) {
        setActiveThread(th![0]);
        navigate(`/agente/${th![0].id}`, { replace: true });
      } else {
        await createThread(null);
      }

    })();
  }, [user, hasAccess, isClinicMode, activeClinic?.clinic_id]);

  // Load messages when active thread changes
  useEffect(() => {
    if (!activeThread) { setMessages([]); return; }
    (async () => {
      const { data } = await supabase
        .from("agent_messages")
        .select("id, role, parts, citations, created_at")
        .eq("thread_id", activeThread.id)
        .order("created_at", { ascending: true });
      setMessages((data || []) as any);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    })();
  }, [activeThread?.id]);

  const createThread = async (patient_id: string | null) => {
    setSheetOpen(false);
    setCreatingThread(true);
    setMessages([]);
    setActiveThread(null);
    try {
      const { data, error } = await supabase.functions.invoke("clinical-agent-threads", {
        body: { action: "create", patient_id },
      });
      if (error || data?.error) {
        toast.error("Não foi possível criar a conversa");
        return;
      }
      const newThread = data.thread as Thread;
      setThreads(prev => [newThread, ...prev]);
      setActiveThread(newThread);
      navigate(`/agente/${newThread.id}`, { replace: true });
    } finally {
      setCreatingThread(false);
    }
  };

  const generateHep = async () => {
    if (!activeThread?.patient_id || generatingHep) return;
    setGeneratingHep(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-generate-hep", {
        body: { thread_id: activeThread.id, patient_id: activeThread.patient_id },
      });
      if (error || data?.error) {
        const code = data?.error || error?.message;
        if (code === "no_assessment") toast.error("Este paciente ainda não tem avaliação. Faça uma avaliação antes.");
        else if (code === "no_professional") toast.error("Apenas profissionais com perfil PRO podem gerar HEP.");
        else toast.error("Não foi possível gerar o HEP agora.");
        return;
      }
      toast.success("HEP gerado!");
      // Reload messages to include the assistant note with the link
      const { data: msgs } = await supabase
        .from("agent_messages")
        .select("id, role, parts, citations, created_at")
        .eq("thread_id", activeThread.id)
        .order("created_at", { ascending: true });
      setMessages((msgs || []) as any);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } finally {
      setGeneratingHep(false);
    }
  };

  const deleteThread = async (id: string) => {
    setThreads(prev => prev.filter(t => t.id !== id));
    if (activeThread?.id === id) {
      navigate("/agente", { replace: true });
      setActiveThread(null);
    }
    const { error } = await supabase.functions.invoke("clinical-agent-threads", {
      body: { action: "delete", thread_id: id },
    });
    if (error) toast.error("Não foi possível excluir.");
    else toast.success("Conversa excluída");

  };

  const attachPatient = async (patient_id: string | null) => {
    if (!activeThread) return;
    await supabase.functions.invoke("clinical-agent-threads", {
      body: { action: "attach_patient", thread_id: activeThread.id, patient_id },
    });
    setActiveThread({ ...activeThread, patient_id });
    setThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, patient_id } : t));
    setShowPatientPicker(false);
  };

  const saveTitle = async () => {
    if (!activeThread) return;
    const newTitle = titleDraft.trim().slice(0, 120);
    if (!newTitle || newTitle === activeThread.title) { setEditingTitle(false); return; }
    setActiveThread({ ...activeThread, title: newTitle });
    setThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, title: newTitle } : t));
    setEditingTitle(false);
    const { error } = await supabase.functions.invoke("clinical-agent-threads", {
      body: { action: "rename", thread_id: activeThread.id, title: newTitle },
    });
    if (error) toast.error("Não foi possível renomear");
  };

  const send = async () => {
    if (!input.trim() || !activeThread || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic user message
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      parts: [{ type: "text", text }],
      citations: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    const { data, error } = await supabase.functions.invoke("clinical-agent-chat", {
      body: { thread_id: activeThread.id, message: text },
    });

    if (error || data?.error) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      const code = data?.error || error?.message;
      if (code === "quota_exceeded") {
        toast.error(`Limite diário atingido (${data?.limit || 30} mensagens). Volte amanhã.`);
      } else if (code === "ai_credits_exhausted") {
        toast.error("Créditos de IA esgotados. Entre em contato com o admin.");
      } else if (code === "ai_rate_limit") {
        toast.error("Muitas requisições. Aguarde alguns segundos.");
      } else {
        toast.error("Erro ao enviar mensagem.");
      }
      setSending(false);
      return;
    }

    // Reload messages from server (gets persisted IDs + assistant + citations)
    const { data: msgs } = await supabase
      .from("agent_messages")
      .select("id, role, parts, citations, created_at")
      .eq("thread_id", activeThread.id)
      .order("created_at", { ascending: true });
    setMessages((msgs || []) as any);
    setSending(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

    // Refresh thread title if changed
    const { data: th } = await supabase.from("agent_threads")
      .select("id, title, patient_id, archived, updated_at")
      .eq("user_id", user!.id).eq("archived", false).order("updated_at", { ascending: false });
    setThreads(th || []);
    const updated = (th || []).find(t => t.id === activeThread.id);
    if (updated) setActiveThread(updated);
  };

  const linkedPatient = patients.find(p => p.id === activeThread?.patient_id);
  const allCitations = messages.flatMap(m => m.citations || []);
  const uniqueCitations = Array.from(new Map(allCitations.map(c => [c.id, c])).values());

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!hasAccess) return null;

  const ThreadList = ({ withClose = false }: { withClose?: boolean }) => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border/40 flex items-center gap-2">
        <Button onClick={() => createThread(null)} className="flex-1 gap-2" size="sm">
          <Plus className="h-4 w-4" /> Nova conversa
        </Button>
        {withClose && (
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="Fechar">
              <X className="h-5 w-5" />
            </Button>
          </SheetClose>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loadingThreads ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Carregando…</div>
          ) : threads.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">Nenhuma conversa ainda.</div>
          ) : threads.map(t => {
            const p = patients.find(pp => pp.id === t.patient_id);
            const active = t.id === activeThread?.id;
            return (
              <ThreadRow
                key={t.id}
                thread={t}
                patientName={p?.full_name}
                active={active}
                onOpen={() => { setActiveThread(t); setSheetOpen(false); navigate(`/agente/${t.id}`); }}
                onDelete={() => deleteThread(t.id)}
              />
            );
          })}

        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="h-screen w-full flex bg-background overflow-hidden relative">
      {/* Background logo (suave) */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.08] z-0"
        aria-hidden
      >
        <img
          src={logoAlivia}
          alt=""
          className="w-[70vmin] max-w-[640px]"
        />
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-72 border-r border-border/40 bg-card/60 backdrop-blur-sm relative z-10 flex-col">
        <div className="p-4 border-b border-border/40 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-sm font-semibold">Agente Clínico</h2>
            <Badge variant="outline" className="h-4 text-[9px] px-1.5 mt-0.5">BETA</Badge>
          </div>
        </div>
        <ThreadList />
      </aside>

      {/* Main chat */}
      <main className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* Header */}
        <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm px-4 py-3 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9 shrink-0"
            onClick={() => navigate("/dashboard")}
            title="Voltar ao dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[85vw] max-w-xs [&>button]:hidden">
              <ThreadList withClose />
            </SheetContent>
          </Sheet>


          <div className="flex-1 min-w-0">
            {editingTitle && activeThread ? (
              <div className="flex items-center gap-1">
                <Input
                  autoFocus
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") { e.preventDefault(); saveTitle(); }
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  onBlur={saveTitle}
                  className="h-7 text-sm font-semibold px-2"
                  maxLength={120}
                />
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={saveTitle}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!activeThread) return;
                  setTitleDraft(activeThread.title || "");
                  setEditingTitle(true);
                }}
                className="group flex items-center gap-1.5 min-w-0 max-w-full text-left"
                disabled={!activeThread}
                title="Renomear conversa"
              >
                <h1 className="text-sm font-semibold truncate">{activeThread?.title || (creatingThread ? "Criando conversa…" : "Agente Clínico")}</h1>
                {activeThread && <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 shrink-0" />}
              </button>
            )}
            {linkedPatient && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="secondary" className="text-[10px] gap-1">
                  📋 {linkedPatient.full_name}
                  <button onClick={() => attachPatient(null)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}
          </div>

          {activeThread && !linkedPatient && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowPatientPicker(true)}>
              <UserPlus className="h-3.5 w-3.5" /> Vincular paciente
            </Button>
          )}

          {activeThread && linkedPatient && (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={generateHep}
              disabled={generatingHep}
              title="Gera um HEP real (com link) baseado na última avaliação deste paciente"
            >
              {generatingHep ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Gerar HEP
            </Button>
          )}

          {uniqueCitations.length > 0 && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setShowCitations(true)}>
              <BookOpen className="h-3.5 w-3.5" /> {uniqueCitations.length}
            </Button>
          )}
        </header>

        {isBetaInternal && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Modo interno (VIP) — recurso ainda não liberado para o público.
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Vamos raciocinar juntos?</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Discuta casos clínicos com base em evidências (PEDro ≥ 7).<br/>
                    Dados do paciente são anonimizados antes do processamento.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center pt-4">
                  {PROMPT_STARTERS.map(s => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="px-3 py-1.5 rounded-full text-xs border border-border/60 hover:bg-primary/10 hover:border-primary/40 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(m => {
              const text = m.parts.filter(p => p.type === "text").map(p => p.text).join("\n");
              if (m.role === "user") {
                return (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm whitespace-pre-wrap">
                      {text}
                    </div>
                  </div>
                );
              }
              return (
                <div key={m.id} className="flex justify-start">
                  <div className="max-w-[85%] bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-3 text-sm shadow-sm">
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-2 prose-a:text-primary prose-a:font-medium">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            <a
                              href={href || "#"}
                              target={href?.startsWith("http") ? "_blank" : undefined}
                              rel="noopener noreferrer"
                              className="text-primary underline underline-offset-2 hover:text-primary/80"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >{text}</ReactMarkdown>
                    </div>
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.citations.map(c => (
                          <Badge key={c.id} variant="outline" className="text-[10px] bg-background/60">
                            {(c.authors?.split(",")[0] || "—")}, {c.year || "—"} · PEDro {c.pedro_score ?? "—"}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div className="flex gap-1 items-center text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Pensando…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Composer */}
        <div className="border-t border-border/40 bg-card/80 backdrop-blur-sm p-3">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Pergunte ao agente…"
              className="min-h-[44px] max-h-[160px] resize-none rounded-xl"
              style={{ fontSize: "16px" }}
              rows={1}
              disabled={sending || !activeThread || creatingThread}
            />
            <Button
              size="icon"
              className="h-11 w-11 rounded-xl shrink-0"
              onClick={send}
              disabled={!input.trim() || sending || !activeThread}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="max-w-3xl mx-auto text-[10px] text-muted-foreground mt-2 px-1">
            Dados do paciente são anonimizados antes do processamento por IA. Este é um apoio ao raciocínio — a decisão clínica é sua.
          </p>
        </div>
      </main>

      {/* Patient picker modal */}
      {showPatientPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowPatientPicker(false)}>
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-md max-h-[70vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
              <h3 className="font-semibold text-sm">Vincular paciente</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowPatientPicker(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="p-2">
                {patients.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">Nenhum paciente cadastrado.</div>
                ) : patients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => attachPatient(p.id)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-primary/10 text-sm"
                  >
                    {p.full_name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Citations panel */}
      {showCitations && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCitations(false)}>
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border/40 flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" /> Evidências citadas</h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCitations(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {uniqueCitations.map(c => (
                  <div key={c.id} className="border border-border/40 rounded-lg p-3 space-y-1">
                    <div className="text-sm font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.authors || "—"} · {c.year || "—"} · <span className="text-primary">PEDro {c.pedro_score ?? "—"}</span>
                    </div>
                    {(c.doi || c.source_url) && (
                      <a
                        href={c.source_url || `https://doi.org/${c.doi}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Abrir →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalAgent;
