import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import IncomingCallModal from "@/components/chat/IncomingCallModal";
import VideoCallOverlay from "@/components/chat/VideoCallOverlay";

export type VideoCallState = "idle" | "calling" | "ringing" | "connecting" | "connected" | "ended";

interface VideoCallContextValue {
  state: VideoCallState;
  activeConversationId: string | null;
  isMuted: boolean;
  isCameraOff: boolean;
  callDuration: number;
  remoteUserName: string;
  startCall: (conversationId: string, callerName: string, otherName: string) => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const VideoCallContext = createContext<VideoCallContextValue | null>(null);

const NO_OP_VALUE: VideoCallContextValue = {
  state: "idle",
  activeConversationId: null,
  isMuted: false,
  isCameraOff: false,
  callDuration: 0,
  remoteUserName: "",
  startCall: async () => {},
  endCall: () => {},
  toggleMute: () => {},
  toggleCamera: () => {},
};

export function useVideoCallContext(): VideoCallContextValue {
  const ctx = useContext(VideoCallContext);
  return ctx ?? NO_OP_VALUE;
}

/* ── ICE servers with TURN relay fallback ── */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:80?transport=tcp",
      "turn:openrelay.metered.ca:443",
      "turns:openrelay.metered.ca:443",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

const CALL_TIMEOUT_MS = 60_000;
const SYSTEM_PREFIX = "📹 ";

interface SignalPayload {
  type: "offer" | "answer" | "ice-candidate" | "call-request" | "call-accept" | "call-reject" | "call-end";
  callId: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  from: string;
  fromName?: string;
}

interface VideoCallProviderProps {
  conversationIds: string[];
  onNavigateToChat?: (conversationId: string) => void;
  children: React.ReactNode;
}

export function VideoCallProvider({ conversationIds, onNavigateToChat, children }: VideoCallProviderProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  /* ── Rendered state ── */
  const [state, setState] = useState<VideoCallState>("idle");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUserName, setRemoteUserName] = useState("");
  const [isRinging, setIsRinging] = useState(false);
  const [incomingCallerName, setIncomingCallerName] = useState("");

