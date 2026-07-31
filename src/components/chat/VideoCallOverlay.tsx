import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import type { VideoCallState } from "@/contexts/VideoCallContext";

interface VideoCallOverlayProps {
  state: VideoCallState;
  isMuted: boolean;
  isCameraOff: boolean;
  callDuration: number;
  otherName: string;
  attachLocalStream: (el: HTMLVideoElement | null) => void;
  attachRemoteStream: (el: HTMLVideoElement | null) => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const VideoCallOverlay = ({
  state,
  isMuted,
  isCameraOff,
  callDuration,
  otherName,
  attachLocalStream,
  attachRemoteStream,
  onToggleMute,
  onToggleCamera,
  onEndCall,
}: VideoCallOverlayProps) => {
  const { t } = useLanguage();
  const [pipPosition, setPipPosition] = useState({ x: 16, y: 16 });
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handlePipDragStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    draggingRef.current = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragOffsetRef.current = { x: clientX - pipPosition.x, y: clientY - pipPosition.y };
  }, [pipPosition]);

  const handlePipDrag = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!draggingRef.current) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setPipPosition({
      x: Math.max(0, clientX - dragOffsetRef.current.x),
      y: Math.max(0, clientY - dragOffsetRef.current.y),
    });
  }, []);

  const handlePipDragEnd = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const statusLabel =
    state === "calling"
      ? t("chat.video_calling")
      : state === "connecting"
      ? t("chat.video_connecting") || "Conectando..."
      : state === "ringing"
      ? t("chat.video_ringing")
      : state === "connected"
      ? formatDuration(callDuration)
      : state === "ended"
      ? t("chat.video_ended")
      : "";

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Remote video (fullscreen) */}
      <div className="flex-1 relative">
        <video
          ref={attachRemoteStream}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Status overlay */}
        {state !== "connected" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <p className="text-white text-lg font-semibold">{otherName}</p>
            <p className="text-white/70 text-sm mt-2 animate-pulse">{statusLabel}</p>
          </div>
        )}

        {/* Connected indicator */}
        {state === "connected" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-4 py-1.5">
            <p className="text-white text-sm font-medium">{statusLabel}</p>
          </div>
        )}

        {/* Local PiP */}
        <div
          className="absolute w-28 h-40 sm:w-32 sm:h-44 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg cursor-move"
          style={{ right: pipPosition.x, bottom: pipPosition.y + 100 }}
          onMouseDown={handlePipDragStart}
          onMouseMove={handlePipDrag}
          onMouseUp={handlePipDragEnd}
          onTouchStart={handlePipDragStart}
          onTouchMove={handlePipDrag}
          onTouchEnd={handlePipDragEnd}
        >
          <video
            ref={attachLocalStream}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {isCameraOff && (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <VideoOff className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-6 py-6 bg-black/80 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className={`h-14 w-14 rounded-full ${isMuted ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white"}`}
          onClick={onToggleMute}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={`h-14 w-14 rounded-full ${isCameraOff ? "bg-red-500/20 text-red-400" : "bg-white/10 text-white"}`}
          onClick={onToggleCamera}
        >
          {isCameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
        </Button>

        <Button
          variant="destructive"
          size="icon"
          className="h-14 w-14 rounded-full bg-red-600 hover:bg-red-700"
          onClick={onEndCall}
        >
          <PhoneOff className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default VideoCallOverlay;
