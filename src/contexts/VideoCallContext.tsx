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

const CALL_TIMEOUT_MS = 90_000;
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
  // Set when the user opened the app from a push notification: we show the
  // ringing UI optimistically and wait for the caller to re-affirm the call.
  const joinConfirmTimeoutRef = useRef<number | null>(null);
  const joinedFromPushRef = useRef<string | null>(null);

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
    endingRef.current = false;
  }, [cleanup, setStateSync]);

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
              tag: `video-call-${convId}-${callId}`,
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
  }, [cleanup, insertSystemMessage, sendSignal, setStateSync, user]);

  const startConnectionTimeout = useCallback((message = "Falha ao conectar a videochamada") => {
    clearConnectionTimeout();

    connectionTimeoutRef.current = window.setTimeout(() => {
      if (stateRef.current === "connecting" || stateRef.current === "calling") {
        toast({ title: message, variant: "destructive" });
        endCallInternal(true, message);
      }
    }, CONNECTION_TIMEOUT_MS);
  }, [clearConnectionTimeout, endCallInternal]);

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
  }, [clearCallTimeout, clearConnectionTimeout, clearDisconnectGrace, insertSystemMessage, setStateSync]);

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
      } else if ((connectionState === "disconnected" || connectionState === "failed") && (Boolean(pc.remoteDescription) || connectedOnceRef.current || stateRef.current === "connecting" || stateRef.current === "connected")) {
        scheduleDisconnectRecovery();
      }
    };

    pc.oniceconnectionstatechange = () => {
      const iceState = pc.iceConnectionState;
      if (iceState === "connected" || iceState === "completed") {
        markConnected();
      } else if ((iceState === "disconnected" || iceState === "failed") && (Boolean(pc.remoteDescription) || connectedOnceRef.current || stateRef.current === "connecting" || stateRef.current === "connected")) {
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

        clearCallTimeout();
        console.log("[VideoCall][Caller] call-accept received — creating offer");
        setRemoteUserName(payload.fromName || remoteUserName || "Usuário");
        setStateSync("connecting");
        startConnectionTimeout();

        const stream = localStreamRef.current;
        if (!stream) {
          endCallInternal(true, "Falha ao iniciar a mídia local da videochamada");
          return;
        }

        const pc = createPeerConnection(stream, convId, payload.callId);

        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
          console.log("[VideoCall][Caller] createOffer OK — sdp length:", offer.sdp?.length);
          await pc.setLocalDescription(offer);
          console.log("[VideoCall][Caller] setLocalDescription OK");
          const offerSent = await sendSignal(convId, {
            type: "offer",
            callId: payload.callId,
            sdp: offer.sdp,
          });

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

  // Opened from a push notification ("Atender"): the call-request broadcast was
  // missed while the app was closed, so we ring locally and ask the caller to
  // re-announce the call. If nobody re-announces, we drop back to idle.
  const joinCallFromPush = useCallback((convId: string, callId: string, callerName: string) => {
    if (joinedFromPushRef.current === callId) return;
    if (stateRef.current !== "idle") return;

    joinedFromPushRef.current = callId;

    callIdRef.current = callId;
    activeConvIdRef.current = convId;
    setActiveConvId(convId);
    setIncomingCallerName(callerName);
    setRemoteUserName(callerName);
    setIsRinging(true);
    setStateSync("ringing");

    createRealtimeChannel(convId);
    void sendSignal(convId, { type: "call-ready", callId });

    if (joinConfirmTimeoutRef.current) clearTimeout(joinConfirmTimeoutRef.current);
    joinConfirmTimeoutRef.current = window.setTimeout(() => {
      joinConfirmTimeoutRef.current = null;
      if (stateRef.current === "ringing" && callIdRef.current === callId) {
        toast({ title: t("chat.video_call_expired") || "A chamada não está mais ativa" });
        resetToIdle();
      }
    }, 12_000);
  }, [createRealtimeChannel, resetToIdle, sendSignal, setStateSync, t]);

  // 1) App was opened/reloaded by the notification (URL carries the call).
  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const convId = params.get("conv");
    const callId = params.get("call");
    if (!convId || !callId) return;

    const callerName = params.get("callname") || "Usuário";

    // Clean the URL so a refresh doesn't re-ring an old call.
    try {
      params.delete("call");
      params.delete("callname");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
    } catch {
      /* noop */
    }

    joinCallFromPush(convId, callId, decodeURIComponent(callerName));
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
        const callerName = target.searchParams.get("callname") || "Usuário";
        if (convId && callId) {
          joinCallFromPush(convId, callId, decodeURIComponent(callerName));
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

    const callId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    localStreamRef.current = stream;
    callIdRef.current = callId;
    activeConvIdRef.current = conversationId;
    setActiveConvId(conversationId);
    setIncomingCallerName("");
    setRemoteUserName(otherName);
    setStateSync("calling");
    endingRef.current = false;

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

    void (async () => {
      try {
        const pushBody = {
          conversation_id: conversationId,
          title: "Chamada de vídeo recebida",
          body: `${callerName} está te chamando…`,
          url: `/dashboard?tab=messages&conv=${conversationId}&call=${callId}&callname=${encodeURIComponent(callerName)}`,
          kind: "video-call",
          tag: `video-call-${conversationId}-${callId}`,
          category: "messages",
          call_id: callId,
        };

        // A duplicate uses the same notification tag and call id, so devices
        // collapse it into one visible alert. Retrying protects the call from a
        // transient function/network failure without ringing twice.
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          const { data, error } = await supabase.functions.invoke("send-push-notification", {
            body: pushBody,
          });
          if (!error && data?.sent > 0) return;
          console.warn(`[VideoCall] Push attempt ${attempt} did not deliver:`, error || data);
          if (attempt === 1) await new Promise((resolve) => window.setTimeout(resolve, 900));
        }
      } catch (error) {
        console.error("[VideoCall] Push for video failed:", error);
      }
    })();

    clearCallTimeout();
    timeoutRef.current = window.setTimeout(() => {
      if (stateRef.current === "calling") {
        toast({ title: t("chat.video_no_answer") });
        void insertSystemMessage(conversationId, "Videochamada não atendida");
        endCallInternal(true);
      }
    }, CALL_TIMEOUT_MS);
  }, [
    clearCallTimeout,
    endCallInternal,
    getMedia,
    insertSystemMessage,
    resetToIdle,
    safeAttach,
    sendSignal,
    setStateSync,
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

      startConnectionTimeout();
    }

    // Do NOT navigate to chat here. The overlay is global and shows on top
    // of any tab. Navigating early was tearing down the receiver UI on mobile.
  }, [
    createPeerConnection,
    endCallInternal,
    flushPendingCandidates,
    getMedia,
    insertSystemMessage,
    resetToIdle,
    sendSignal,
    setStateSync,
    startConnectionTimeout,
    user,
  ]);

  const handleRejectCall = useCallback(() => {
    const convId = activeConvIdRef.current;
    const callId = callIdRef.current;

    if (convId && callId) {
      void sendSignal(convId, { type: "call-reject", callId }, false);
      void insertSystemMessage(convId, "Videochamada recusada");
    }

    resetToIdle();
  }, [insertSystemMessage, resetToIdle, sendSignal]);

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
