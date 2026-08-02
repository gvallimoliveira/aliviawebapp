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
  startCall: (
    conversationId: string,
    callerName: string,
    otherName: string,
    preparedStream?: MediaStream | null,
  ) => Promise<void>;
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

// Must match `expires_at` of the durable session (video-call-session: 90s), so
// the caller never gives up while the recipient is still booting from a push.
const CALL_TIMEOUT_MS = 90_000;
const ACCEPT_RESEND_MS = 3_000;
const TERMINAL_STATUSES = ["rejected", "missed", "ended", "failed"];
const CONNECTION_TIMEOUT_MS = 30_000;
const DISCONNECT_GRACE_MS = 6_000;
const SYSTEM_PREFIX = "📹 ";

interface SignalPayload {
  type:
    | "offer"
    | "answer"
    | "ice-candidate"
    | "call-request"
    | "call-accept"
    | "call-reject"
    | "call-end"
    | "call-ready";
  callId: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  from: string;
  fromName?: string;
}

interface PersistedCallSession {
  id: string;
  conversation_id: string;
  caller_user_id: string;
  recipient_user_id: string;
  caller_name: string;
  status: "ringing" | "accepted" | "connecting" | "connected" | "rejected" | "missed" | "ended" | "failed";
  expires_at: string;
  push_devices_found?: number;
  push_sent?: number;
  failure_reason?: string | null;
}

interface VideoCallProviderProps {
  conversationIds: string[];
  onNavigateToChat?: (conversationId: string) => void;
  children: React.ReactNode;
}

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const isStreamUsable = (stream?: MediaStream | null) => Boolean(stream && stream.getTracks().some((track) => track.readyState === "live"));

export function useVideoCallContext(): VideoCallContextValue {
  const ctx = useContext(VideoCallContext);
  return ctx ?? NO_OP_VALUE;
}

