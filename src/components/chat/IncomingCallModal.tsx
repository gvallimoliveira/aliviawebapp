import { useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

const IncomingCallModal = ({ open, callerName, onAccept, onReject }: IncomingCallModalProps) => {
  const { t } = useLanguage();
  useRingtone(open);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onReject()}>
      <DialogContent className="sm:max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader className="items-center">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 animate-pulse">
            <Video className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-center">{t("chat.video_incoming")}</DialogTitle>
          <DialogDescription className="text-center text-base font-medium">
            {callerName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-8 mt-4">
          <Button
            variant="destructive"
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={onReject}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-700 text-white"
            onClick={onAccept}
          >
            <Phone className="h-6 w-6" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallModal;
