import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Video } from "lucide-react";

interface IncomingCallModalProps {
  open: boolean;
  callerName: string;
  onAccept: () => void;
  onReject: () => void;
}

// Simple ringtone using Web Audio API
const useRingtone = (active: boolean) => {
  const ctxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (ctxRef.current) ctxRef.current.close();
      ctxRef.current = null;
      return;
    }

    const playTone = () => {
      try {
        const ctx = ctxRef.current || new AudioContext();
        ctxRef.current = ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        gain.gain.value = 0.15;
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } catch {
        // silent
      }
    };

    playTone();
    intervalRef.current = setInterval(playTone, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (ctxRef.current) ctxRef.current.close();
      ctxRef.current = null;
    };
  }, [active]);
};

/**
 * Stable fixed overlay — does NOT use Radix Dialog.
 * This avoids the race where Dialog's onOpenChange fires onReject
 * when state transitions away from "ringing".
 * Accept is locked to a single click to prevent double-fires.
 */
const IncomingCallModal = ({ open, callerName, onAccept, onReject }: IncomingCallModalProps) => {
  const { t } = useLanguage();
  const [acting, setActing] = useState(false);
  useRingtone(open);

  if (!open) return null;

  const handleAccept = () => {
    if (acting) return;
    setActing(true);
    console.log("[IncomingCallModal] Accept clicked");
    onAccept();
  };

  const handleReject = () => {
    if (acting) return;
    setActing(true);
    console.log("[IncomingCallModal] Reject clicked");
    onReject();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-background rounded-2xl shadow-2xl border border-border w-full max-w-sm p-6 flex flex-col items-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 animate-pulse">
          <Video className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground text-center">
          {t("chat.video_incoming")}
        </h2>
        <p className="text-base font-medium text-foreground text-center mt-1">
          {callerName}
        </p>

        <div className="flex items-center justify-center gap-8 mt-6">
          <Button
            variant="destructive"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={handleReject}
            disabled={acting}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleAccept}
            disabled={acting}
          >
            <Phone className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