export function VideoCallProvider({ conversationIds, onNavigateToChat, children }: VideoCallProviderProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [state, setState] = useState<VideoCallState>("idle");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUserName, setRemoteUserName] = useState("");
  const [isRinging, setIsRinging] = useState(false);
  const [incomingCallerName, setIncomingCallerName] = useState("");

  const stateRef = useRef<VideoCallState>("idle");
  const activeConvIdRef = useRef<string | null>(null);
  const callIdRef = useRef<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef(new MediaStream());
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const incomingOfferSdpRef = useRef<string | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const connectionTimeoutRef = useRef<number | null>(null);
  const disconnectGraceRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);
  const callStartTimeRef = useRef(0);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const channelsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());
  const channelStatusRef = useRef<Map<string, string>>(new Map());
  const endingRef = useRef(false);
  const connectedOnceRef = useRef(false);
  const disconnectRestartAttemptsRef = useRef(0);
  const handleSignalRef = useRef<(convId: string, payload: SignalPayload) => Promise<void>>(async () => {});
  const persistedCallRef = useRef<PersistedCallSession | null>(null);
  // Set when the user opened the app from a push notification: we show the
  // ringing UI optimistically and wait for the caller to re-affirm the call.
  const joinConfirmTimeoutRef = useRef<number | null>(null);
  const joinedFromPushRef = useRef<string | null>(null);
  // Guards the caller's offer creation: the accept can arrive twice (broadcast
  // + database realtime) and must only negotiate once.
  const negotiationStartedRef = useRef<string | null>(null);
  const acceptResendTimeoutRef = useRef<number | null>(null);
  const acceptResendAttemptsRef = useRef(0);

  const setStateSync = useCallback((nextState: VideoCallState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const clearCallTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clearConnectionTimeout = useCallback(() => {
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  const clearDisconnectGrace = useCallback(() => {
    if (disconnectGraceRef.current) {
      clearTimeout(disconnectGraceRef.current);
      disconnectGraceRef.current = null;
    }
  }, []);

  const safeAttach = useCallback((element: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!element) return;

    const attemptPlay = () => {
      void element.play().catch(() => {});
    };

    element.srcObject = stream;
    element.onloadedmetadata = null;

    if (!stream) return;

    element.onloadedmetadata = attemptPlay;
    attemptPlay();
  }, []);

  const attachLocalStream = useCallback((element: HTMLVideoElement | null) => {
    localVideoRef.current = element;
    safeAttach(element, localStreamRef.current);
  }, [safeAttach]);

  const attachRemoteStream = useCallback((element: HTMLVideoElement | null) => {
    remoteVideoRef.current = element;
    safeAttach(element, remoteStreamRef.current);
  }, [safeAttach]);

  const stopStream = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const resetVisualState = useCallback(() => {
    setIsRinging(false);
    setIncomingCallerName("");
    setIsMuted(false);
    setIsCameraOff(false);
    setCallDuration(0);
    callStartTimeRef.current = 0;
    connectedOnceRef.current = false;
    disconnectRestartAttemptsRef.current = 0;
  }, []);

  const resetPeerSession = useCallback((preservedLocalStream?: MediaStream | null) => {
    clearConnectionTimeout();
    clearDisconnectGrace();

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    const pc = pcRef.current;
    if (pc) {
      pc.ontrack = null;
      pc.onicecandidate = null;
      pc.oniceconnectionstatechange = null;
      pc.onconnectionstatechange = null;
      pc.close();
      pcRef.current = null;
    }

    pendingCandidatesRef.current = [];
    incomingOfferSdpRef.current = null;
    remoteStreamRef.current = new MediaStream();
    callStartTimeRef.current = 0;
    connectedOnceRef.current = false;
    disconnectRestartAttemptsRef.current = 0;
    setCallDuration(0);

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    if (preservedLocalStream) {
      localStreamRef.current = preservedLocalStream;
      if (localVideoRef.current) {
        safeAttach(localVideoRef.current, preservedLocalStream);
      }
      return;
    }

    stopStream(localStreamRef.current);
    localStreamRef.current = null;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  }, [clearConnectionTimeout, clearDisconnectGrace, safeAttach, stopStream]);

  const cleanup = useCallback(() => {
    clearCallTimeout();
    if (joinConfirmTimeoutRef.current) {
      clearTimeout(joinConfirmTimeoutRef.current);
      joinConfirmTimeoutRef.current = null;
    }
    if (acceptResendTimeoutRef.current) {
      clearInterval(acceptResendTimeoutRef.current);
      acceptResendTimeoutRef.current = null;
    }
    acceptResendAttemptsRef.current = 0;
    negotiationStartedRef.current = null;
    resetPeerSession();
    resetVisualState();
  }, [clearCallTimeout, resetPeerSession, resetVisualState]);

  const insertSystemMessage = useCallback(async (convId: string, text: string) => {
    if (!user) return;

    try {
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_user_id: user.id,
        content: `${SYSTEM_PREFIX}${text}`,
      });
    } catch (error) {
      console.warn("System msg insert failed:", error);
    }
  }, [user]);

  const createRealtimeChannel = useCallback((convId: string) => {
    const existing = channelsRef.current.get(convId);
    if (existing) {
      return existing;
    }

    const channel = supabase.channel(`video-${convId}`, {
      config: { broadcast: { self: false } },
    });

    channelStatusRef.current.set(convId, "SUBSCRIBING");

    channel.on("broadcast", { event: "webrtc-signal" }, ({ payload }: { payload: SignalPayload }) => {
      if (payload) {
        void handleSignalRef.current(convId, payload);
      }
    });

    channel.subscribe((status) => {
      channelStatusRef.current.set(convId, status);
    });

    channelsRef.current.set(convId, channel);
    return channel;
  }, []);

  const waitForChannelReady = useCallback(async (convId: string) => {
    createRealtimeChannel(convId);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const status = channelStatusRef.current.get(convId);
      if (status === "SUBSCRIBED") {
        return true;
      }
      await delay(150);
    }

    return channelStatusRef.current.get(convId) === "SUBSCRIBED";
  }, [createRealtimeChannel]);

  const sendSignal = useCallback(async (convId: string, payload: Omit<SignalPayload, "from">, critical = true) => {
    if (!user) return false;

    const ready = await waitForChannelReady(convId);
    if (!ready) {
      console.warn("[VideoCall] Channel not ready for", convId, payload.type);
      return false;
    }

    const channel = channelsRef.current.get(convId);
    if (!channel) {
      return false;
    }

    const message: { type: "broadcast"; event: string; payload: SignalPayload } = {
      type: "broadcast",
      event: "webrtc-signal",
      payload: { ...payload, from: user.id } satisfies SignalPayload,
    };

    for (let attempt = 0; attempt < (critical ? 2 : 1); attempt += 1) {
      try {
        const result = (await channel.send(message)) as unknown as string;
        if (result === "ok") {
          return true;
        }
      } catch (error) {
        console.warn("[VideoCall] Failed sending signal", payload.type, error);
      }

      if (critical) {
        await delay(150);
      }
    }

    return false;
  }, [user, waitForChannelReady]);

  const resetToIdle = useCallback(() => {
    cleanup();
    setStateSync("idle");
    setActiveConvId(null);
    setRemoteUserName("");
    activeConvIdRef.current = null;
    callIdRef.current = null;
    persistedCallRef.current = null;
    endingRef.current = false;
  }, [cleanup, setStateSync]);

  const updatePersistedCall = useCallback(async (
    status: Exclude<PersistedCallSession["status"], "ringing">,
    failureReason?: string,
  ) => {
    const callId = callIdRef.current;
    if (!callId) return false;
    const { data, error } = await supabase.functions.invoke("video-call-session", {
      body: { action: "update", call_id: callId, status, failure_reason: failureReason },
    });
    if (error || data?.error) {
      console.warn("[VideoCall] Failed to persist status", status, error || data?.error);
      return false;
    }
    if (data?.call) persistedCallRef.current = data.call as PersistedCallSession;
    return true;
  }, []);

  // The database row is the durable truth about a call. Used before giving up
  // or before writing a failure message, so we never contradict it.
  const fetchCallRow = useCallback(async (callId: string) => {
    try {
      const { data } = await (supabase.from("video_call_sessions" as any) as any)
        .select("*")
        .eq("id", callId)
        .maybeSingle();
      return (data as PersistedCallSession | null) ?? null;
    } catch {
      return null;
    }
  }, []);

  const isTerminalRow = (row: PersistedCallSession | null) =>
    Boolean(row && (TERMINAL_STATUSES.includes(row.status) || new Date(row.expires_at).getTime() <= Date.now()));

  const endCallInternal = useCallback((sendEndSignal: boolean, endMessage?: string) => {
    if (endingRef.current) {
      return;
    }

    endingRef.current = true;

    const convId = activeConvIdRef.current;
    const callId = callIdRef.current;
    const shouldLogDuration = callStartTimeRef.current > 0 && !endMessage;

    if (sendEndSignal && convId && callId) {
      void sendSignal(convId, { type: "call-end", callId }, false);
      void updatePersistedCall("ended");

      // Silent push to clear the incoming-call notification on the other side.
      void (async () => {
        try {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              conversation_id: convId,
              title: "Chamada encerrada",
              body: "",
              url: `/dashboard?tab=messages&conv=${convId}`,
              kind: "video-call-cancel",
              tag: `video-call-${callId}`,
              category: "messages",
            },
          });
        } catch {}
      })();
    }

    if (convId) {
      if (shouldLogDuration) {
        const durationSeconds = Math.round((Date.now() - callStartTimeRef.current) / 1000);
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        const durationText = minutes > 0 ? `${minutes}min ${seconds}s` : `${seconds}s`;
        void insertSystemMessage(convId, `Videochamada encerrada — duração: ${durationText}`);
      } else if (endMessage) {
        void insertSystemMessage(convId, endMessage);
      }
    }

    cleanup();
    setStateSync("ended");
    setIsRinging(false);
    setIncomingCallerName("");
    activeConvIdRef.current = null;
    callIdRef.current = null;

    window.setTimeout(() => {
      setStateSync("idle");
      setActiveConvId(null);
      setRemoteUserName("");
      endingRef.current = false;
    }, 2000);
  }, [cleanup, insertSystemMessage, sendSignal, setStateSync, updatePersistedCall, user]);

  const startConnectionTimeout = useCallback((message = "Falha ao conectar a videochamada") => {
    clearConnectionTimeout();

    connectionTimeoutRef.current = window.setTimeout(() => {
      if (stateRef.current !== "connecting" && stateRef.current !== "calling") return;

      void (async () => {
        const callId = callIdRef.current;
        const row = callId ? await fetchCallRow(callId) : null;

        // The other side already hung up / the invite expired: end quietly
        // instead of logging a misleading connection failure in the chat.
        if (isTerminalRow(row)) {
          endCallInternal(false);
          return;
        }

        toast({ title: message, variant: "destructive" });
        endCallInternal(true, message);
      })();
    }, CONNECTION_TIMEOUT_MS);
  }, [clearConnectionTimeout, endCallInternal, fetchCallRow]);

  const markConnected = useCallback(() => {
    if (connectedOnceRef.current) {
      return;
    }

    connectedOnceRef.current = true;
    clearCallTimeout();
    clearConnectionTimeout();
    clearDisconnectGrace();
    disconnectRestartAttemptsRef.current = 0;

    setStateSync("connected");
    void updatePersistedCall("connected");

    if (!callStartTimeRef.current) {
      callStartTimeRef.current = Date.now();
    }

    if (!durationIntervalRef.current) {
      durationIntervalRef.current = window.setInterval(() => {
        setCallDuration(Math.max(0, Math.round((Date.now() - callStartTimeRef.current) / 1000)));
      }, 1000);
    }

    const convId = activeConvIdRef.current;
    if (convId) {
      void insertSystemMessage(convId, "Videochamada iniciada");
    }
  }, [clearCallTimeout, clearConnectionTimeout, clearDisconnectGrace, insertSystemMessage, setStateSync, updatePersistedCall]);

  const queueCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    const pc = pcRef.current;

    if (pc?.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn("[VideoCall] ICE add failed", error);
      }
      return;
    }

    pendingCandidatesRef.current.push(candidate);
  }, []);

  const flushPendingCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) {
      return;
    }

    const bufferedCandidates = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];

    for (const candidate of bufferedCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.warn("[VideoCall] Buffered ICE add failed", error);
      }
    }
  }, []);

  const scheduleDisconnectRecovery = useCallback(() => {
    clearDisconnectGrace();

    disconnectGraceRef.current = window.setTimeout(() => {
      const pc = pcRef.current;
      if (!pc) {
        return;
      }

      if (disconnectRestartAttemptsRef.current < 1) {
        disconnectRestartAttemptsRef.current += 1;
        try {
          pc.restartIce();
          startConnectionTimeout("Tentando restabelecer a videochamada");
          return;
        } catch (error) {
          console.warn("[VideoCall] ICE restart failed", error);
        }
      }

      endCallInternal(true, "Falha ao manter a conexão da videochamada");
    }, DISCONNECT_GRACE_MS);
  }, [clearDisconnectGrace, endCallInternal, startConnectionTimeout]);

  const createPeerConnection = useCallback((stream: MediaStream, convId: string, callId: string) => {
    resetPeerSession(stream);

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: "max-bundle",
    });

    const audioTracks = stream.getAudioTracks();
    const videoTracks = stream.getVideoTracks();

    audioTracks.forEach((track) => pc.addTrack(track, stream));
    videoTracks.forEach((track) => pc.addTrack(track, stream));

    if (audioTracks.length === 0) {
      pc.addTransceiver("audio", { direction: "recvonly" });
    }

    if (videoTracks.length === 0) {
      pc.addTransceiver("video", { direction: "recvonly" });
    }

    pc.ontrack = (event) => {
      const remoteStream = remoteStreamRef.current;
      event.streams[0]?.getTracks().forEach((track) => {
        if (!remoteStream.getTracks().some((existingTrack) => existingTrack.id === track.id)) {
          remoteStream.addTrack(track);
        }
      });

      if (remoteVideoRef.current) {
        safeAttach(remoteVideoRef.current, remoteStream);
      }
    };

    pc.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      void sendSignal(convId, {
        type: "ice-candidate",
        callId,
        candidate: event.candidate.toJSON(),
      }, false);
    };

    pc.onconnectionstatechange = () => {
      const connectionState = pc.connectionState;
      if (connectionState === "connected") {
        markConnected();
      } else if ((connectionState === "disconnected" || connectionState === "failed") && (Boolean(pc.remoteDescription) || connectedOnceRef.current)) {
        scheduleDisconnectRecovery();
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      if (iceState === "connected" || iceState === "completed") {
        markConnected();
      } else if ((iceState === "disconnected" || iceState === "failed") && (Boolean(pc.remoteDescription) || connectedOnceRef.current)) {
        scheduleDisconnectRecovery();
      }
    };

    pcRef.current = pc;

    if (localVideoRef.current) {
      safeAttach(localVideoRef.current, stream);
    }

    return pc;
  }, [markConnected, resetPeerSession, safeAttach, scheduleDisconnectRecovery, sendSignal]);

  const getMedia = useCallback(async (preferredStream?: MediaStream | null) => {
    if (isStreamUsable(preferredStream)) {
      setIsCameraOff(preferredStream!.getVideoTracks().length === 0);
      return preferredStream!;
    }

    if (preferredStream) {
      stopStream(preferredStream);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setIsCameraOff(stream.getVideoTracks().length === 0);
      return stream;
    } catch (error: any) {
      if (["NotAllowedError", "NotFoundError", "NotReadableError", "AbortError"].includes(error?.name)) {
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          setIsCameraOff(true);
          toast({ title: t("chat.video_camera_denied"), variant: "default" });
          return audioOnlyStream;
        } catch {
          toast({ title: t("chat.video_permission_denied"), variant: "destructive" });
          return null;
        }
      }

      toast({ title: t("chat.video_permission_denied"), variant: "destructive" });
      return null;
    }
  }, [stopStream, t]);

  // Caller side: create and send the offer once the recipient accepted.
  // Reachable from two independent paths (realtime broadcast `call-accept` and
  // the durable database status change), guarded to negotiate only once.
  const beginCallerNegotiation = useCallback(async (
    convId: string,
    callId: string,
    otherName?: string,
  ) => {
    if (negotiationStartedRef.current === callId) {
      const existingOffer = pcRef.current?.localDescription;
      if (stateRef.current === "connecting" && existingOffer?.type === "offer") {
        console.log("[VideoCall][Caller] duplicate accept — re-sending existing offer");
        await sendSignal(convId, { type: "offer", callId, sdp: existingOffer.sdp });
      }
      return;
    }
    if (stateRef.current !== "calling") return;
    negotiationStartedRef.current = callId;

    clearCallTimeout();
    if (otherName) setRemoteUserName(otherName);
    setStateSync("connecting");
    startConnectionTimeout();

    const stream = localStreamRef.current;
    if (!stream) {
      endCallInternal(true, "Falha ao iniciar a mídia local da videochamada");
      return;
    }

    const pc = createPeerConnection(stream, convId, callId);

    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      console.log("[VideoCall][Caller] createOffer OK — sdp length:", offer.sdp?.length);
      await pc.setLocalDescription(offer);
      const offerSent = await sendSignal(convId, { type: "offer", callId, sdp: offer.sdp });

      if (!offerSent) {
        console.error("[VideoCall][Caller] sendSignal(offer) FAILED");
        endCallInternal(true, "Falha ao enviar a oferta da videochamada");
      } else {
        console.log("[VideoCall][Caller] offer sent OK");
      }
    } catch (error) {
      console.error("[VideoCall] Offer failed", error);
      endCallInternal(true, "Falha ao negociar a videochamada");
    }
  }, [clearCallTimeout, createPeerConnection, endCallInternal, sendSignal, setStateSync, startConnectionTimeout]);


  const handleSignal = useCallback(async (convId: string, payload: SignalPayload) => {
    if (!user || payload.from === user.id) {
      return;
    }

    const currentCallId = callIdRef.current;

    switch (payload.type) {
      case "call-ready": {
        // Receiver opened the app from a push notification and is waiting for
        // the caller to re-announce the call. Only the caller answers this.
        if (stateRef.current === "calling" && payload.callId === currentCallId) {
          console.log("[VideoCall][Caller] call-ready received — re-sending call-request");
          void sendSignal(convId, {
            type: "call-request",
            callId: payload.callId,
            fromName: user.user_metadata?.full_name || remoteUserName || "Usuário",
          });
        }
        return;
      }

      case "call-request": {
        const isPushJoinConfirm =
          stateRef.current === "ringing" && payload.callId === currentCallId;

        if (stateRef.current !== "idle" && !isPushJoinConfirm) {
          console.log("[VideoCall][Receiver] call-request ignored — state:", stateRef.current);
          await sendSignal(convId, { type: "call-reject", callId: payload.callId }, false);
          return;
        }

        if (joinConfirmTimeoutRef.current) {
          clearTimeout(joinConfirmTimeoutRef.current);
          joinConfirmTimeoutRef.current = null;
        }

        if (isPushJoinConfirm) {
          // Call is confirmed alive: just refresh the caller name.
          if (payload.fromName) {
            setIncomingCallerName(payload.fromName);
            setRemoteUserName(payload.fromName);
          }
          return;
        }

        cleanup();
        console.log("[VideoCall][Receiver] call-request received — callId:", payload.callId, "from:", payload.fromName);
        callIdRef.current = payload.callId;
        activeConvIdRef.current = convId;
        setActiveConvId(convId);
        setIncomingCallerName(payload.fromName || "Usuário");
        setRemoteUserName(payload.fromName || "Usuário");
        setIsRinging(true);
        setStateSync("ringing");

        if (navigator.vibrate) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
        return;
      }


      case "call-accept": {
        if (payload.callId !== currentCallId || stateRef.current !== "calling") {
          console.log("[VideoCall][Caller] call-accept ignored — callId match:", payload.callId === currentCallId, "state:", stateRef.current);
          return;
        }

        console.log("[VideoCall][Caller] call-accept received — creating offer");
        await beginCallerNegotiation(convId, payload.callId, payload.fromName || remoteUserName || "Usuário");
        return;
      }

      case "offer": {
        if (payload.callId !== currentCallId) {
          console.log("[VideoCall][Receiver] offer ignored — callId mismatch:", payload.callId, "expected:", currentCallId);
          return;
        }

        const pc = pcRef.current;
        if (!pc) {
          console.log("[VideoCall][Receiver] offer received but NO PC yet — buffering SDP (length:", payload.sdp?.length, ")");
          incomingOfferSdpRef.current = payload.sdp || null;
          return;
        }

        if (acceptResendTimeoutRef.current) {
          clearInterval(acceptResendTimeoutRef.current);
          acceptResendTimeoutRef.current = null;
          acceptResendAttemptsRef.current = 0;
        }

        // An offer may be deliberately repeated when the first answer was lost.
        // In that case, resend the already-created answer instead of applying
        // the same remote description again in the stable signaling state.
        const existingAnswer = pc.localDescription;
        if (pc.signalingState === "stable" && existingAnswer?.type === "answer") {
          console.log("[VideoCall][Receiver] duplicate offer — re-sending existing answer");
          await sendSignal(convId, {
            type: "answer",
            callId: payload.callId,
            sdp: existingAnswer.sdp,
          });
          return;
        }

        try {
          console.log("[VideoCall][Receiver] offer received WITH PC — setRemoteDescription...");
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: payload.sdp }));
          console.log("[VideoCall][Receiver] setRemoteDescription OK — flushing candidates...");
          await flushPendingCandidates();
          console.log("[VideoCall][Receiver] flushPendingCandidates OK — createAnswer...");
          const answer = await pc.createAnswer();
          console.log("[VideoCall][Receiver] createAnswer OK — sdp length:", answer.sdp?.length);
          await pc.setLocalDescription(answer);
          console.log("[VideoCall][Receiver] setLocalDescription OK — sending answer...");
          startConnectionTimeout();

          const answerSent = await sendSignal(convId, {
            type: "answer",
            callId: payload.callId,
            sdp: answer.sdp,
          });

          if (!answerSent) {
            console.error("[VideoCall][Receiver] sendSignal(answer) FAILED");
            endCallInternal(true, "Falha ao enviar a resposta da videochamada");
          } else {
            console.log("[VideoCall][Receiver] answer sent OK");
          }
        } catch (error) {
          console.error("[VideoCall] Answer failed", error);
          endCallInternal(true, "Falha ao concluir a videochamada");
        }
        return;
      }

      case "answer": {
        if (payload.callId != currentCallId) {
          console.log("[VideoCall][Caller] answer ignored — callId mismatch");
          return;
        }

        const pc = pcRef.current;
        if (!pc) {
          console.error("[VideoCall][Caller] answer received but NO PC");
          endCallInternal(true, "Falha ao aplicar a resposta da videochamada");
          return;
        }

        try {
          console.log("[VideoCall][Caller] answer received — setRemoteDescription...");
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: payload.sdp }));
          console.log("[VideoCall][Caller] setRemoteDescription(answer) OK — flushing candidates...");
          await flushPendingCandidates();
          console.log("[VideoCall][Caller] flushPendingCandidates OK after answer");
          startConnectionTimeout();
        } catch (error) {
          console.error("[VideoCall] Handle answer failed", error);
          endCallInternal(true, "Falha ao conectar a videochamada");
        }
        return;
      }

      case "ice-candidate": {
        if (payload.callId !== currentCallId || !payload.candidate) {
          console.log("[VideoCall] ICE candidate ignored — callId match:", payload.callId === currentCallId, "has candidate:", Boolean(payload.candidate));
          return;
        }

        console.log("[VideoCall] ICE candidate received — type:", payload.candidate?.candidate?.slice(0, 60));
        await queueCandidate(payload.candidate);
        return;
      }

      case "call-reject": {
        if (payload.callId !== currentCallId) {
          return;
        }

        toast({ title: t("chat.video_busy") });
        resetToIdle();
        return;
      }

      case "call-end": {
        if (payload.callId !== currentCallId) {
          console.log("[VideoCall] call-end ignored — callId mismatch");
          return;
        }

        console.log("[VideoCall] call-end received — ending");
        endCallInternal(false);
        return;
      }
    }
  }, [
    beginCallerNegotiation,
    clearCallTimeout,
    createPeerConnection,
    endCallInternal,
    flushPendingCandidates,
    queueCandidate,
    remoteUserName,
    resetToIdle,
    sendSignal,
    setStateSync,
    startConnectionTimeout,
    t,
    user,
  ]);

  handleSignalRef.current = handleSignal;

  useEffect(() => {
    if (!user) {
      return;
    }

    const expectedConversationIds = new Set(conversationIds);
    conversationIds.forEach((convId) => {
      createRealtimeChannel(convId);
    });

    channelsRef.current.forEach((channel, convId) => {
      if (!expectedConversationIds.has(convId) && convId !== activeConvIdRef.current) {
        supabase.removeChannel(channel);
        channelsRef.current.delete(convId);
        channelStatusRef.current.delete(convId);
      }
    });
  }, [conversationIds.join(","), createRealtimeChannel, user?.id]);

  useEffect(() => {
    return () => {
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();
      channelStatusRef.current.clear();
      cleanup();
    };
  }, [cleanup]);

  const presentPersistedIncomingCall = useCallback((call: PersistedCallSession) => {
    if (call.recipient_user_id !== user?.id || call.status !== "ringing") return;
    if (new Date(call.expires_at).getTime() <= Date.now()) {
      void supabase.functions.invoke("video-call-session", {
        body: { action: "update", call_id: call.id, status: "missed", failure_reason: "expired" },
      });
      return;
    }
    if (stateRef.current !== "idle" && callIdRef.current !== call.id) return;

    persistedCallRef.current = call;
    callIdRef.current = call.id;
    activeConvIdRef.current = call.conversation_id;
    setActiveConvId(call.conversation_id);
    setIncomingCallerName(call.caller_name || "Usuário");
    setRemoteUserName(call.caller_name || "Usuário");
    setIsRinging(true);
    setStateSync("ringing");
    createRealtimeChannel(call.conversation_id);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
  }, [createRealtimeChannel, setStateSync, user?.id]);

  // A notification only carries the durable call ID. The current database row
  // is authoritative, so a delayed click can never resurrect an expired call.
  const joinCallFromPush = useCallback(async (convId: string, callId: string) => {
    if (joinedFromPushRef.current === callId) return;
    if (stateRef.current !== "idle") return;

    joinedFromPushRef.current = callId;
    let row: any = null;
    const { data } = await (supabase.from("video_call_sessions" as any) as any)
      .select("*")
      .eq("id", callId)
      .eq("conversation_id", convId)
      .maybeSingle();
    row = data;

    // Cold boot from a notification can race the session hydration. Fall back
    // to the server-side pending lookup so the ringing popup still appears.
    if (!row) {
      const { data: pending } = await supabase.functions.invoke("video-call-session", {
        body: { action: "pending" },
      });
      if (pending?.call?.id === callId) row = pending.call;
    }

    if (!row || row.status !== "ringing" || new Date(row.expires_at).getTime() <= Date.now()) {
      toast({ title: t("chat.video_call_expired") || "A chamada não está mais ativa" });
      return;
    }
    presentPersistedIncomingCall(row as PersistedCallSession);
    void sendSignal(convId, { type: "call-ready", callId });
  }, [presentPersistedIncomingCall, sendSignal, t]);

  // Durable recovery path: realtime while open, plus a pending-call lookup on
  // login, app resume and visibility restoration.
  useEffect(() => {
    if (!user) return;
    let active = true;
    const recoverPending = async () => {
      const { data, error } = await supabase.functions.invoke("video-call-session", { body: { action: "pending" } });
      if (active && !error && data?.call) presentPersistedIncomingCall(data.call as PersistedCallSession);
    };
    void recoverPending();
    const onResume = () => { if (document.visibilityState === "visible") void recoverPending(); };
    document.addEventListener("visibilitychange", onResume);

    const channel = supabase
      .channel(`video-call-sessions-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "video_call_sessions" }, (event: any) => {
        const call = event.new as PersistedCallSession | undefined;
        if (!call) return;
        if (call.recipient_user_id === user.id && call.status === "ringing") presentPersistedIncomingCall(call);

        // Durable accept path: if the broadcast `call-accept` never landed
        // (recipient booting from a push, app in background), the database
        // status change still triggers the caller's offer.
        if (
          call.id === callIdRef.current &&
          call.caller_user_id === user.id &&
          (call.status === "accepted" || call.status === "connecting") &&
          stateRef.current === "calling"
        ) {
          void beginCallerNegotiation(call.conversation_id, call.id);
        }

        if (call.id === callIdRef.current && TERMINAL_STATUSES.includes(call.status)) {
          if (stateRef.current === "calling" && call.status === "missed") toast({ title: t("chat.video_no_answer") });
          resetToIdle();
        }
      })
      .subscribe();

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onResume);
      supabase.removeChannel(channel);
    };
  }, [beginCallerNegotiation, presentPersistedIncomingCall, resetToIdle, t, user?.id]);

  // 1) App was opened/reloaded by the notification (URL carries the call).
  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const convId = params.get("conv");
    const callId = params.get("call");
    if (!convId || !callId) return;

    // Clean the URL so a refresh doesn't re-ring an old call.
    try {
      params.delete("call");
      params.delete("callname");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    } catch {
      /* noop */
    }

    void joinCallFromPush(convId, callId);
  }, [joinCallFromPush, user?.id]);

  // 2) App was already open: the service worker hands the call over.
  useEffect(() => {
    if (!user || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || msg.type !== "notification-click" || msg.kind !== "video-call") return;

      try {
        const target = new URL(msg.url, window.location.origin);
        const convId = target.searchParams.get("conv");
        const callId = msg.callId || target.searchParams.get("call");
        if (convId && callId) {
          void joinCallFromPush(convId, callId);
        }
      } catch {
        /* noop */
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [joinCallFromPush, user?.id]);




  const startCall = useCallback(async (
    conversationId: string,
    callerName: string,
    otherName: string,
    preparedStream?: MediaStream | null,
  ) => {
    if (!user || stateRef.current !== "idle") {
      return;
    }

    const stream = await getMedia(preparedStream);
    if (!stream) {
      void insertSystemMessage(conversationId, "Videochamada não iniciada — permissão de câmera/microfone negada");
      return;
    }

    const requestedCallId = crypto.randomUUID();
    localStreamRef.current = stream;
    callIdRef.current = requestedCallId;
    activeConvIdRef.current = conversationId;
    setActiveConvId(conversationId);
    setIncomingCallerName("");
    setRemoteUserName(otherName);
    setStateSync("calling");
    endingRef.current = false;
    createRealtimeChannel(conversationId);

    const { data: sessionResult, error: sessionError } = await supabase.functions.invoke("video-call-session", {
      body: { action: "start", call_id: requestedCallId, conversation_id: conversationId, caller_name: callerName },
    });
    const call = sessionResult?.call as PersistedCallSession | undefined;
    if (sessionError || !call) {
      stopStream(stream);
      resetToIdle();
      toast({ title: "Não foi possível notificar o destinatário", variant: "destructive" });
      void insertSystemMessage(conversationId, "Videochamada não iniciada — falha ao criar o convite");
      return;
    }
    const callId = call.id;

    persistedCallRef.current = call;
    callIdRef.current = callId;

    if (localVideoRef.current) {
      safeAttach(localVideoRef.current, stream);
    }

    const requestSent = await sendSignal(conversationId, {
      type: "call-request",
      callId,
      fromName: callerName,
    });

    if (!requestSent) {
      resetToIdle();
      toast({ title: "Falha ao iniciar a videochamada", variant: "destructive" });
      void insertSystemMessage(conversationId, "Videochamada não iniciada — falha de sinalização");
      return;
    }

    if (sessionResult?.delivery?.sent === 0) {
      toast({ title: "Destinatário sem push disponível; tentando pelo app aberto" });
    }

    clearCallTimeout();
    timeoutRef.current = window.setTimeout(() => {
      if (stateRef.current !== "calling") return;

      void (async () => {
        // Never hang up on a recipient who already accepted: the durable row is
        // authoritative and the accept can be in flight.
        const row = await fetchCallRow(callId);
        if (row && (row.status === "accepted" || row.status === "connecting" || row.status === "connected")) {
          void beginCallerNegotiation(conversationId, callId);
          return;
        }

        if (stateRef.current !== "calling") return;
        toast({ title: t("chat.video_no_answer") });
        void insertSystemMessage(conversationId, "Videochamada não atendida");
        endCallInternal(true);
      })();
    }, CALL_TIMEOUT_MS);
  }, [
    beginCallerNegotiation,
    clearCallTimeout,
    fetchCallRow,
    createRealtimeChannel,
    endCallInternal,
    getMedia,
    insertSystemMessage,
    resetToIdle,
    safeAttach,
    sendSignal,
    setStateSync,
    stopStream,
    t,
    user,
  ]);

  const handleAcceptCall = useCallback(async () => {
    const convId = activeConvIdRef.current;
    const callId = callIdRef.current;
    if (!convId || !callId || !user) {
      console.log("[VideoCall][Receiver] handleAcceptCall aborted — convId:", convId, "callId:", callId, "user:", Boolean(user));
      return;
    }

    // Lock state immediately so any re-render of the ringing UI cannot race
    // with the accept flow (Dialog/overlay close → onReject was the prior bug).
    if (stateRef.current !== "ringing") {
      console.log("[VideoCall][Receiver] handleAcceptCall ignored — state is", stateRef.current);
      return;
    }

    setIsRinging(false);
    setStateSync("connecting");
    endingRef.current = false;

    // The caller may already have hung up (or the invite expired) while the
    // recipient was opening the app from the notification: end quietly instead
    // of negotiating a dead call and logging a failure in the chat.
    const currentRow = await fetchCallRow(callId);
    if (isTerminalRow(currentRow)) {
      toast({ title: "A chamada não está mais ativa" });
      resetToIdle();
      return;
    }

    const persisted = await updatePersistedCall("accepted");
    if (!persisted) {
      toast({ title: "Não foi possível confirmar a chamada", variant: "destructive" });
      resetToIdle();
      return;
    }

    console.log("[VideoCall][Receiver] handleAcceptCall — acquiring media...");
    const stream = await getMedia();
    if (!stream) {
      console.error("[VideoCall][Receiver] getMedia FAILED — rejecting call");
      await sendSignal(convId, { type: "call-reject", callId });
      void insertSystemMessage(convId, "Videochamada rejeitada — permissão negada");
      resetToIdle();
      return;
    }

    console.log("[VideoCall][Receiver] getMedia OK — tracks:", stream.getTracks().map(t => `${t.kind}:${t.readyState}`).join(", "));
    localStreamRef.current = stream;
    setIncomingCallerName("");

    // IMPORTANT: read the buffered offer BEFORE creating the peer connection —
    // createPeerConnection() resets the session and clears this ref.
    const pendingOfferSdp = incomingOfferSdpRef.current;
    const pc = createPeerConnection(stream, convId, callId);
    console.log("[VideoCall][Receiver] PC created — hasPendingOffer:", Boolean(pendingOfferSdp), "sdpLen:", pendingOfferSdp?.length);

    if (pendingOfferSdp) {
      try {
        incomingOfferSdpRef.current = null;
        console.log("[VideoCall][Receiver] setRemoteDescription(buffered offer)...");
        await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: pendingOfferSdp }));
        console.log("[VideoCall][Receiver] setRemoteDescription OK — flushing candidates...");
        await flushPendingCandidates();
        console.log("[VideoCall][Receiver] createAnswer...");
        const answer = await pc.createAnswer();
        console.log("[VideoCall][Receiver] createAnswer OK — setLocalDescription...");
        await pc.setLocalDescription(answer);
        console.log("[VideoCall][Receiver] setLocalDescription OK — sending answer...");
        startConnectionTimeout();

        const answerSent = await sendSignal(convId, {
          type: "answer",
          callId,
          sdp: answer.sdp,
        });

        if (!answerSent) {
          console.error("[VideoCall][Receiver] sendSignal(answer) FAILED");
          endCallInternal(true, "Falha ao enviar a resposta da videochamada");
          return;
        } else {
          console.log("[VideoCall][Receiver] answer sent OK (from buffered offer path)");
        }
      } catch (error) {
        console.error("[VideoCall] Late offer answer failed", error);
        endCallInternal(true, "Falha ao concluir a videochamada");
        return;
      }
    } else {
      console.log("[VideoCall][Receiver] NO buffered offer — sending call-accept and waiting for offer...");
      const acceptSent = await sendSignal(convId, {
        type: "call-accept",
        callId,
        fromName: user.user_metadata?.full_name || "Usuário",
      });

      if (!acceptSent) {
        console.error("[VideoCall][Receiver] sendSignal(call-accept) FAILED");
        endCallInternal(true, "Falha ao confirmar a videochamada");
        return;
      } else {
        console.log("[VideoCall][Receiver] call-accept sent OK — waiting for offer...");
      }

      // The caller may not have been subscribed to the channel yet when the
      // accept went out. Resend once until the offer actually arrives.
      if (acceptResendTimeoutRef.current) clearInterval(acceptResendTimeoutRef.current);
      acceptResendAttemptsRef.current = 0;
      acceptResendTimeoutRef.current = window.setInterval(() => {
        if (stateRef.current !== "connecting" || pcRef.current?.remoteDescription) {
          if (acceptResendTimeoutRef.current) clearInterval(acceptResendTimeoutRef.current);
          acceptResendTimeoutRef.current = null;
          return;
        }

        acceptResendAttemptsRef.current += 1;
        if (acceptResendAttemptsRef.current > 3) {
          if (acceptResendTimeoutRef.current) clearInterval(acceptResendTimeoutRef.current);
          acceptResendTimeoutRef.current = null;
          return;
        }

        console.log("[VideoCall][Receiver] no offer yet — resending call-accept", acceptResendAttemptsRef.current);
        void sendSignal(convId, {
          type: "call-accept",
          callId,
          fromName: user.user_metadata?.full_name || "Usuário",
        });
      }, ACCEPT_RESEND_MS);

      startConnectionTimeout();
    }

    // Do NOT navigate to chat here. The overlay is global and shows on top
    // of any tab. Navigating early was tearing down the receiver UI on mobile.
  }, [
    createPeerConnection,
    endCallInternal,
    fetchCallRow,
    flushPendingCandidates,
    getMedia,
    insertSystemMessage,
    resetToIdle,
    sendSignal,
    setStateSync,
    startConnectionTimeout,
    t,
    updatePersistedCall,
    user,
  ]);

  const handleRejectCall = useCallback(() => {
    const convId = activeConvIdRef.current;
    const callId = callIdRef.current;

    if (convId && callId) {
      void updatePersistedCall("rejected");
      void sendSignal(convId, { type: "call-reject", callId }, false);
      void insertSystemMessage(convId, "Videochamada recusada");
    }

    resetToIdle();
  }, [insertSystemMessage, resetToIdle, sendSignal, updatePersistedCall]);

  const endCall = useCallback(() => {
    endCallInternal(true);
  }, [endCallInternal]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) {
      return;
    }

    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }, []);

  const toggleCamera = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) {
      return;
    }

    track.enabled = !track.enabled;
    setIsCameraOff(!track.enabled);
  }, []);

  const contextValue: VideoCallContextValue = {
    state,
    activeConversationId: activeConvId,
    isMuted,
    isCameraOff,
    callDuration,
    remoteUserName,
    startCall,
    endCall,
    toggleMute,
    toggleCamera,
  };

  const overlayState = state;
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
          state={overlayState as VideoCallState}
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
