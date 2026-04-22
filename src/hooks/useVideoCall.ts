import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export type VideoCallState = "idle" | "calling" | "ringing" | "connected" | "ended";

interface SignalPayload {
  type: "offer" | "answer" | "ice-candidate" | "call-request" | "call-accept" | "call-reject" | "call-end";
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  from: string;
  fromName?: string;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const CALL_TIMEOUT_MS = 60_000;

const SYSTEM_PREFIX = "📹 ";

export function useVideoCall(conversationId: string) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [state, setState] = useState<VideoCallState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUserName, setRemoteUserName] = useState("");

  const callStartTimeRef = useRef<number>(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Attach streams to video elements
  const attachLocalStream = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current;
    }
  }, []);

  const attachRemoteStream = useCallback((el: HTMLVideoElement | null) => {
    remoteVideoRef.current = el;
    if (el) {
      el.srcObject = remoteStreamRef.current;
    }
  }, []);

  const insertSystemMessage = useCallback(async (text: string) => {
    if (!user || !conversationId) return;
    try {
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_user_id: user.id,
        content: `${SYSTEM_PREFIX}${text}`,
      });
    } catch (e) {
      console.warn("Failed to insert video call system message:", e);
    }
  }, [user, conversationId]);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    pendingCandidatesRef.current = [];
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
  }, []);

  const sendSignal = useCallback((payload: Omit<SignalPayload, "from">) => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({
      type: "broadcast",
      event: "webrtc-signal",
      payload: { ...payload, from: user.id } as SignalPayload,
    });
  }, [user]);

  const getMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err: any) {
      // Try audio-only fallback
      if (err.name === "NotAllowedError" || err.name === "NotFoundError") {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          localStreamRef.current = audioStream;
          setIsCameraOff(true);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = audioStream;
          }
          toast({ title: t("chat.video_camera_denied"), variant: "default" });
          return audioStream;
        } catch {
          toast({ title: t("chat.video_permission_denied"), variant: "destructive" });
          return null;
        }
      }
      toast({ title: t("chat.video_permission_denied"), variant: "destructive" });
      return null;
    }
  }, [t]);

  const createPeerConnection = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        remoteStreamRef.current.addTrack(track);
      });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({ type: "ice-candidate", candidate: event.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        endCall();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [sendSignal]);

  const startDurationTimer = useCallback(() => {
    setCallDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const startCall = useCallback(async (callerName?: string) => {
    if (!user || state !== "idle") return;

    const stream = await getMedia();
    if (!stream) {
      insertSystemMessage("Videochamada não iniciada — permissão de câmera/microfone negada");
      return;
    }

    setState("calling");
    callStartTimeRef.current = Date.now();
    sendSignal({ type: "call-request", fromName: callerName || "Usuário" });

    // Push notification to recipient about incoming video call
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
          const { data: pro } = await supabase
            .from("professionals")
            .select("user_id")
            .eq("id", conv.professional_id)
            .single();
          recipientUserId = pro?.user_id || null;
        } else {
          recipientUserId = conv.patient_user_id;
        }

        if (recipientUserId) {
          await supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: recipientUserId,
              title: "Videochamada — Aliv.iA",
              body: `${callerName || "Alguém"} está ligando para você`,
              url: `/dashboard?tab=messages&conv=${conversationId}`,
            },
          });
        }
      } catch (e) {
        console.warn("Push notification for video call failed:", e);
      }
    })();

    timeoutRef.current = setTimeout(() => {
      if (pcRef.current?.connectionState !== "connected") {
        toast({ title: t("chat.video_no_answer") });
        insertSystemMessage("Videochamada não atendida");
        endCall();
      }
    }, CALL_TIMEOUT_MS);
  }, [user, state, getMedia, sendSignal, t, insertSystemMessage]);

  const acceptCall = useCallback(async (callerName?: string) => {
    if (!user) return;

    const stream = await getMedia();
    if (!stream) {
      sendSignal({ type: "call-reject" });
      setState("idle");
      insertSystemMessage("Videochamada rejeitada — permissão negada");
      return;
    }

    const pc = createPeerConnection(stream);

    // Apply any buffered ICE candidates
    for (const candidate of pendingCandidatesRef.current) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingCandidatesRef.current = [];

    setState("connected");
    startDurationTimer();
    callStartTimeRef.current = Date.now();
    insertSystemMessage("Videochamada iniciada");
    sendSignal({ type: "call-accept", fromName: callerName });
  }, [user, getMedia, createPeerConnection, sendSignal, startDurationTimer, insertSystemMessage]);

  const rejectCall = useCallback(() => {
    sendSignal({ type: "call-reject" });
    setState("idle");
    insertSystemMessage("Videochamada rejeitada");
    cleanup();
  }, [sendSignal, cleanup, insertSystemMessage]);

  const endCall = useCallback(() => {
    sendSignal({ type: "call-end" });
    if (callStartTimeRef.current > 0) {
      const durationSec = Math.round((Date.now() - callStartTimeRef.current) / 1000);
      const mins = Math.floor(durationSec / 60);
      const secs = durationSec % 60;
      const durationStr = mins > 0 ? `${mins}min ${secs}s` : `${secs}s`;
      insertSystemMessage(`Videochamada encerrada — duração: ${durationStr}`);
      callStartTimeRef.current = 0;
    }
    setState("ended");
    cleanup();
    // Reset to idle after brief delay
    setTimeout(() => setState("idle"), 2000);
  }, [sendSignal, cleanup, insertSystemMessage]);

  const toggleMute = useCallback(() => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  }, []);

  // Setup signaling channel
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase.channel(`video-${conversationId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "webrtc-signal" }, async ({ payload }: { payload: SignalPayload }) => {
      if (!payload || payload.from === user.id) return;

      switch (payload.type) {
        case "call-request":
          if (state === "idle" || state === "ended") {
            setRemoteUserName(payload.fromName || "");
            setState("ringing");
            // Vibrate if supported
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
          } else {
            // Busy
            channel.send({
              type: "broadcast",
              event: "webrtc-signal",
              payload: { type: "call-reject", from: user.id } as SignalPayload,
            });
          }
          break;

        case "call-accept": {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          const stream = localStreamRef.current;
          if (!stream) break;

          const pc = createPeerConnection(stream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal({ type: "offer", sdp: offer.sdp });
          setState("connected");
          startDurationTimer();
          break;
        }

        case "offer": {
          const pc = pcRef.current;
          if (!pc) break;
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: payload.sdp }));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ type: "answer", sdp: answer.sdp });

          // Apply buffered candidates
          for (const c of pendingCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          pendingCandidatesRef.current = [];
          break;
        }

        case "answer": {
          const pc = pcRef.current;
          if (!pc) break;
          await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: payload.sdp }));
          break;
        }

        case "ice-candidate": {
          if (payload.candidate) {
            const pc = pcRef.current;
            if (pc && pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } else {
              pendingCandidatesRef.current.push(payload.candidate);
            }
          }
          break;
        }

        case "call-reject":
          toast({ title: t("chat.video_busy") });
          if (callStartTimeRef.current === 0) {
            // Only the caller logs this (acceptor logs from rejectCall)
          }
          setState("idle");
          cleanup();
          break;

        case "call-end":
          setState("ended");
          cleanup();
          setTimeout(() => setState("idle"), 2000);
          break;
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (channelRef.current) {
        sendSignal({ type: "call-end" });
      }
    };
  }, [cleanup, sendSignal]);

  return {
    state,
    isMuted,
    isCameraOff,
    callDuration,
    remoteUserName,
    localStreamRef,
    remoteStreamRef: remoteStreamRef,
    attachLocalStream,
    attachRemoteStream,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}