  /* ── Refs (avoid stale closures in broadcast callbacks) ── */
  const stateRef = useRef<VideoCallState>("idle");
  const activeConvIdRef = useRef<string | null>(null);
  const callIdRef = useRef<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef(new MediaStream());
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartTimeRef = useRef(0);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());

  const setStateSync = useCallback((s: VideoCallState) => {
    stateRef.current = s;
    setState(s);
  }, []);

  /* ── Helpers ── */
  const sendSignal = useCallback((convId: string, payload: Omit<SignalPayload, "from">) => {
    if (!user) return;
    const channel = channelsRef.current.get(convId);
    if (!channel) { console.warn("[VideoCall] No channel for", convId); return; }
    channel.send({ type: "broadcast", event: "webrtc-signal", payload: { ...payload, from: user.id } as SignalPayload });
  }, [user]);

  const insertSystemMessage = useCallback(async (convId: string, text: string) => {
    if (!user) return;
    try {
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_user_id: user.id,
        content: `${SYSTEM_PREFIX}${text}`,
      });
    } catch (e) { console.warn("System msg insert failed:", e); }
  }, [user]);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (durationIntervalRef.current) { clearInterval(durationIntervalRef.current); durationIntervalRef.current = null; }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidatesRef.current = [];
    remoteStreamRef.current = new MediaStream();
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
    callStartTimeRef.current = 0;
  }, []);

  const endCallInternal = useCallback((sendEndSignal: boolean) => {
    const convId = activeConvIdRef.current;
    const callId = callIdRef.current;
    if (convId && sendEndSignal && callId) {
      sendSignal(convId, { type: "call-end", callId });
    }
    if (convId && callStartTimeRef.current > 0) {
      const dur = Math.round((Date.now() - callStartTimeRef.current) / 1000);
      const m = Math.floor(dur / 60), s = dur % 60;
      insertSystemMessage(convId, `Videochamada encerrada — duração: ${m > 0 ? `${m}min ${s}s` : `${s}s`}`);
    }
    cleanup();
    setStateSync("ended");
    setIsRinging(false);
    activeConvIdRef.current = null;
    callIdRef.current = null;
    setTimeout(() => { setStateSync("idle"); setActiveConvId(null); setRemoteUserName(""); }, 2000);
  }, [sendSignal, insertSystemMessage, cleanup, setStateSync]);

  const getMedia = useCallback(async (): Promise<MediaStream | null> => {
    try {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err: any) {
      if (["NotAllowedError", "NotFoundError", "NotReadableError"].includes(err.name)) {
        try {
          const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
          setIsCameraOff(true);
          toast({ title: t("chat.video_camera_denied"), variant: "default" });
          return audio;
        } catch { /* fall through */ }
      }
      toast({ title: t("chat.video_permission_denied"), variant: "destructive" });
      return null;
    }
  }, [t]);

  const safeAttach = useCallback((el: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!el) return;
    el.srcObject = stream;
    if (stream) {
      el.onloadedmetadata = () => { el.play().catch(() => {}); };
    }
  }, []);

  const attachLocalStream = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    safeAttach(el, localStreamRef.current);
  }, [safeAttach]);

  const attachRemoteStream = useCallback((el: HTMLVideoElement | null) => {
    remoteVideoRef.current = el;
    safeAttach(el, remoteStreamRef.current);
  }, [safeAttach]);

  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    const buf = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];
    for (const c of buf) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (e) { console.warn("ICE add failed:", e); }
    }
  }, []);

  const createPeerConnection = useCallback((stream: MediaStream, convId: string, callId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      const remote = remoteStreamRef.current;
      event.streams[0]?.getTracks().forEach((track) => {
        if (!remote.getTracks().find((t) => t.id === track.id)) {
          remote.addTrack(track);
        }
      });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remote;
        remoteVideoRef.current.onloadedmetadata = () => { remoteVideoRef.current?.play().catch(() => {}); };
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(convId, { type: "ice-candidate", callId, candidate: event.candidate.toJSON() });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("[VideoCall] ICE state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        if (stateRef.current === "connecting" || stateRef.current === "calling") {
          setStateSync("connected");
          callStartTimeRef.current = Date.now();
          setCallDuration(0);
          durationIntervalRef.current = setInterval(() => setCallDuration((p) => p + 1), 1000);
          const cid = activeConvIdRef.current;
          if (cid) insertSystemMessage(cid, "Videochamada iniciada");
        }
      } else if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
        endCallInternal(true);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [sendSignal, setStateSync, insertSystemMessage, endCallInternal]);

  /* ── Signal handler (accessed via ref to avoid effect re-subscription) ── */
  const handleSignal = useCallback(async (convId: string, payload: SignalPayload) => {
    if (!user || payload.from === user.id) return;
    const currentCallId = callIdRef.current;

    switch (payload.type) {
      case "call-request": {
        if (stateRef.current !== "idle") return;
        console.log("[VideoCall] Incoming call", convId, "callId:", payload.callId);
        callIdRef.current = payload.callId;
        activeConvIdRef.current = convId;
        setActiveConvId(convId);
        setIncomingCallerName(payload.fromName || "Usuário");
        setRemoteUserName(payload.fromName || "Usuário");
        setIsRinging(true);
        setStateSync("ringing");
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        break;
      }

      case "call-accept": {
        if (payload.callId !== currentCallId || stateRef.current !== "calling") return;
        console.log("[VideoCall] Accepted by", payload.fromName);
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        setRemoteUserName(payload.fromName || "Usuário");
        setStateSync("connecting");
        const stream = localStreamRef.current;
        if (!stream) { endCallInternal(true); return; }
        const pc = createPeerConnection(stream, convId, payload.callId);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal(convId, { type: "offer", callId: payload.callId, sdp: offer.sdp });
        } catch (e) { console.error("Offer failed:", e); endCallInternal(true); }
        break;
      }

      case "offer": {
        if (payload.callId !== currentCallId) return;
        const pc = pcRef.current;
        if (!pc) return;
        console.log("[VideoCall] Received offer");
        try {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: payload.sdp }));
          await flushPendingCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal(convId, { type: "answer", callId: payload.callId, sdp: answer.sdp });
        } catch (e) { console.error("Answer failed:", e); endCallInternal(true); }
        break;
      }

      case "answer": {
        if (payload.callId !== currentCallId) return;
        const pc = pcRef.current;
        if (!pc) return;
        console.log("[VideoCall] Received answer");
        try {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: payload.sdp }));
          await flushPendingCandidates();
        } catch (e) { console.error("Handle answer failed:", e); endCallInternal(true); }
        break;
      }

      case "ice-candidate": {
        if (payload.callId !== currentCallId || !payload.candidate) return;
        const pc = pcRef.current;
        if (pc?.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
        } else {
          pendingCandidatesRef.current.push(payload.candidate);
        }
        break;
      }

      case "call-reject": {
        if (payload.callId !== currentCallId) return;
        toast({ title: t("chat.video_busy") });
        cleanup();
        setStateSync("idle");
        setActiveConvId(null);
        activeConvIdRef.current = null;
        callIdRef.current = null;
        break;
      }

      case "call-end": {
        if (payload.callId !== currentCallId) return;
        endCallInternal(false);
        break;
      }
    }
  }, [user, t, setStateSync, sendSignal, createPeerConnection, flushPendingCandidates, endCallInternal, cleanup]);

  const handleSignalRef = useRef(handleSignal);
  handleSignalRef.current = handleSignal;

  /* ── Subscribe to broadcast channels ── */
  useEffect(() => {
    if (!user || conversationIds.length === 0) return;

    const map = new Map<string, ReturnType<typeof supabase.channel>>();

    for (const convId of conversationIds) {
      const ch = supabase.channel(`video-${convId}`, { config: { broadcast: { self: false } } });
      ch.on("broadcast", { event: "webrtc-signal" }, ({ payload }: { payload: SignalPayload }) => {
        if (payload) handleSignalRef.current(convId, payload);
      });
      ch.subscribe();
      map.set(convId, ch);
    }

    channelsRef.current = map;

    return () => {
      map.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = new Map();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, conversationIds.join(",")]);

  /* ── Public: start outgoing call ── */
  const startCall = useCallback(async (conversationId: string, callerName: string, otherName: string) => {
    if (!user || stateRef.current !== "idle") return;

    const stream = await getMedia();
    if (!stream) {
      insertSystemMessage(conversationId, "Videochamada não iniciada — permissão de câmera/microfone negada");
      return;
    }

    const callId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    localStreamRef.current = stream;
    callIdRef.current = callId;
    activeConvIdRef.current = conversationId;
    setActiveConvId(conversationId);
    setRemoteUserName(otherName);
    setStateSync("calling");

    if (localVideoRef.current) safeAttach(localVideoRef.current, stream);

    sendSignal(conversationId, { type: "call-request", callId, fromName: callerName });

    // Push notification (fire-and-forget)
    (async () => {
      try {
        const { data: conv } = await supabase
          .from("conversations")
          .select("patient_user_id, professional_id")
          .eq("id", conversationId)
          .single();
        if (!conv) return;
        let recipientUserId: string | null = null;
        if (conv.patient_user_id === user.id) {
          const { data: pro } = await supabase.from("professionals").select("user_id").eq("id", conv.professional_id).single();
          recipientUserId = pro?.user_id || null;
        } else {
          recipientUserId = conv.patient_user_id;
        }
        if (recipientUserId) {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: recipientUserId,
              title: "Videochamada — Aliv.iA",
              body: `${callerName} está ligando para você`,
              url: `/dashboard?tab=messages&conv=${conversationId}`,
            },
          });
        }
      } catch (e) { console.warn("Push for video failed:", e); }
    })();

    timeoutRef.current = setTimeout(() => {
      if (stateRef.current === "calling") {
        toast({ title: t("chat.video_no_answer") });
        insertSystemMessage(conversationId, "Videochamada não atendida");
        endCallInternal(true);
      }
    }, CALL_TIMEOUT_MS);
  }, [user, getMedia, sendSignal, setStateSync, insertSystemMessage, endCallInternal, t, safeAttach]);

  /* ── Accept incoming call ── */
  const handleAcceptCall = useCallback(async () => {
    const convId = activeConvIdRef.current;
    const callId = callIdRef.current;
    if (!convId || !callId || !user) return;

    setIsRinging(false);
    if (onNavigateToChat) onNavigateToChat(convId);

    const stream = await getMedia();
    if (!stream) {
      sendSignal(convId, { type: "call-reject", callId });
      insertSystemMessage(convId, "Videochamada rejeitada — permissão negada");
      cleanup();
      setStateSync("idle");
      setActiveConvId(null);
      activeConvIdRef.current = null;
      callIdRef.current = null;
      return;
    }

    localStreamRef.current = stream;
    setStateSync("connecting");
    createPeerConnection(stream, convId, callId);
    sendSignal(convId, { type: "call-accept", callId, fromName: user.user_metadata?.full_name || "Usuário" });
    if (localVideoRef.current) safeAttach(localVideoRef.current, stream);
  }, [user, getMedia, sendSignal, createPeerConnection, insertSystemMessage, cleanup, setStateSync, onNavigateToChat, safeAttach]);

  /* ── Reject incoming call ── */
  const handleRejectCall = useCallback(() => {
    const convId = activeConvIdRef.current;
    const callId = callIdRef.current;
    if (convId && callId) {
      sendSignal(convId, { type: "call-reject", callId });
      insertSystemMessage(convId, "Videochamada recusada");
    }
    setIsRinging(false);
    cleanup();
    setStateSync("idle");
    setActiveConvId(null);
    activeConvIdRef.current = null;
    callIdRef.current = null;
  }, [sendSignal, insertSystemMessage, cleanup, setStateSync]);

  const endCall = useCallback(() => endCallInternal(true), [endCallInternal]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsCameraOff(!track.enabled); }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { if (stateRef.current !== "idle") endCallInternal(true); };
  }, [endCallInternal]);

  const contextValue: VideoCallContextValue = {
    state, activeConversationId: activeConvId, isMuted, isCameraOff, callDuration,
    remoteUserName, startCall, endCall, toggleMute, toggleCamera,
  };

  // Map internal state to overlay's VideoCallState type
  const overlayState = state === "connecting" ? "calling" : state;
  const showOverlay = state === "calling" || state === "connecting" || state === "connected" || state === "ended";

  return (
    <VideoCallContext.Provider value={contextValue}>
      {children}

      {isRinging && (
        <IncomingCallModal
          open
          callerName={incomingCallerName}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {showOverlay && activeConvId && (
        <VideoCallOverlay
          state={overlayState as any}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          callDuration={callDuration}
          otherName={remoteUserName}
          attachLocalStream={attachLocalStream}
          attachRemoteStream={attachRemoteStream}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onEndCall={endCall}
        />
      )}
    </VideoCallContext.Provider>
  );
}
