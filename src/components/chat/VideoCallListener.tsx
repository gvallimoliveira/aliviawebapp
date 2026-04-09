import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ENABLE_VIDEO_CALL } from "@/lib/featureFlags";
import IncomingCallModal from "./IncomingCallModal";
import VideoCallOverlay from "./VideoCallOverlay";
import { useVideoCall } from "@/hooks/useVideoCall";

interface VideoCallListenerProps {
  conversationIds: string[];
  onCallStarted?: (conversationId: string) => void;
}

/**
 * Global listener that watches all conversation channels for incoming call requests.
 * Mounts in ConversationList, shows IncomingCallModal + VideoCallOverlay when needed.
 */
const VideoCallListener = ({ conversationIds, onCallStarted }: VideoCallListenerProps) => {
  const { user } = useAuth();
  const [incomingConvId, setIncomingConvId] = useState<string | null>(null);
  const [incomingCallerName, setIncomingCallerName] = useState("");

  // Use the hook for the active conversation (only when there's an incoming call)
  const activeConvId = incomingConvId || "none";
  const vc = useVideoCall(activeConvId);

  // Listen to all conversation channels for call-request
  useEffect(() => {
    if (!ENABLE_VIDEO_CALL || !user || conversationIds.length === 0) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    for (const convId of conversationIds) {
      const channel = supabase.channel(`video-listener-${convId}`, {
        config: { broadcast: { self: false } },
      });

      channel.on("broadcast", { event: "webrtc-signal" }, ({ payload }: any) => {
        if (!payload || payload.from === user.id) return;
        if (payload.type === "call-request") {
          setIncomingConvId(convId);
          setIncomingCallerName(payload.fromName || "Usuário");
          onCallStarted?.(convId);
        }
      });

      channel.subscribe();
      channels.push(channel);
    }

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [user?.id, conversationIds.join(",")]);

  const handleAccept = useCallback(() => {
    vc.acceptCall();
  }, [vc]);

  const handleReject = useCallback(() => {
    vc.rejectCall();
    setIncomingConvId(null);
    setIncomingCallerName("");
  }, [vc]);

  const handleEndCall = useCallback(() => {
    vc.endCall();
    setIncomingConvId(null);
    setIncomingCallerName("");
  }, [vc]);

  if (!ENABLE_VIDEO_CALL) return null;

  return (
    <>
      {/* Incoming call modal (ringing state) */}
      {vc.state === "ringing" && (
        <IncomingCallModal
          open
          callerName={incomingCallerName}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}

      {/* Active call overlay */}
      {(vc.state === "connected" || vc.state === "calling") && (
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
