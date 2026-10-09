import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageCircle, Trash2, Maximize2, Search, Plus, UserPlus } from "lucide-react";
import ChatWindow from "./ChatWindow";
import { toast } from "@/hooks/use-toast";

interface ConversationListProps {
  mode: "patient" | "professional" | "staff";
  professionalId?: string;
  clinicId?: string | null;
  /** When mode="staff", the user id of the clinic staff (secretary/owner) whose inbox to load. Defaults to current user. */
  staffUserId?: string;
  initialConversationId?: string | null;
  searchQuery?: string;
  canInitiateConversation?: boolean;
}

interface ConversationItem {
  id: string;
  patient_user_id: string;
  professional_id: string | null;
  recipient_user_id: string | null;
  clinic_id: string | null;
  updated_at: string;
  other_name: string;
  last_message?: string;
  unread_count: number;
}

const ConversationList = ({ mode, professionalId, clinicId = null, staffUserId, initialConversationId, searchQuery = "", canInitiateConversation = true }: ConversationListProps) => {

  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isPt = language === "pt";
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeOtherName, setActiveOtherName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(true);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvSearch, setNewConvSearch] = useState("");
  const [newConvPatients, setNewConvPatients] = useState<{ user_id: string | null; name: string; email: string; has_account: boolean; professional_id?: string | null }[]>([]);
  const [newConvLoading, setNewConvLoading] = useState(false);
  const [creatingConv, setCreatingConv] = useState<string | null>(null);
  const [showAllPatients, setShowAllPatients] = useState(false);
  const [pendingOpenConvId, setPendingOpenConvId] = useState<string | null>(null);

  const openConversation = (convId: string, otherName: string) => {
    setPendingOpenConvId(convId);
    setActiveConvId(convId);
    setActiveOtherName(otherName);
    setMinimized(false);
    syncConversationParam(convId);
  };

  // Load contacts for new conversation modal, excluding existing conversations
  const loadPatientsForNewConv = async () => {
    if (!professionalId && mode !== "patient") return;
    setNewConvLoading(true);
    try {
      // Get existing conversation partner user_ids to exclude
      const existingPartnerIds = new Set(
        conversations.map((c) =>
          mode === "professional" ? c.patient_user_id : c.professional_id
        )
      );

      if (mode === "professional" && professionalId) {
        // In clinic mode, use clinic-wide patient list so owner/secretary/therapist
        // can chat with any patient registered to the clinic (not just their own)
        const rpcName = clinicId ? "get_clinic_all_patients" : "get_professional_all_patients";
        const rpcArgs = clinicId
          ? { _clinic_id: clinicId }
          : { _professional_id: professionalId };
        const { data: contacts } = await (supabase.rpc(rpcName as any, rpcArgs as any) as any);

        const results: { user_id: string | null; name: string; email: string; has_account: boolean }[] = [];
        for (const c of contacts || []) {
          if (c.user_id && existingPartnerIds.has(c.user_id)) continue;
          results.push({
            user_id: c.user_id || null,
            name: c.full_name || c.email || "Paciente",
            email: c.email || "",
            has_account: !!c.has_account,
          });
        }

        setNewConvPatients(results);
      } else if (mode === "patient" && user) {
        // Use new RPC that consolidates assessments (by user_id OR email),
        // patients table by email, conversations, and referrals.
        const { data: pros, error } = await supabase.rpc("get_patient_professionals", {
          _user_id: user.id,
        });

        if (error) {
          console.warn("get_patient_professionals failed, falling back:", error);
        }

        const list = (pros || [])
          .filter((p: any) => p.professional_user_id && !existingPartnerIds.has(p.professional_user_id))
          .map((p: any) => ({
            user_id: p.professional_user_id,
            name: p.full_name || "Profissional",
            email: "",
            has_account: true,
            professional_id: p.professional_id, // pre-resolved to bypass RLS later
          }));
        setNewConvPatients(list);
      }
    } catch {}
    setNewConvLoading(false);
  };

  const handleStartConversation = async (otherUserId: string, otherName: string, preResolvedProfessionalId?: string | null) => {
    if (!user) return;
    setCreatingConv(otherUserId);
    try {
      const patientUserId = mode === "patient" ? user.id : otherUserId;

      // Resolve professional_id
      let targetProfId: string | null | undefined =
        mode === "professional" ? professionalId : preResolvedProfessionalId ?? null;

      // Fallback: if patient mode and no pre-resolved id, try direct query (may fail under RLS)
      if (mode === "patient" && !targetProfId) {
        const { data: pro } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", otherUserId)
          .maybeSingle();
        targetProfId = pro?.id;
      }

      if (!targetProfId) {
        throw new Error(
          isPt
            ? "Não foi possível identificar o profissional. Tente novamente."
            : "Could not identify the professional. Please try again."
        );
      }

      let convId: string;

      // Clinic mode: use clinic-aware RPC so any clinic member can chat with any clinic patient
      if (mode === "professional" && clinicId) {
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          "create_conversation_for_clinic_patient",
          { _clinic_id: clinicId, _professional_id: targetProfId, _patient_user_id: patientUserId }
        );
        if (rpcError) throw rpcError;
        convId = rpcResult as string;
      } else {
        const { data: rpcResult, error: rpcError } = await supabase.rpc(
          "create_conversation_for_patient",
          { _professional_id: targetProfId, _patient_user_id: patientUserId }
        );
        if (rpcError) throw rpcError;
        convId = rpcResult as string;
      }

      // If patient mode, also unhide for patient
      if (mode === "patient") {
        await supabase
          .from("conversations")
          .update({ hidden_by_patient: false })
          .eq("id", convId);
      }

      // Push notification for new conversation from patient
      if (mode === "patient") {
        try {
          const { data: pro } = await supabase
            .from("professionals")
            .select("user_id")
            .eq("id", targetProfId)
            .maybeSingle();
          if (pro?.user_id) {
            const patientName = user?.user_metadata?.full_name || "Paciente";
            await supabase.functions.invoke("send-push-notification", {
              body: {
                user_id: pro.user_id,
                title: "Nova conversa",
                body: `${patientName} iniciou uma conversa com você.`,
                url: "/dashboard?tab=messages&conv=" + convId,
                category: "messages",
              },
            });
          }
        } catch (pushErr) {
          console.warn("Push notification failed:", pushErr);
        }
      }

      setNewConvOpen(false);
      openConversation(convId, otherName);
      await fetchConversations();
    } catch (err: any) {
      console.error("Start conversation error:", err);
      toast({
        title: isPt ? "Não foi possível abrir a conversa" : "Could not start conversation",
        description: err?.message || (isPt ? "Tente novamente em instantes." : "Please try again."),
        variant: "destructive",
      });
    } finally {
      setCreatingConv(null);
    }
  };

  const filteredNewConvPatients = useMemo(() => {
    let list = newConvPatients;
    // Filter by account status unless showing all
    if (!showAllPatients) {
      list = list.filter(p => p.has_account);
    }
    if (newConvSearch.trim()) {
      const q = newConvSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
    }
    // Sort: active accounts first
    return list.sort((a, b) => (a.has_account === b.has_account ? 0 : a.has_account ? -1 : 1));
  }, [newConvPatients, newConvSearch, showAllPatients]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConvId) ?? null,
    [activeConvId, conversations]
  );

  const filteredConversations = useMemo(() => {
    let list = [...conversations];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.other_name.toLowerCase().includes(q) ||
          (c.last_message && c.last_message.toLowerCase().includes(q))
      );
    }
    list.sort((a, b) => {
      if (a.unread_count > 0 && b.unread_count === 0) return -1;
      if (a.unread_count === 0 && b.unread_count > 0) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    return list;
  }, [conversations, searchQuery]);

  useEffect(() => {
    if (!user) return;
    fetchConversations();
  }, [user, mode, professionalId, clinicId, staffUserId]);

  useEffect(() => {
    if (initialConversationId && conversations.length > 0) {
      const conv = conversations.find((c) => c.id === initialConversationId);
      if (conv && activeConvId !== conv.id) {
        setActiveConvId(conv.id);
        setActiveOtherName(conv.other_name);
        setMinimized(false);
      }
    }
  }, [activeConvId, initialConversationId, conversations]);

  useEffect(() => {
    if (activeConversation && pendingOpenConvId === activeConversation.id) {
      setPendingOpenConvId(null);
    }
  }, [activeConversation, pendingOpenConvId]);

  useEffect(() => {
    if (!activeConvId || activeConversation) return;
    if (loading || pendingOpenConvId === activeConvId) return;
    setActiveConvId(null);
    setActiveOtherName("");
    setMinimized(true);

    const currentConv = searchParams.get("conv");
    if (currentConv === activeConvId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("conv");
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeConvId, activeConversation, loading, pendingOpenConvId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!activeConversation) return;
    if (activeConversation.other_name !== activeOtherName) {
      setActiveOtherName(activeConversation.other_name);
    }
  }, [activeConversation, activeOtherName]);

  const syncConversationParam = (convId: string | null) => {
    const currentConv = searchParams.get("conv");
    if (currentConv === convId || (!convId && !currentConv)) return;
    const nextParams = new URLSearchParams(searchParams);
    if (convId) {
      nextParams.set("conv", convId);
    } else {
      nextParams.delete("conv");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const hydrateConversation = useCallback(async (convId: string) => {
    if (!user) return false;

    const { data: conv } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", convId)
      .maybeSingle();

    if (!conv) return false;

    let otherName = mode === "patient" ? "Profissional" : "Paciente";

    if (mode === "patient") {
      if (conv.professional_id) {
        const { data: pros } = await supabase.rpc("get_professionals_basic_info", {
          _professional_ids: [conv.professional_id],
        });
        otherName = pros?.[0]?.full_name || otherName;
      } else if (conv.recipient_user_id) {
        // Conversation with clinic staff (secretary/owner)
        const [{ data: profile }, { data: clinic }] = await Promise.all([
          supabase.from("profiles").select("full_name").eq("user_id", conv.recipient_user_id).maybeSingle(),
          conv.clinic_id
            ? (supabase as any).rpc("get_clinics_public", { _ids: [conv.clinic_id] }).then((r: any) => ({ data: r.data?.[0] ?? null }))
            : Promise.resolve({ data: null as { name: string } | null }),
        ]);
        const clinicName = clinic?.name;
        const staffName = profile?.full_name;
        otherName = clinicName
          ? (staffName ? `${staffName} · ${clinicName}` : clinicName)
          : (staffName || (isPt ? "Atendimento da clínica" : "Clinic support"));
      }
    } else if (mode === "staff") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", conv.patient_user_id)
        .maybeSingle();
      otherName = profile?.full_name || otherName;
    } else if (clinicId || professionalId) {
      const rpcName = clinicId ? "get_clinic_all_patients" : "get_professional_all_patients";
      const rpcArgs = clinicId ? { _clinic_id: clinicId } : { _professional_id: professionalId };
      const { data: contacts } = await (supabase.rpc(rpcName as any, rpcArgs as any) as any);
      const matchedContact = (contacts || []).find((contact: any) => contact.user_id === conv.patient_user_id);

      if (matchedContact) {
        otherName = matchedContact.full_name || matchedContact.email || otherName;
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", conv.patient_user_id)
          .maybeSingle();
        otherName = profile?.full_name || otherName;
      }
    }

    const [{ data: lastMessage }, { count: unreadCount }] = await Promise.all([
      supabase
        .from("messages")
        .select("content, created_at")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", convId)
        .neq("sender_user_id", user.id)
        .is("read_at", null),
    ]);

    const hydratedConversation: ConversationItem = {
      id: conv.id,
      patient_user_id: conv.patient_user_id,
      professional_id: conv.professional_id,
      recipient_user_id: (conv as any).recipient_user_id ?? null,
      clinic_id: (conv as any).clinic_id ?? null,
      updated_at: conv.updated_at,
      other_name: otherName,
      last_message: lastMessage?.content || "",
      unread_count: unreadCount || 0,
    };

    setConversations((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === convId);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = hydratedConversation;
        return next;
      }
      return [hydratedConversation, ...prev];
    });

    setActiveOtherName((current) => current || otherName);
    return true;
  }, [clinicId, isPt, mode, professionalId, user]);


  useEffect(() => {
    if (!pendingOpenConvId || loading || activeConversation) return;

    let cancelled = false;

    const ensureConversationVisible = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const hydrated = await hydrateConversation(pendingOpenConvId);
        if (cancelled) return;
        if (hydrated) return;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      if (cancelled) return;

      setPendingOpenConvId(null);
      toast({
        title: isPt ? "Conversa ainda indisponível" : "Conversation not available yet",
        description: isPt
          ? "Não conseguimos carregar essa conversa agora. Tente novamente em alguns segundos."
          : "We couldn't load this conversation right now. Please try again in a few seconds.",
        variant: "destructive",
      });
    };

    void ensureConversationVisible();
  }, [activeConversation, hydrateConversation, isPt, loading, pendingOpenConvId]);

  /**
   * Optimized: batch-fetch all conversations with related data
   * instead of N+1 queries per conversation.
   */
  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);

    const effectiveStaffUserId = staffUserId || user.id;

    // 1. Fetch conversations
    let query = supabase.from("conversations").select("*");
    if (mode === "patient") {
      query = query.eq("patient_user_id", user.id).eq("hidden_by_patient", false);
    } else if (mode === "staff") {
      query = query
        .eq("recipient_user_id", effectiveStaffUserId)
        .eq("hidden_by_professional", false);
      if (clinicId) query = query.eq("clinic_id", clinicId);
    } else if (professionalId) {
      query = query.eq("professional_id", professionalId).eq("hidden_by_professional", false);
    }
    const { data: convs } = await query.order("updated_at", { ascending: false });

    if (!convs || convs.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const convIds = convs.map((c) => c.id);

    // 2. Batch-fetch names for the other party
    let namesMap: Record<string, string> = {};
    let clinicNamesMap: Record<string, string> = {};
    let recipientNamesMap: Record<string, string> = {};

    if (mode === "patient") {
      const proIds = [...new Set(convs.map((c) => c.professional_id).filter(Boolean))] as string[];
      if (proIds.length > 0) {
        const { data: pros, error: prosErr } = await supabase.rpc("get_professionals_basic_info", {
          _professional_ids: proIds,
        });
        if (prosErr) console.warn("get_professionals_basic_info failed:", prosErr);
        for (const p of pros || []) namesMap[p.id] = p.full_name;
      }

      // For clinic-staff conversations (null professional_id), resolve clinic + staff names
      const clinicConvs = convs.filter((c) => !c.professional_id);
      const clinicIds = [...new Set(clinicConvs.map((c: any) => c.clinic_id).filter(Boolean))] as string[];
      const recipientIds = [...new Set(clinicConvs.map((c: any) => c.recipient_user_id).filter(Boolean))] as string[];

      if (clinicIds.length > 0) {
        const { data: clinics } = await (supabase as any).rpc("get_clinics_public", { _ids: clinicIds });
        for (const cl of clinics || []) clinicNamesMap[cl.id] = cl.name;
      }
      if (recipientIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", recipientIds);
        for (const pr of profs || []) recipientNamesMap[pr.user_id] = pr.full_name || "";
      }
    } else if (mode === "staff") {
      const patientIds = [...new Set(convs.map((c) => c.patient_user_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", patientIds);
      for (const p of profs || []) namesMap[p.user_id] = p.full_name || "Paciente";
    } else if (professionalId) {
      const rpcName = clinicId ? "get_clinic_all_patients" : "get_professional_all_patients";
      const rpcArgs = clinicId ? { _clinic_id: clinicId } : { _professional_id: professionalId };
      const { data: contacts } = await (supabase.rpc(rpcName as any, rpcArgs as any) as any);

      for (const contact of contacts || []) {
        if (contact.user_id) {
          namesMap[contact.user_id] = contact.full_name || contact.email || "Paciente";
        }
      }

      const missingPatientUserIds = [...new Set(convs.map((c) => c.patient_user_id))].filter(
        (patientUserId) => !namesMap[patientUserId]
      );

      if (missingPatientUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", missingPatientUserIds);
        for (const p of profiles || []) {
          namesMap[p.user_id] = p.full_name || "Paciente";
        }
      }
    }

    // 3. Batch-fetch last messages for all conversations
    const { data: allMessages } = await supabase
      .from("messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: false });

    const lastMessageMap: Record<string, string> = {};
    for (const msg of allMessages || []) {
      if (!lastMessageMap[msg.conversation_id]) {
        lastMessageMap[msg.conversation_id] = msg.content;
      }
    }

    // 4. Batch-fetch unread counts
    const { data: unreadMessages } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convIds)
      .neq("sender_user_id", user.id)
      .is("read_at", null);

    const unreadMap: Record<string, number> = {};
    for (const msg of unreadMessages || []) {
      unreadMap[msg.conversation_id] = (unreadMap[msg.conversation_id] || 0) + 1;
    }

    // 5. Assemble enriched list
    const enriched: ConversationItem[] = convs.map((conv: any) => {
      let otherName = "";
      if (mode === "patient") {
        if (conv.professional_id) {
          otherName = namesMap[conv.professional_id] || "Profissional";
        } else {
          const clinicName = conv.clinic_id ? clinicNamesMap[conv.clinic_id] : "";
          const staffName = conv.recipient_user_id ? recipientNamesMap[conv.recipient_user_id] : "";
          otherName = clinicName
            ? (staffName ? `${staffName} · ${clinicName}` : clinicName)
            : (staffName || (isPt ? "Atendimento da clínica" : "Clinic support"));
        }
      } else {
        otherName = namesMap[conv.patient_user_id] || "Paciente";
      }
      return {
        id: conv.id,
        patient_user_id: conv.patient_user_id,
        professional_id: conv.professional_id ?? null,
        recipient_user_id: conv.recipient_user_id ?? null,
        clinic_id: conv.clinic_id ?? null,
        updated_at: conv.updated_at,
        other_name: otherName,
        last_message: lastMessageMap[conv.id] || "",
        unread_count: unreadMap[conv.id] || 0,
      };
    });

    setConversations(enriched);
    setLoading(false);
  };


  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!confirm(t("chat.delete_confirm"))) return;
    setDeletingId(convId);
    try {
      const field = mode === "patient" ? "hidden_by_patient" : "hidden_by_professional";
      await supabase
        .from("conversations")
        .update({ [field]: true })
        .eq("id", convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) {
        setActiveConvId(null);
        setActiveOtherName("");
        setMinimized(true);
        syncConversationParam(null);
      }
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  

  return (
    <div className="space-y-4">
      {/* New conversation button */}
      {canInitiateConversation && (
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 rounded-xl"
        onClick={() => { setNewConvOpen(true); loadPatientsForNewConv(); }}
      >
        <Plus className="h-4 w-4" />
        {mode === "professional"
          ? (isPt ? "Nova conversa" : "New conversation")
          : (isPt ? "Iniciar conversa" : "Start conversation")}
      </Button>
      )}

      {/* New conversation modal */}
      <Dialog open={newConvOpen} onOpenChange={setNewConvOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              {isPt ? "Nova conversa" : "New conversation"}
            </DialogTitle>
            <DialogDescription>
              {mode === "professional"
                ? (isPt ? "Selecione um paciente para iniciar uma conversa." : "Select a patient to start a conversation.")
                : (isPt ? "Selecione um profissional para iniciar uma conversa." : "Select a professional to start a conversation.")}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newConvSearch}
            onChange={(e) => setNewConvSearch(e.target.value)}
            placeholder={isPt ? "Buscar..." : "Search..."}
            className="text-sm"
          />
          {mode === "professional" && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {isPt ? "Mostrar pacientes sem conta" : "Show patients without account"}
              </span>
              <Button
                variant={showAllPatients ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full px-3"
                onClick={() => setShowAllPatients(!showAllPatients)}
              >
                {showAllPatients
                  ? (isPt ? "Todos" : "All")
                  : (isPt ? "Apenas com conta" : "With account only")}
              </Button>
            </div>
          )}
          <ScrollArea className="h-64">
            {newConvLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : filteredNewConvPatients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {isPt ? "Nenhum contato encontrado." : "No contacts found."}
              </p>
            ) : (
              <div className="space-y-1">
                {filteredNewConvPatients.map((p, idx) => {
                  const canChat = p.has_account && !!p.user_id;
                  return (
                    <button
                      key={p.user_id || `no-account-${idx}`}
                      className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                        canChat
                          ? "hover:bg-muted/60 cursor-pointer"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                      onClick={() => canChat && handleStartConversation(p.user_id!, p.name, p.professional_id ?? null)}
                      disabled={!canChat || !!creatingConv}
                    >
                      <Avatar className="h-8 w-8 border border-border shrink-0">
                        <AvatarFallback className={`font-semibold text-xs ${
                          canChat
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {p.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-foreground block truncate">{p.name}</span>
                        {p.email && <span className="text-xs text-muted-foreground truncate block">{p.email}</span>}
                        {!canChat && (
                          <span className="text-[10px] text-destructive/70">
                            {isPt ? "Sem conta — não é possível iniciar chat" : "No account — cannot start chat"}
                          </span>
                        )}
                      </div>
                      {creatingConv === p.user_id && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      {activeConvId && minimized && activeConversation && (
        <Card
          className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
          onClick={() => setMinimized(false)}
        >
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <MessageCircle className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground truncate flex-1">{activeOtherName}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title={t("chat.maximize")}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredConversations.length === 0 && conversations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">{t("chat.no_conversations")}</p>
          </CardContent>
        </Card>
      ) : filteredConversations.length === 0 ? (
        <div className="py-8 text-center">
          <Search className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t("chat.no_results")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conv) => {
            const isActive = conv.id === activeConvId;

            return (
              <Card
                key={conv.id}
                className={`cursor-pointer transition-all ${
                  isActive
                    ? "border-primary/40 bg-muted/30 shadow-sm"
                    : "hover:shadow-md hover:border-primary/30"
                }`}
                onClick={() => {
                   openConversation(conv.id, conv.other_name);
                }}
              >
                <CardContent className="py-3 px-4 flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                      {conv.other_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground text-sm truncate">{conv.other_name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(conv.updated_at).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                    {conv.last_message && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                    )}
                  </div>
                  {conv.unread_count > 0 && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] h-5 min-w-5 flex items-center justify-center rounded-full px-1.5">
                      {conv.unread_count}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    disabled={deletingId === conv.id}
                    title={t("chat.delete_conversation")}
                  >
                    {deletingId === conv.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {activeConvId && !minimized && !activeConversation && pendingOpenConvId === activeConvId && (
        <Card>
          <CardContent className="py-8 flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            {isPt ? "Carregando conversa..." : "Loading conversation..."}
          </CardContent>
        </Card>
      )}

      {activeConvId && !minimized && activeConversation && (
        <ChatWindow
          conversationId={activeConvId}
          otherName={activeOtherName}
          onBack={() => setMinimized(true)}
          onMinimize={() => setMinimized(true)}
        />
      )}
    </div>
  );
};

export default ConversationList;
