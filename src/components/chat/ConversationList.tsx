import { useEffect, useMemo, useState } from "react";
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
import VideoCallListener from "./VideoCallListener";
import { ENABLE_VIDEO_CALL } from "@/lib/featureFlags";

interface ConversationListProps {
  mode: "patient" | "professional";
  professionalId?: string;
  initialConversationId?: string | null;
  searchQuery?: string;
  canInitiateConversation?: boolean;
}

interface ConversationItem {
  id: string;
  patient_user_id: string;
  professional_id: string;
  updated_at: string;
  other_name: string;
  last_message?: string;
  unread_count: number;
}

const ConversationList = ({ mode, professionalId, initialConversationId, searchQuery = "", canInitiateConversation = true }: ConversationListProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeOtherName, setActiveOtherName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(true);
  const [newConvOpen, setNewConvOpen] = useState(false);
  const [newConvSearch, setNewConvSearch] = useState("");
  const [newConvPatients, setNewConvPatients] = useState<{ user_id: string; name: string; email: string }[]>([]);
  const [newConvLoading, setNewConvLoading] = useState(false);
  const [creatingConv, setCreatingConv] = useState<string | null>(null);

  // Load patients that have user accounts for new conversation modal
  const loadPatientsForNewConv = async () => {
    if (!professionalId && mode !== "patient") return;
    setNewConvLoading(true);
    try {
      if (mode === "professional" && professionalId) {
        // Get patient emails from assessments linked to this professional
        const { data: assessments } = await supabase
          .from("assessments")
          .select("patient_email, patient_name, user_id")
          .eq("professional_id", professionalId)
          .not("user_id", "is", null);

        const uniqueUsers = new Map<string, { user_id: string; name: string; email: string }>();
        for (const a of assessments || []) {
          if (a.user_id && !uniqueUsers.has(a.user_id)) {
            uniqueUsers.set(a.user_id, {
              user_id: a.user_id,
              name: a.patient_name || a.patient_email || "Paciente",
              email: a.patient_email || "",
            });
          }
        }
        setNewConvPatients(Array.from(uniqueUsers.values()));
      } else if (mode === "patient") {
        // Patient: load professionals they have assessments with
        const { data: assessments } = await supabase
          .from("assessments")
          .select("professional_id")
          .eq("user_id", user?.id)
          .not("professional_id", "is", null);

        const proIds = [...new Set((assessments || []).map(a => a.professional_id).filter(Boolean))];
        const pros: { user_id: string; name: string; email: string }[] = [];
        for (const pid of proIds) {
          const { data: pro } = await (supabase.from("professionals" as any) as any)
            .select("id, full_name, user_id")
            .eq("id", pid)
            .single();
          if (pro) {
            pros.push({ user_id: pro.user_id, name: pro.full_name, email: "" });
          }
        }
        setNewConvPatients(pros);
      }
    } catch {}
    setNewConvLoading(false);
  };

  const handleStartConversation = async (otherUserId: string, otherName: string) => {
    if (!user) return;
    setCreatingConv(otherUserId);
    try {
      const patientUserId = mode === "patient" ? user.id : otherUserId;
      const profId = mode === "professional" ? professionalId : null;

      // If professional mode, get professional_id; if patient mode, find the professional_id from assessments
      let targetProfId = profId;
      if (mode === "patient") {
        // otherUserId is the professional's user_id, find professional_id
        const { data: pro } = await (supabase.from("professionals" as any) as any)
          .select("id")
          .eq("user_id", otherUserId)
          .single();
        targetProfId = pro?.id;
      }

      if (!targetProfId) throw new Error("No professional found");

      // Check if conversation already exists
      const { data: existing } = await (supabase.from("conversations" as any) as any)
        .select("id")
        .eq("professional_id", targetProfId)
        .eq("patient_user_id", patientUserId)
        .limit(1);

      let convId: string;
      if (existing && existing.length > 0) {
        convId = existing[0].id;
        // Unhide if hidden
        const unhideField = mode === "patient" ? "hidden_by_patient" : "hidden_by_professional";
        await (supabase.from("conversations" as any) as any)
          .update({ [unhideField]: false })
          .eq("id", convId);
      } else {
        const { data: newConv, error } = await (supabase.from("conversations" as any) as any)
          .insert({ professional_id: targetProfId, patient_user_id: patientUserId })
          .select("id")
          .single();
        if (error) throw error;
        convId = newConv.id;

        // Send push notification to the professional when a patient starts a new conversation
        if (mode === "patient") {
          try {
            const { data: pro } = await (supabase.from("professionals" as any) as any)
              .select("user_id")
              .eq("id", targetProfId)
              .single();
            if (pro?.user_id) {
              const patientName = user?.user_metadata?.full_name || "Paciente";
              await supabase.functions.invoke("send-push-notification", {
                body: {
                  user_id: pro.user_id,
                  title: "Nova conversa",
                  body: `${patientName} iniciou uma conversa com você.`,
                  url: "/dashboard?tab=messages&conv=" + convId,
                },
              });
            }
          } catch (pushErr) {
            console.warn("Push notification failed:", pushErr);
          }
        }
      }

      setNewConvOpen(false);
      await fetchConversations();
      setActiveConvId(convId);
      setActiveOtherName(otherName);
      setMinimized(false);
      syncConversationParam(convId);
    } catch (err) {
      console.error("Start conversation error:", err);
    } finally {
      setCreatingConv(null);
    }
  };

  const filteredNewConvPatients = useMemo(() => {
    if (!newConvSearch.trim()) return newConvPatients;
    const q = newConvSearch.toLowerCase();
    return newConvPatients.filter(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
  }, [newConvPatients, newConvSearch]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConvId) ?? null,
    [activeConvId, conversations]
  );

  const filteredConversations = useMemo(() => {
    let list = [...conversations];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.other_name.toLowerCase().includes(q) ||
          (c.last_message && c.last_message.toLowerCase().includes(q))
      );
    }

    // Sort: unread first, then by updated_at desc
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
  }, [user, mode, professionalId]);

  // Open initial conversation if provided
  useEffect(() => {
    if (initialConversationId && conversations.length > 0) {
      const conv = conversations.find((c) => c.id === initialConversationId);
      if (conv && activeConvId !== conv.id) {
        setActiveConvId(conv.id);
        setActiveOtherName(conv.other_name);
        setMinimized(true);
      }
    }
  }, [activeConvId, initialConversationId, conversations]);

  useEffect(() => {
    if (!activeConvId || activeConversation) return;
    setActiveConvId(null);
    setActiveOtherName("");
    setMinimized(true);

    const currentConv = searchParams.get("conv");
    if (currentConv === activeConvId) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("conv");
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeConvId, activeConversation, searchParams, setSearchParams]);

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

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);

    let query = (supabase.from("conversations" as any) as any).select("*");

    if (mode === "patient") {
      query = query.eq("patient_user_id", user.id).eq("hidden_by_patient", false);
    } else if (professionalId) {
      query = query.eq("professional_id", professionalId).eq("hidden_by_professional", false);
    }

    const { data: convs } = await query.order("updated_at", { ascending: false });

    if (!convs || convs.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    // Enrich with other party name + last message + unread count
    const enriched: ConversationItem[] = [];

    for (const conv of convs) {
      let otherName = "...";

      if (mode === "patient") {
        const { data: pro } = await (supabase.from("professionals" as any) as any)
          .select("full_name")
          .eq("id", conv.professional_id)
          .single();
        otherName = pro?.full_name || "Profissional";
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", conv.patient_user_id)
          .single();
        otherName = profile?.full_name || "Paciente";
      }

      const { data: lastMsgs } = await (supabase.from("messages" as any) as any)
        .select("content, created_at")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const { count } = await (supabase.from("messages" as any) as any)
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .neq("sender_user_id", user.id)
        .is("read_at", null);

      enriched.push({
        ...conv,
        other_name: otherName,
        last_message: lastMsgs?.[0]?.content || "",
        unread_count: count || 0,
      });
    }

    setConversations(enriched);
    setLoading(false);
  };

  const handleDeleteConversation = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    if (!confirm(t("chat.delete_confirm"))) return;
    setDeletingId(convId);
    try {
      const field = mode === "patient" ? "hidden_by_patient" : "hidden_by_professional";
      await (supabase.from("conversations" as any) as any)
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

  const isPt = t("chat.no_conversations") !== "chat.no_conversations";

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
                {filteredNewConvPatients.map((p) => (
                  <button
                    key={p.user_id}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
                    onClick={() => handleStartConversation(p.user_id, p.name)}
                    disabled={!!creatingConv}
                  >
                    <Avatar className="h-8 w-8 border border-border shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {p.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-foreground block truncate">{p.name}</span>
                      {p.email && <span className="text-xs text-muted-foreground truncate block">{p.email}</span>}
                    </div>
                    {creatingConv === p.user_id && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      {/* Global video call listener */}
      {ENABLE_VIDEO_CALL && (
        <VideoCallListener conversationIds={conversations.map((c) => c.id)} />
      )}
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
                  setActiveConvId(conv.id);
                  setActiveOtherName(conv.other_name);
                  setMinimized(false);
                  syncConversationParam(conv.id);
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