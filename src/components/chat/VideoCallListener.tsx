import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ENABLE_VIDEO_CALL } from "@/lib/featureFlags";
import IncomingCallModal from "./IncomingCallModal";
import VideoCallOverlay from "./VideoCallOverlay";
import { useVideoCall } from "@/hooks/useVideoCall";

interface VideoCallListenerProps {
  conversationIds: string[];
  onNavigateToChat?: (conversationId: string) => void;
}

const SYSTEM_PREFIX = "📹 ";

/**
 * Global listener mounted at Dashboard level.
 * Watches ALL conversation broadcast channels for incoming call-request signals.
 * Shows IncomingCallModal when a call arrives, regardless of which tab is active.
 * On accept → navigates to chat + starts WebRTC flow.
 * On reject → logs rejection in chat, stays on current screen.
 */
const VideoCallListener = ({ conversationIds, onNavigateToChat }: VideoCallListenerProps) => {
  const { user } = useAuth();

  // Local ringing state — independent of useVideoCall so modal shows instantly
  const [isRinging, setIsRinging] = useState(false);
  const [incomingConvId, setIncomingConvId] = useState<string | null>(null);
  const [incomingCallerName, setIncomingCallerName] = useState("");

  // Once accepted, we delegate to useVideoCall for the actual WebRTC session
  const [acceptedConvId, setAcceptedConvId] = useState<string | null>(null);
  const vc = useVideoCall(acceptedConvId || "__none__");

  // Track whether we already triggered acceptCall to avoid double-fire
  const acceptTriggeredRef = useRef(false);

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

  // ── Listen on the SAME channel names the caller uses: `video-{convId}` ──
  useEffect(() => {
    if (!ENABLE_VIDEO_CALL || !user || conversationIds.length === 0) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    for (const convId of conversationIds) {
      // Use a distinct multiplexed name so we don't collide with the
      // per-conversation useVideoCall channel that the *caller* already has open.
      const channel = supabase.channel(`video-global-${convId}`, {
        config: { broadcast: { self: false } },
      });

      channel.on("broadcast", { event: "webrtc-signal" }, ({ payload }: any) => {
        if (!payload || payload.from === user.id) return;

        if (payload.type === "call-request") {
          setIncomingConvId(convId);
          setIncomingCallerName(payload.fromName || "Usuário");
          setIsRinging(true);

          // Vibrate if supported
          if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
        }
      });

      channel.subscribe();
      channels.push(channel);
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, conversationIds.join(",")]);

  // ── When useVideoCall becomes "ringing" after we set acceptedConvId, auto-accept ──
  useEffect(() => {
    if (acceptedConvId && vc.state === "ringing" && !acceptTriggeredRef.current) {
      acceptTriggeredRef.current = true;
      vc.acceptCall();
    }
  }, [acceptedConvId, vc.state, vc.acceptCall]);

  const handleAccept = useCallback(() => {
    if (!incomingConvId) return;

    // Dismiss the ringing modal
    setIsRinging(false);
    acceptTriggeredRef.current = false;

    // Activate useVideoCall for this conversation — it will subscribe to the
    // channel and receive the call-request, transitioning to "ringing", which
    // the effect above auto-accepts.
    setAcceptedConvId(incomingConvId);

    // Navigate to the chat
    if (onNavigateToChat) {
      onNavigateToChat(incomingConvId);
    }
  }, [incomingConvId, onNavigateToChat]);

  const handleReject = useCallback(() => {
    if (incomingConvId) {
      // Send reject signal on the caller's channel
      const rejectChannel = supabase.channel(`video-reject-${incomingConvId}`, {
        config: { broadcast: { self: false } },
      });
      rejectChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          rejectChannel.send({
            type: "broadcast",
            event: "webrtc-signal",
            payload: { type: "call-reject", from: user?.id },
          });
          // Log rejection in chat
          insertSystemMessage(incomingConvId, "Videochamada recusada");
          // Clean up the temporary channel after a short delay
          setTimeout(() => supabase.removeChannel(rejectChannel), 2000);
        }
      });
    }

    setIsRinging(false);
    setIncomingConvId(null);
    setIncomingCallerName("");
  }, [incomingConvId, user, insertSystemMessage]);

  const handleEndCall = useCallback(() => {
    vc.endCall();
    setAcceptedConvId(null);
    setIncomingConvId(null);
    setIncomingCallerName("");
    acceptTriggeredRef.current = false;
  }, [vc]);

  if (!ENABLE_VIDEO_CALL) return null;

  return (
    <>
      {/* ── Incoming call modal — shows on ANY tab ── */}
      {isRinging && (
        <IncomingCallModal
          open
          callerName={incomingCallerName}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}

      {/* ── Active call overlay (after accept) ── */}
      {acceptedConvId && (vc.state === "connected" || vc.state === "calling") && (
        <VideoCallOverlay
          state={vc.state}
          isMuted={vc.isMuted}
          isCameraOff={vc.isCameraOff}
          callDuration={vc.callDuration}
          otherName={incomingCallerName}
          attachLocalStream={vc.attachLocalStream}
          attachRemoteStream={vc.attachRemoteStream}
          onToggleMute={vc.toggleMute}
          onToggleCamera={vc.toggleCamera}
          onEndCall={handleEndCall}
        />
      )}
    </>
  );
};

export default VideoCallListener;
