import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ENABLE_VIDEO_CALL } from "@/lib/featureFlags";
import IncomingCallModal from "./IncomingCallModal";
import VideoCallOverlay from "./VideoCallOverlay";

interface VideoCallListenerProps {
  conversationIds: string[];
  onNavigateToChat?: (conversationId: string) => void;
}

const SYSTEM_PREFIX = "📹 ";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/**
 * Global listener mounted at Dashboard level.
 * Watches ALL conversation broadcast channels for incoming call-request signals
 * using the SAME channel name the caller uses: `video-{convId}`.
 * 
 * On accept → acquires media, performs full WebRTC handshake inline.
 * On reject → logs rejection in chat.
 */
const VideoCallListener = ({ conversationIds, onNavigateToChat }: VideoCallListenerProps) => {
  const { user } = useAuth();

  // Ringing state
  const [isRinging, setIsRinging] = useState(false);
  const [incomingConvId, setIncomingConvId] = useState<string | null>(null);
  const [incomingCallerName, setIncomingCallerName] = useState("");
  const [callerId, setCallerId] = useState<string | null>(null);

  // Active call state
  const [callState, setCallState] = useState<"idle" | "connected" | "ended">("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const activeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStartTimeRef = useRef<number>(0);

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

  const insertSystemMessage = useCallback(async (convId: string, text: string) => {
    if (!user) return;
    try {
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_user_id: user.id,
        content: `${SYSTEM_PREFIX}${text}`,
      });
    } catch (e) {
      console.warn("Failed to insert video call system message:", e);
    }
  }, [user]);

  const cleanup = useCallback(() => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    pendingCandidatesRef.current = [];
    // Reset remote stream
    remoteStreamRef.current = new MediaStream();
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
  }, []);

  const sendSignal = useCallback((convId: string, payload: any) => {
    if (!user) return;
    // Use the SAME channel name as the caller: video-{convId}
    const channelName = `video-${convId}`;
    let channel = activeChannelRef.current;

    // If we don't have an active channel for this conversation, find it
    if (!channel) {
      console.warn("[VideoCallListener] No active channel to send signal on", channelName);
      return;
    }

    channel.send({
      type: "broadcast",
      event: "webrtc-signal",
      payload: { ...payload, from: user.id },
    });
  }, [user]);

  const getMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      return stream;
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "NotFoundError") {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          localStreamRef.current = audioStream;
          setIsCameraOff(true);
          return audioStream;
        } catch {
          return null;
        }
      }
      return null;
    }
  }, []);

  const createPeerConnection = useCallback((stream: MediaStream, convId: string) => {
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
        sendSignal(convId, { type: "ice-candidate", candidate: event.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[VideoCallListener] PC connection state:", pc.connectionState);
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        handleEndCall();
      }
    };

    pcRef.current = pc;
    return pc;
  }, [sendSignal]);

  // ── Listen on the SAME channel names the caller uses: `video-{convId}` ──
  useEffect(() => {
    if (!ENABLE_VIDEO_CALL || !user || conversationIds.length === 0) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    for (const convId of conversationIds) {
      // Use the EXACT same channel name as useVideoCall: `video-{convId}`
      const channel = supabase.channel(`video-${convId}`, {
        config: { broadcast: { self: false } },
      });

      channel.on("broadcast", { event: "webrtc-signal" }, async ({ payload }: any) => {
        if (!payload || payload.from === user.id) return;

        switch (payload.type) {
          case "call-request":
            // Only ring if we're idle
            if (!isRinging && callState === "idle") {
              console.log("[VideoCallListener] Incoming call on", convId, "from", payload.fromName);
              setIncomingConvId(convId);
              setIncomingCallerName(payload.fromName || "Usuário");
              setCallerId(payload.from);
              setIsRinging(true);
              activeChannelRef.current = channel;

              // Vibrate if supported
              if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
            }
            break;

          case "offer": {
            // The caller sent an offer after we accepted
            const pc = pcRef.current;
            if (!pc) {
              console.warn("[VideoCallListener] Got offer but no PC exists");
              break;
            }
            console.log("[VideoCallListener] Received offer, creating answer");
            await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: payload.sdp }));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal(convId, { type: "answer", sdp: answer.sdp });

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
            console.log("[VideoCallListener] Received answer");
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

          case "call-end":
            if (callState === "connected" || isRinging) {
              setCallState("ended");
              setIsRinging(false);
              cleanup();
              setTimeout(() => {
                setCallState("idle");
                setIncomingConvId(null);
              }, 2000);
            }
            break;

          case "call-reject":
            setIsRinging(false);
            setCallState("idle");
            cleanup();
            break;
        }
      });

      channel.subscribe();
      channels.push(channel);
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
      activeChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, conversationIds.join(",")]);

  const handleAccept = useCallback(async () => {
    if (!incomingConvId || !user) return;

    // Dismiss the ringing modal
    setIsRinging(false);

    // Navigate to the chat
    if (onNavigateToChat) {
      onNavigateToChat(incomingConvId);
    }

    // Acquire media
    const stream = await getMedia();
    if (!stream) {
      sendSignal(incomingConvId, { type: "call-reject" });
      setCallState("idle");
      insertSystemMessage(incomingConvId, "Videochamada rejeitada — permissão negada");
      return;
    }

    // Create peer connection
    const pc = createPeerConnection(stream, incomingConvId);

    // Apply any buffered ICE candidates
    for (const candidate of pendingCandidatesRef.current) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
    pendingCandidatesRef.current = [];

    // Set state and send accept signal
    setCallState("connected");
    callStartTimeRef.current = Date.now();
    setCallDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    insertSystemMessage(incomingConvId, "Videochamada iniciada");

    // Tell the caller we accepted — they will then create an offer
    sendSignal(incomingConvId, { type: "call-accept", fromName: user.user_metadata?.full_name || "Usuário" });

    // Attach local stream to video element
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [incomingConvId, user, onNavigateToChat, getMedia, createPeerConnection, sendSignal, insertSystemMessage]);

  const handleReject = useCallback(() => {
    if (incomingConvId) {
      sendSignal(incomingConvId, { type: "call-reject" });
      insertSystemMessage(incomingConvId, "Videochamada recusada");
    }

    setIsRinging(false);
    setIncomingConvId(null);
    setIncomingCallerName("");
    setCallerId(null);
    cleanup();
  }, [incomingConvId, sendSignal, insertSystemMessage, cleanup]);

  const handleEndCall = useCallback(() => {
    if (incomingConvId) {
      sendSignal(incomingConvId, { type: "call-end" });
      if (callStartTimeRef.current > 0) {
        const durationSec = Math.round((Date.now() - callStartTimeRef.current) / 1000);
        const mins = Math.floor(durationSec / 60);
        const secs = durationSec % 60;
        const durationStr = mins > 0 ? `${mins}min ${secs}s` : `${secs}s`;
        insertSystemMessage(incomingConvId, `Videochamada encerrada — duração: ${durationStr}`);
        callStartTimeRef.current = 0;
      }
    }
    setCallState("ended");
    cleanup();
    setTimeout(() => {
      setCallState("idle");
      setIncomingConvId(null);
      setIncomingCallerName("");
      setCallerId(null);
    }, 2000);
  }, [incomingConvId, sendSignal, cleanup, insertSystemMessage]);

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

  if (!ENABLE_VIDEO_CALL) return null;

  return (
    <>
      {/* Incoming call modal */}
      {isRinging && (
        <IncomingCallModal
          open
          callerName={incomingCallerName}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}

      {/* Active call overlay (after accept) */}
      {(callState === "connected" || callState === "ended") && incomingConvId && (
        <VideoCallOverlay
          state={callState === "connected" ? "connected" : "ended"}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          callDuration={callDuration}
          otherName={incomingCallerName}
          attachLocalStream={attachLocalStream}
          attachRemoteStream={attachRemoteStream}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onEndCall={handleEndCall}
        />
      )}
    </>
  );
};

export default VideoCallListener;
