import { threadScope } from "@/lib/careScope";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useClinicalAgentAccess } from "@/hooks/useClinicalAgentAccess";
import { Button } from "@/components/ui/button";
import { AgentMessageInput } from "@/components/agent/AgentMessageInput";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  Loader2, Send, Plus, Menu, Trash2, ArrowLeft,
  UserPlus, X, BookOpen, Sparkles, Dumbbell, AlertTriangle, Pencil, Check, Brain, Lock, GraduationCap, Terminal, Home, BookText, Paperclip, FileText, Image as ImageIcon,
} from "lucide-react";
import logoAlivia from "@/assets/logo-alivia.png";
import QuizCard, { type Quiz } from "@/components/agent/QuizCard";
import MentorCommandsPopover from "@/components/agent/MentorCommandsPopover";
import ProBottomTabBar from "@/components/dashboard/ProBottomTabBar";
import AgentKnowledgeBrowser from "@/components/agent/AgentKnowledgeBrowser";

type Thread = {
  id: string;
  title: string;
  patient_id: string | null;
  archived: boolean;
  updated_at: string;
  created_at?: string;
  mentor_mode?: boolean;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  parts: Array<{ type: string; text?: string; quiz?: Quiz }>;
  citations: Array<{ id: string; title: string; authors?: string; year?: number; pedro_score?: number; doi?: string; source_url?: string }> | null;
  created_at: string;
};

const PROMPT_STARTERS = [
  "Discutir hipótese deste paciente",
  "/professor",
  "/quiz tendinopatia patelar",
  "/caso lombalgia crônica",
  "/traduzir https://pubmed.ncbi.nlm.nih.gov/...",
  "/trilha ombro 1",
];
function ThreadRow({
  thread, patientName, active, onOpen, onDelete, onExportPdf, exporting,
}: {
  thread: Thread;
  patientName?: string;
  active: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onExportPdf: () => void;
  exporting?: boolean;
}) {
  return (
    <div
      className={`w-full rounded-2xl border px-2 py-2 transition-colors ${
        active
          ? "border-primary/30 bg-primary/10"
          : "border-border/50 bg-card/70 hover:bg-muted/40"
      }`}
    >
      <div className="grid w-full grid-cols-[minmax(0,1fr)_2.75rem_2.75rem] items-center gap-2">
        <button
          type="button"
          onClick={onOpen}
          className={`min-w-0 w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
            active ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <div className="min-w-0">
            <div className="truncate font-medium text-[15px] leading-5">{thread.title}</div>
            {patientName && (
              <div className="mt-1 truncate text-xs text-primary/80">📋 {patientName}</div>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExportPdf();
          }}
          disabled={exporting}
          className="flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-xl border border-primary/25 bg-primary/10 text-primary shadow-sm transition-colors hover:bg-primary/15 active:scale-[0.98] disabled:opacity-60"
          aria-label="Salvar conversa em PDF"
          title="Salvar conversa em PDF"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-xl border border-destructive/20 bg-destructive/10 text-destructive shadow-sm transition-colors hover:bg-destructive/15 active:scale-[0.98]"
          aria-label="Excluir conversa"
          title="Excluir conversa"
        >
          <Trash2 className="h-4 w-4" />
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
  const initialSeed = searchParams.get("seed");
  const seedConsumedRef = useRef(false);
  const { hasAccess, isBetaInternal, checked } = useClinicalAgentAccess();
  const { activeClinic, isClinicMode } = useClinic();
  const careClinicId = isClinicMode ? activeClinic?.clinic_id || null : null;
  const careKey = `${user?.id || ""}:${careClinicId || "solo"}`;
  const careKeyRef = useRef(careKey);
  careKeyRef.current = careKey;

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [creatingThread, setCreatingThread] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [patients, setPatients] = useState<Array<{ id: string; full_name: string }>>([]);
  const [resolvedLinkedPatient, setResolvedLinkedPatient] = useState<{ id: string; full_name: string } | null>(null);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [generatingHep, setGeneratingHep] = useState(false);
  const [exportingThreadId, setExportingThreadId] = useState<string | null>(null);
  const [hepLevel, setHepLevel] = useState<"auto" | "beginner" | "intermediate" | "advanced">("auto");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [professionalId, setProfessionalId] = useState<string>("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const bootstrappedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  type Attachment = {
    id: string;
    name: string;
    mime: string;
    status: "analyzing" | "ready" | "error";
    extracted?: string;
    error?: string;
  };
  const [attachments, setAttachments] = useState<Attachment[]>([]);


  // Subscription gate — instead of redirecting when there's no active plan,
  // we render a CTA screen (same pattern as the other gated tabs).
  const [subState, setSubState] = useState<{ checked: boolean; subscribed: boolean; isPartner: boolean }>({
    checked: false, subscribed: false, isPartner: false,
  });
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("check-pro-subscription");
        setSubState({
          checked: true,
          subscribed: !!data?.subscribed,
          isPartner: !!data?.is_partner,
        });
      } catch {
        setSubState({ checked: true, subscribed: false, isPartner: false });
      }
    })();
  }, [user?.id]);

  const clinicCoversAccess = !!(isClinicMode && activeClinic &&
    (activeClinic.subscription_status === "active" || activeClinic.subscription_status === "trialing"));
  const hasActivePlan =
    subState.subscribed || subState.isPartner || clinicCoversAccess;

  const handleStartSubscription = async () => {
    setSubscribing(true);
    try {
      let coupon: string | undefined;
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
      if (isDesktop) {
        const input = window.prompt(
          "Tem um cupom de desconto? Digite o código (ou deixe em branco):",
          ""
        );
        if (input && input.trim()) coupon = input.trim().toUpperCase();
      }
      const { data, error } = await supabase.functions.invoke("create-pro-subscription", {
        body: { plan: "monthly", coupon },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast.error("Não foi possível abrir o checkout. Tente novamente.");
    } finally {
      setSubscribing(false);
    }
  };

  useEffect(() => {
    const patientId = activeThread?.patient_id;
    if (!patientId) {
      setResolvedLinkedPatient(null);
      return;
    }

    const patientFromList = patients.find((patient) => patient.id === patientId) || null;
    if (patientFromList) {
      setResolvedLinkedPatient(patientFromList);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await threadScope(supabase
        .from("patients")
        .select("id, full_name")
        .eq("id", patientId), careClinicId)
        .maybeSingle();

      if (!cancelled) {
        setResolvedLinkedPatient(data || null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeThread?.patient_id, patients, careClinicId]);

  // Load threads + patients
  useEffect(() => {
    setThreads([]); setPatients([]); setActiveThread(null); setMessages([]);
    setResolvedLinkedPatient(null); setInput(""); setAttachments([]);
    setLoadingThreads(true); bootstrappedRef.current = false;
    if (!user || !hasAccess || !hasActivePlan) return;
    let cancelled = false;
    const requestKey = careKey;
    (async () => {
      const sb = supabase as any;
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const thRes: any = await threadScope(sb.from("agent_threads")
        .select("id, title, patient_id, archived, updated_at, mentor_mode"), careClinicId)
        .eq("user_id", user.id).eq("archived", false)
        .gte("updated_at", sevenDaysAgo)
        .order("updated_at", { ascending: false });


      // Load patients matching the user's professional/clinic context
      // (patients table uses professional_id and clinic_id, NOT user_id)
      const { data: proRow } = await sb.from("professionals")
        .select("id").eq("user_id", user.id).maybeSingle();
      const myProfessionalId = proRow?.id || "";
      setProfessionalId(myProfessionalId);

      const clinicId = isClinicMode && activeClinic ? activeClinic.clinic_id : null;

      // Load hidden (archived) patient keys. The dashboard archives patients by
      // groupKey = (email || full_name), and stores that string in patient_email.
      // Mirror the same logic here so archived patients disappear from the picker
      // even when their patients-table row has no email.
      const hiddenKeys = new Set<string>();
      if (clinicId) {
        const { data: hid } = await sb.from("clinic_hidden_patients")
          .select("patient_email").eq("clinic_id", clinicId);
        (hid || []).forEach((h: any) => hiddenKeys.add(h.patient_email));
      } else if (myProfessionalId) {
        const { data: hid } = await sb.from("professional_hidden_patients")
          .select("patient_email").eq("professional_id", myProfessionalId);
        (hid || []).forEach((h: any) => hiddenKeys.add(h.patient_email));
      }

      let raw: Array<{ id: string; full_name: string; email: string | null; created_at: string }> = [];
      if (clinicId) {
        const { data } = await sb.from("patients")
          .select("id, full_name, email, created_at").eq("clinic_id", clinicId).order("full_name");
        raw = (data || []) as any;
      } else if (myProfessionalId) {
        const { data } = await sb.from("patients")
          .select("id, full_name, email, created_at").eq("professional_id", myProfessionalId).is("clinic_id", null).order("full_name");
        raw = (data || []) as any;
      }

      // Deduplicate by groupKey (email || full_name), keep most recent record,
      // and drop anything the user has archived.
      const dedup = new Map<string, { id: string; full_name: string; created_at: string }>();
      for (const p of raw) {
        const key = (p.email && p.email.trim()) || (p.full_name && p.full_name.trim()) || p.id;
        if (hiddenKeys.has(key)) continue;
        const existing = dedup.get(key);
        if (!existing || new Date(p.created_at).getTime() > new Date(existing.created_at).getTime()) {
          dedup.set(key, { id: p.id, full_name: p.full_name, created_at: p.created_at });
        }
      }
      const pt = Array.from(dedup.values())
        .map(({ id, full_name }) => ({ id, full_name }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name, "pt-BR"));

      if (cancelled || careKeyRef.current !== requestKey) return;
      const th = thRes.data as Thread[] | null;
      setThreads(th || []);
      setPatients(pt);
      setLoadingThreads(false);

      // Bootstrap thread selection (run once per mount)
      if (bootstrappedRef.current) return;
      bootstrappedRef.current = true;

      if (threadId) {
        const found = (th || []).find(t => t.id === threadId);
        if (found) {
          setActiveThread(found);
        } else {
          navigate("/agente", { replace: true });
        }
      } else if (initialPatientId && pt.some(p => p.id === initialPatientId)) {
        // Look for an existing (non-archived) thread linked to this patient,
        // ignoring the 7-day window so older threads can be resumed.
        const { data: existing } = await threadScope(sb.from("agent_threads")
          .select("id, title, patient_id, archived, updated_at"), careClinicId)
          .eq("user_id", user.id)
          .eq("patient_id", initialPatientId)
          .eq("archived", false)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (existing) {
          const existingThread = existing as Thread;
          setThreads(prev => prev.find(t => t.id === existingThread.id) ? prev : [existingThread, ...prev]);
          const linkedThread = await ensureThreadPatientLink(existingThread, initialPatientId);
          setActiveThread(linkedThread);
          navigate(`/agente/${linkedThread.id}`, { replace: true });
        } else {
          await createThread(initialPatientId);
        }
      }
      // Otherwise: stay on welcome screen — user picks "Nova conversa" or an existing thread.


    })();
    return () => { cancelled = true; };
  }, [user?.id, hasAccess, hasActivePlan, careKey]);

  // Load messages when active thread changes
  useEffect(() => {
    setMessages([]);
    if (!activeThread) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("agent_messages")
        .select("id, role, parts, citations, created_at")
        .eq("thread_id", activeThread.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setMessages((data || []) as any);
      if ((data || []).length > 0) {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
      }
    })();
    return () => { cancelled = true; };
  }, [activeThread?.id, careKey]);

  // Seed input from ?seed=... (used by Trilhas / Desempenho links)
  useEffect(() => {
    if (!initialSeed || seedConsumedRef.current) return;
    seedConsumedRef.current = true;
    setInput(initialSeed);
    if (!activeThread && hasAccess && hasActivePlan) {
      createThread(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSeed, hasAccess, hasActivePlan]);

  const createThread = async (patient_id: string | null) => {
    const requestKey = careKey;
    setSheetOpen(false);
    setCreatingThread(true);
    setMessages([]);
    setActiveThread(null);
    try {
      const { data, error } = await supabase.functions.invoke("clinical-agent-threads", {
        body: { action: "create", patient_id, clinic_id: careClinicId },
      });
      if (error || data?.error) {
        toast.error("Não foi possível criar a conversa");
        return;
      }
      if (careKeyRef.current !== requestKey) return;
      const newThread = data.thread as Thread;
      setThreads(prev => [newThread, ...prev]);
      setActiveThread(newThread);
      navigate(`/agente/${newThread.id}`, { replace: true });
    } finally {
      setCreatingThread(false);
    }
  };

  const ensureThreadPatientLink = async (thread: Thread, patientId: string) => {
    if (thread.patient_id === patientId) return thread;

    const { error } = await supabase.functions.invoke("clinical-agent-threads", {
      body: { action: "attach_patient", thread_id: thread.id, patient_id: patientId, clinic_id: careClinicId },
    });

    if (error) throw error;

    const linkedThread = { ...thread, patient_id: patientId };
    setThreads((prev) => prev.map((item) => (item.id === thread.id ? linkedThread : item)));
    setActiveThread((prev) => (prev?.id === thread.id ? linkedThread : prev));
    return linkedThread;
  };

  const generateHep = async (level: "auto" | "beginner" | "intermediate" | "advanced" = hepLevel) => {
    if (!activeThread?.patient_id || generatingHep) return;
    setGeneratingHep(true);
    try {
      const { data, error } = await supabase.functions.invoke("agent-generate-hep", {
        body: {
          thread_id: activeThread.id,
          clinic_id: careClinicId,
          patient_id: activeThread.patient_id,
          ...(level !== "auto" ? { challenge_level: level } : {}),
        },
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

  /** Exports a whole conversation as a compact 2-column Aliv.iA PDF transcript. */
  const exportThreadPdf = async (thread: Thread) => {
    setExportingThreadId(thread.id);
    try {
      const { data, error } = await supabase
        .from("agent_messages")
        .select("role, parts, citations, created_at")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data || []) as any[];
      if (rows.length === 0) {
        toast.error("Esta conversa ainda não tem mensagens.");
        return;
      }

      const pdfMessages = rows.map((m) => ({
        role: m.role,
        created_at: m.created_at,
        citations: m.citations || [],
        text: (Array.isArray(m.parts) ? m.parts : [])
          .map((p: any) => (p?.type === "text" ? p.text || "" : p?.quiz ? "[Quiz gerado no chat]" : ""))
          .filter(Boolean)
          .join("\n\n"),
      }));

      const patient = patients.find((p) => p.id === thread.patient_id) || resolvedLinkedPatient;
      const { generateAgentChatPdfBlob } = await import("@/utils/generatePdf");
      const blob = await generateAgentChatPdfBlob({
        title: thread.title,
        messages: pdfMessages,
        professionalName: user?.user_metadata?.full_name || null,
        patientName: patient?.full_name || null,
        createdAt: thread.created_at || null,
      });

      const safeTitle = (thread.title || "conversa").replace(/[^\p{L}\p{N}]+/gu, "_").slice(0, 40);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AliviA_Conversa_${safeTitle}_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF da conversa gerado");
    } catch (err) {
      console.error("Agent chat PDF error:", err);
      toast.error("Não foi possível gerar o PDF da conversa.");
    } finally {
      setExportingThreadId(null);
    }
  };

  const deleteThread = async (id: string) => {
    setThreads(prev => prev.filter(t => t.id !== id));
    if (activeThread?.id === id) {
      navigate("/agente", { replace: true });
      setActiveThread(null);
    }
    const { error } = await supabase.functions.invoke("clinical-agent-threads", {
      body: { action: "delete", thread_id: id, clinic_id: careClinicId },
    });
    if (error) toast.error("Não foi possível excluir.");
    else toast.success("Conversa excluída");

  };

  const attachPatient = async (patient_id: string | null) => {
    if (!activeThread) return;
    if (patient_id) {
      await ensureThreadPatientLink(activeThread, patient_id);
      setShowPatientPicker(false);
      return;
    }
    await supabase.functions.invoke("clinical-agent-threads", {
      body: { action: "attach_patient", clinic_id: careClinicId, thread_id: activeThread.id, patient_id },
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
      body: { action: "rename", clinic_id: careClinicId, thread_id: activeThread.id, title: newTitle },
    });
    if (error) toast.error("Não foi possível renomear");
  };

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const idx = result.indexOf(",");
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleAttachFiles = async (files: FileList | null) => {
    if (!files || !files.length || !activeThread) return;
    const ALLOWED = new Set([
      "application/pdf",
      "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif",
    ]);
    const MAX = 8 * 1024 * 1024;
    for (const file of Array.from(files)) {
      if (!ALLOWED.has(file.type)) {
        toast.error(`"${file.name}": formato não suportado. Envie PDF ou imagem.`);
        continue;
      }
      if (file.size > MAX) {
        toast.error(`"${file.name}": arquivo maior que 8MB.`);
        continue;
      }
      const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setAttachments(prev => [...prev, { id, name: file.name, mime: file.type, status: "analyzing" }]);
      try {
        const base64 = await readFileAsBase64(file);
        const { data, error } = await supabase.functions.invoke("agent-analyze-attachment", {
          body: { file_base64: base64, mime_type: file.type, file_name: file.name },
        });
        if (error || data?.error) {
          const msg = data?.error === "ai_credits_exhausted"
            ? "Créditos de IA esgotados."
            : data?.error === "ai_rate_limit"
              ? "Muitas requisições. Aguarde alguns segundos."
              : (typeof data?.error === "string" ? data.error : "Falha ao ler o arquivo.");
          setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: "error", error: msg } : a));
          toast.error(`"${file.name}": ${msg}`);
        } else {
          setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: "ready", extracted: data.extracted } : a));
        }
      } catch (e: any) {
        setAttachments(prev => prev.map(a => a.id === id ? { ...a, status: "error", error: e?.message } : a));
        toast.error(`"${file.name}": erro ao processar.`);
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const send = async () => {
    if (!activeThread || sending) return;
    const readyAttachments = attachments.filter(a => a.status === "ready" && a.extracted);
    if (!input.trim() && !readyAttachments.length) return;
    if (attachments.some(a => a.status === "analyzing")) {
      toast.info("Aguarde a análise dos anexos terminar.");
      return;
    }
    const userText = input.trim();

    // Build the message sent to the agent: prepend the AI-interpreted content
    // of each attachment so it becomes part of the turn AND the thread history.
    const attachmentBlocks = readyAttachments.map(a =>
      `📎 **Anexo enviado pelo profissional:** ${a.name}\n\n_[Conteúdo interpretado pela IA a partir do arquivo]_\n\n${a.extracted}`
    ).join("\n\n---\n\n");
    const messageForAgent = [
      attachmentBlocks,
      userText || (readyAttachments.length ? "Considere este anexo na discussão clínica. O que ele acrescenta ao caso?" : ""),
    ].filter(Boolean).join("\n\n");

    // Optimistic user bubble shows both the attachment chips and the user text.
    const displayText = [
      readyAttachments.map(a => `📎 ${a.name}`).join("\n"),
      userText,
    ].filter(Boolean).join("\n\n");

    setInput("");
    setAttachments([]);
    setSending(true);

    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      parts: [{ type: "text", text: displayText }],
      citations: null,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    const { data, error } = await supabase.functions.invoke("clinical-agent-chat", {
      body: { thread_id: activeThread.id, message: messageForAgent, clinic_id: careClinicId },
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
    // Scroll to the START of the newest assistant message so the user can read
    // it from the top — avoid auto-jumping to the bottom of long responses.
    setTimeout(() => {
      const list = (msgs || []) as any[];
      let lastUserIdx = -1;
      list.forEach((m, i) => { if (m.role === "user") lastUserIdx = i; });
      const lastAssistant = list.slice(lastUserIdx + 1).find((m: any) => m.role === "assistant")
        || [...list].reverse().find((m: any) => m.role === "assistant");
      if (lastAssistant?.id) {
        const el = document.getElementById(`msg-${lastAssistant.id}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    // Refresh thread title if changed
    if (!user) return;
    const { data: th } = await threadScope(supabase.from("agent_threads")
      .select("id, title, patient_id, archived, updated_at, mentor_mode"), careClinicId)
      .eq("user_id", user.id).eq("archived", false).order("updated_at", { ascending: false });
    setThreads(th || []);
    const updated = (th || []).find(t => t.id === activeThread.id);
    if (updated) setActiveThread(updated);
  };

  const linkedPatient = resolvedLinkedPatient;
  const allCitations = messages.flatMap(m => m.citations || []);
  const uniqueCitations = Array.from(new Map(allCitations.map(c => [c.id, c])).values());

  if (!checked || !subState.checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // CTA screen — agent feature exists, but the user has no active plan.
  // We render a brief description + subscribe button instead of redirecting,
  // matching the pattern used by the other gated tabs.
  if (hasAccess && !hasActivePlan) {
    return (
      <div className="min-h-screen w-full bg-background flex flex-col">
        <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm px-4 py-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold">Agente de Raciocínio Clínico</h1>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Beta</Badge>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-lg w-full border-primary/30 bg-gradient-to-br from-primary/[0.06] to-transparent">
            <CardContent className="p-6 md:p-8 space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    Recurso exclusivo do plano PRO
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </h2>
                  <p className="text-xs text-muted-foreground">Disponível para profissionais, estudantes e clínicas assinantes.</p>
                </div>
              </div>

              <p className="text-sm text-foreground/90 leading-relaxed">
                Converse com um agente clínico baseado em evidências para apoiar seu raciocínio,
                discutir casos de pacientes (com anonimização automática) e gerar rascunhos de
                programas de exercícios (HEP) ancorados em literatura científica.
              </p>

              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li className="flex gap-2"><Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Discussão clínica com base em estudos com DOI/PMID e crivo PEDro validados</li>
                <li className="flex gap-2"><BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Citações verificáveis das evidências</li>
                <li className="flex gap-2"><UserPlus className="h-4 w-4 text-primary mt-0.5 shrink-0" /> Geração de HEP personalizada</li>
              </ul>


              <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-3 flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs font-semibold text-foreground">Quer sentir a dinâmica antes de assinar?</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Abra o modo demonstração e explore pacientes simulados, agenda, insights e o Agente — sem assinatura.
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary"
                    onClick={() => navigate("/profissionais/demo")}
                  >
                    Abrir demo profissional →
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={handleStartSubscription}
                  disabled={subscribing}
                  className="flex-1 gap-2"
                  size="lg"
                >
                  {subscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Assinar plano PRO
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate("/dashboard")}>
                  Voltar
                </Button>
              </div>

            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!hasAccess) {
    // Feature truly unavailable (flag off and not VIP). Same minimal CTA layout.
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-3">
            <Brain className="h-8 w-8 mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold">Agente em beta fechado</h2>
            <p className="text-sm text-muted-foreground">
              Esta funcionalidade ainda não está disponível para o seu perfil.
            </p>
            <Button onClick={() => navigate("/dashboard")} className="w-full">Voltar ao painel</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ThreadList = ({ withClose = false }: { withClose?: boolean }) => (
    <div className="flex flex-col flex-1 min-h-0 h-full">
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
            <div className="p-4 text-center text-xs text-muted-foreground">Carregando suas conversas com o agente…</div>
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
                onExportPdf={() => exportThreadPdf(t)}
                exporting={exportingThreadId === t.id}
              />
            );
          })}

        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full flex bg-background overflow-hidden relative">
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
      <main className="flex-1 flex flex-col relative z-10 min-w-0 pb-20 md:pb-0">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-border/40 bg-card/95 backdrop-blur-sm px-3 py-2 md:px-4 md:py-3 flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex min-w-0 items-center gap-1.5 md:gap-2 md:flex-1">
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
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9 shrink-0" title="Conversas" aria-label="Conversas">
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
                <Badge variant="outline" className="h-4 text-[9px] px-1.5 border-primary/30 text-primary shrink-0">BETA</Badge>
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
          </div>

          <div className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 md:w-auto md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 shrink-0"
              title="Menu geral"
              aria-label="Menu geral"
              onClick={() => window.dispatchEvent(new Event("alivia:open-global-menu"))}
            >
              <Home className="h-4 w-4" />
            </Button>

          {activeThread && !linkedPatient && (
            <Button variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 px-2 md:px-3" onClick={() => setShowPatientPicker(true)} title="Vincular paciente">
              <UserPlus className="h-3.5 w-3.5" /> <span className="hidden md:inline">Vincular paciente</span>
            </Button>
          )}

          {activeThread && linkedPatient && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="h-9 shrink-0 gap-1.5 px-2 md:px-3"
                  disabled={generatingHep}
                  title="Gera um HEP real (com link) baseado na última avaliação deste paciente"
                >
                  {generatingHep ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Dumbbell className="h-3.5 w-3.5" />}
                  <span className="hidden md:inline">Gerar HEP</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-2">
                <p className="px-2 pb-1 pt-1 text-xs font-medium text-muted-foreground">
                  Nível de desafio do HEP
                </p>
                {([
                  { key: "auto", label: "IA decide (recomendado)", hint: "Pondera dor, estágio da lesão e capacidade basal do paciente" },
                  { key: "beginner", label: "Básico", hint: "Dor alta, fase aguda ou paciente sedentário" },
                  { key: "intermediate", label: "Intermediário", hint: "Dor controlada, praticante regular" },
                  { key: "advanced", label: "Avançado", hint: "Dor baixa, histórico atlético / retorno ao esporte" },
                ] as const).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    disabled={generatingHep}
                    onClick={() => {
                      setHepLevel(opt.key);
                      void generateHep(opt.key);
                    }}
                    className="w-full rounded-md px-2 py-2 text-left transition hover:bg-muted disabled:opacity-50"
                  >
                    <span className="block text-sm font-medium">{opt.label}</span>
                    <span className="block text-xs text-muted-foreground">{opt.hint}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}


          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={activeThread?.mentor_mode ? "default" : "outline"}
                size="sm"
                className="h-9 shrink-0 gap-1.5 px-2 md:px-3"
                title="Aprender: Mentor, comandos, casos de estudo e biblioteca de evidências"
                aria-label="Menu Aprender"
              >
                <GraduationCap className="h-3.5 w-3.5" />
                <span className="hidden md:inline">
                  {activeThread?.mentor_mode ? "Aprender · Mentor on" : "Aprender"}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-2">
              {activeThread && (
                <button
                  type="button"
                  onClick={async () => {
                    const next = !activeThread.mentor_mode;
                    setActiveThread({ ...activeThread, mentor_mode: next });
                    setThreads(prev => prev.map(t => t.id === activeThread.id ? { ...t, mentor_mode: next } : t));
                    await supabase.functions.invoke("clinical-agent-threads", {
                      body: { action: "set_mentor_mode", thread_id: activeThread.id, mentor_mode: next, clinic_id: careClinicId },
                    });
                    toast.success(next ? "🎓 Modo Mentor ativado" : "Modo Mentor desligado");
                  }}
                  className="w-full flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted text-left transition-colors"
                >
                  <GraduationCap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium flex items-center gap-2">
                      Modo Mentor
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${activeThread.mentor_mode ? "bg-primary text-primary-foreground" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                        {activeThread.mentor_mode ? "ON" : "OFF"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">Persona Professor: revisa conceitos antes da conduta.</p>
                  </div>
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate("/casos-de-estudo")}
                className="w-full flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted text-left transition-colors"
              >
                <BookText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">Casos de estudo</div>
                  <p className="text-[11px] text-muted-foreground leading-snug">Pacientes fictícios criados pelo agente para praticar.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLibraryOpen(true)}
                className="w-full flex items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-muted text-left transition-colors"
              >
                <BookOpen className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">Biblioteca de evidências</div>
                  <p className="text-[11px] text-muted-foreground leading-snug">Artigos aprovados com DOI/PMID e crivo PEDro por nicho clínico.</p>
                </div>
              </button>

              <div className="my-2 border-t border-border/50" />
              <div className="px-2.5 pb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70">
                Comandos do Mentor
              </div>
              <MentorCommandsPopover onPick={(c) => setInput((prev) => (prev ? `${prev} ${c}` : c))} />
            </PopoverContent>
          </Popover>

          <Sheet open={libraryOpen} onOpenChange={setLibraryOpen}>
            <SheetContent side="right" className="p-0 w-[92vw] sm:max-w-md md:max-w-lg flex flex-col [&>button]:z-30">
              <AgentKnowledgeBrowser />
            </SheetContent>
          </Sheet>



          {uniqueCitations.length > 0 && (
            <Button variant="ghost" size="sm" className="h-9 shrink-0 gap-1.5 px-2 md:px-3" onClick={() => setShowCitations(true)} title="Evidências citadas">
              <BookOpen className="h-3.5 w-3.5" /> {uniqueCitations.length}
            </Button>
          )}
          </div>
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
            {!activeThread && !creatingThread && (
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-10 space-y-6">
                <img
                  src={logoAlivia}
                  alt="Aliv.iA"
                  className="w-32 sm:w-40 opacity-30"
                />
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Agente de Raciocínio Clínico</h2>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Comece uma nova conversa para discutir um caso com base em evidências validadas.
                  </p>
                </div>
                <Button
                  size="lg"
                  className="gap-2 rounded-full px-6"
                  onClick={() => createThread(null)}
                  disabled={creatingThread}
                >
                  <Plus className="h-4 w-4" /> Nova conversa
                </Button>
                <div className="w-full max-w-md">
                  <CollapsibleSection
                    storageKey="agent-shortcuts-open"
                    defaultOpen={true}
                    header={(
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Terminal className="h-4 w-4 text-primary shrink-0" />
                        <span>Atalhos rápidos</span>
                      </div>
                    )}
                  >
                    <div className="flex flex-wrap gap-2 justify-center pt-1">
                      {[
                        "/professor",
                        "/evidencia lombar",
                        "/quiz joelho",
                        "/caso tendinopatia patelar",
                        "/traduzir https://pubmed.ncbi.nlm.nih.gov/...",
                        "/trilha ombro 1",
                      ].map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            setInput(s);
                            if (!activeThread) createThread(null);
                          }}
                          className="px-3 py-1.5 rounded-full text-xs border border-border/60 hover:bg-primary/10 hover:border-primary/40 transition"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </CollapsibleSection>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="md:hidden">Acesse conversas anteriores no menu lateral.</span>
                  <span className="hidden md:inline">Acesse conversas anteriores na barra lateral.</span>
                </p>
              </div>
            )}

            {activeThread && messages.length === 0 && (
              <div className="text-center py-12 space-y-4">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Vamos raciocinar juntos?</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Discuta casos clínicos com base em evidências com crivo bibliográfico e PEDro.<br/>
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
              const quizPart = m.parts.find(p => p.type === "quiz" && p.quiz) as any;
              if (m.role === "user") {
                return (
                  <div key={m.id} id={`msg-${m.id}`} className="flex justify-end scroll-mt-4">
                    <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm whitespace-pre-wrap">
                      {text}
                    </div>
                  </div>
                );
              }
              return (
                <div key={m.id} id={`msg-${m.id}`} className="flex justify-start scroll-mt-4">
                  <div className="max-w-[85%] w-full bg-muted text-foreground rounded-2xl rounded-bl-md px-4 py-3 text-sm shadow-sm">
                    {text && (
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
                    )}
                    {quizPart?.quiz && <QuizCard quiz={quizPart.quiz} threadId={activeThread?.id} />}
                    {m.citations && m.citations.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.citations.map(c => (
                          <Badge key={c.id} variant="outline" className="text-[10px] bg-background/60">
                            {(c.authors?.split(",")[0] || "—")}, {c.year || "—"} · PEDro {c.pedro_score ?? "N/A"}
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
          <div className="max-w-3xl mx-auto space-y-2">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {attachments.map(a => (
                  <div
                    key={a.id}
                    className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2 py-1 text-xs max-w-full"
                  >
                    {a.mime === "application/pdf"
                      ? <FileText className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      : <ImageIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
                    <span className="truncate max-w-[160px]" title={a.name}>{a.name}</span>
                    {a.status === "analyzing" && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
                    {a.status === "ready" && <Check className="h-3 w-3 text-emerald-600 shrink-0" />}
                    {a.status === "error" && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                    <button
                      type="button"
                      onClick={() => removeAttachment(a.id)}
                      className="ml-0.5 text-muted-foreground hover:text-foreground shrink-0"
                      aria-label="Remover anexo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                multiple
                className="hidden"
                onChange={e => { handleAttachFiles(e.target.files); e.target.value = ""; }}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-11 w-11 rounded-xl shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || !activeThread || creatingThread}
                title="Anexar laudo (PDF) ou imagem"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <AgentMessageInput
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder={attachments.some(a => a.status === "ready") ? "Adicione uma pergunta ou envie só o anexo…" : "Pergunte ao agente…"}
                aria-label="Mensagem ao agente"
                className="min-h-[44px] max-h-[160px] resize-none rounded-xl"
                style={{ fontSize: "16px" }}
                rows={1}
                disabled={sending || !activeThread || creatingThread}
              />
              <Button
                size="icon"
                className="h-11 w-11 rounded-xl shrink-0"
                onClick={send}
                disabled={
                  sending || !activeThread ||
                  (!input.trim() && !attachments.some(a => a.status === "ready")) ||
                  attachments.some(a => a.status === "analyzing")
                }
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
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
                      {c.authors || "—"} · {c.year || "—"} · <span className="text-primary">PEDro {c.pedro_score ?? "N/A"}</span>
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

      <ProBottomTabBar
        activeTab="agent"
        onChangeTab={(tab) => {
          if (tab === "professional" || tab === "patients") {
            navigate("/dashboard?tab=professional");
          } else if (tab === "agenda") {
            navigate("/dashboard?tab=agenda");
          } else if (tab === "insights" || tab === "messages" || tab === "clinic") {
            navigate(`/dashboard?tab=${tab}`);
          }
        }}
        hasAgentAccess={hasAccess}
        professionalId={professionalId}
        clinicId={careClinicId}
      />
    </div>
  );
};

export default ClinicalAgent;
