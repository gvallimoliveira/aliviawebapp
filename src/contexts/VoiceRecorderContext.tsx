/**
 * Global voice recorder state.
 *
 * Lifted out of the ManualAssessmentModal so that the FAB and its
 * MediaRecorder survive:
 *  - step navigation inside the modal
 *  - the modal closing accidentally
 *  - any parent re-render
 *
 * The FAB UI itself is mounted once at App root via <GlobalVoiceRecorderFAB />
 * and reads from this context. Consumer screens call `attach(session)` when
 * they want the FAB to be visible/active and `detach()` when they leave.
 */
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Mic, Square, Pause, Play, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

const MAX_DURATION_SEC = 30 * 60; // 30 min
const MAX_INLINE_SIZE = 4 * 1024 * 1024;

type State = "idle" | "recording" | "paused" | "uploading";

export interface VoiceRecorderSession {
  professionalId: string;
  clinicId?: string | null;
  patientId?: string | null;
  assessmentId?: string | null;
  patientName: string;
}

interface Ctx {
  session: VoiceRecorderSession | null;
  attach: (s: VoiceRecorderSession) => void;
  detach: () => void;
}

const VoiceRecorderContext = createContext<Ctx | null>(null);

export const useVoiceRecorder = () => {
  const v = useContext(VoiceRecorderContext);
  if (!v) throw new Error("useVoiceRecorder must be used within VoiceRecorderProvider");
  return v;
};

/**
 * Hook for screens: attaches a session while mounted/open and detaches on unmount.
 */
export const useVoiceRecorderSession = (active: boolean, session: VoiceRecorderSession | null) => {
  const { attach, detach } = useVoiceRecorder();
  useEffect(() => {
    if (!active || !session) return;
    attach(session);
    return () => detach();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, session?.professionalId, session?.clinicId, session?.patientId, session?.assessmentId, session?.patientName]);
};

export const VoiceRecorderProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<VoiceRecorderSession | null>(null);

  const attach = useCallback((s: VoiceRecorderSession) => setSession(s), []);
  const detach = useCallback(() => setSession(null), []);

  const value = useMemo(() => ({ session, attach, detach }), [session, attach, detach]);

  return (
    <VoiceRecorderContext.Provider value={value}>
      {children}
      <GlobalVoiceRecorderFAB />
    </VoiceRecorderContext.Provider>
  );
};

const GlobalVoiceRecorderFAB = () => {
  const { session } = useVoiceRecorder();
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isPt = language === "pt";

  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const [showHint, setShowHint] = useState(false);

  // Drag-to-reposition. `pos` is the bottom-right offset in px.
  // Defaults match the previous static placement.
  const [pos, setPos] = useState<{ right: number; bottom: number }>(() => ({
    right: 16,
    bottom: typeof window !== "undefined" && window.innerWidth >= 640 ? 24 : 80,
  }));
  const dragRef = useRef<{ startX: number; startY: number; startRight: number; startBottom: number; moved: boolean; pointerId: number; captured: boolean } | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);
  // Authoritative elapsed-seconds counter. We can't rely on the `seconds`
  // state inside handleStop because handleStop is assigned as mr.onstop at
  // recording start and closes over a stale value (0) — that's why valid
  // recordings were being reported as "0s" and discarded.
  const secondsRef = useRef(0);
  // Snapshot of session at recording start — so the upload still has correct
  // patient/professional context even if the user navigates away mid-record.
  const sessionRef = useRef<VoiceRecorderSession | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      secondsRef.current += 1;
      const next = secondsRef.current;
      setSeconds(next);
      if (next >= MAX_DURATION_SEC) stopRecording();
    }, 1000);
  };

  const stopTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const startRecording = async () => {
    if (!session) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = handleStop;
      recRef.current = mr;
      sessionRef.current = session;
      secondsRef.current = 0;
      mr.start(1000);
      setState("recording");
      setSeconds(0);
      startTick();
      toast({
        title: isPt ? "Gravação iniciada" : "Recording started",
        description: isPt
          ? "O áudio será descartado após processamento. Apenas transcrição e resumo serão salvos."
          : "Audio will be discarded after processing. Only transcription and summary will be saved.",
      });
    } catch (err: any) {
      toast({
        title: isPt ? "Microfone bloqueado" : "Microphone blocked",
        description: err?.message || (isPt ? "Permita acesso ao microfone." : "Allow microphone access."),
        variant: "destructive",
      });
    }
  };

  const pauseResume = () => {
    if (!recRef.current) return;
    if (state === "recording") {
      recRef.current.pause();
      setState("paused");
      stopTick();
    } else if (state === "paused") {
      recRef.current.resume();
      setState("recording");
      startTick();
    }
  };

  const stopRecording = () => {
    if (!recRef.current) return;
    if (recRef.current.state !== "inactive") recRef.current.stop();
    stopTick();
  };

  const cancelRecording = () => {
    chunksRef.current = [];
    if (recRef.current && recRef.current.state !== "inactive") {
      recRef.current.onstop = null;
      recRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recRef.current = null;
    sessionRef.current = null;
    stopTick();
    secondsRef.current = 0;
    setSeconds(0);
    setState("idle");
  };

  const handleStop = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    chunksRef.current = [];
    const snap = sessionRef.current;
    // IMPORTANT: read from ref, not from `seconds` state — handleStop was
    // assigned as mr.onstop at start and its closure has stale state.
    const recordedSeconds = secondsRef.current;
    sessionRef.current = null;
    secondsRef.current = 0;

    // Discard recordings shorter than 20s — likely accidental and too short for useful clinical data.
    if (recordedSeconds < 20) {
      toast({
        title: isPt ? "Gravação descartada" : "Recording discarded",
        description: isPt
          ? `Gravações com menos de 20s são ignoradas (esta teve ${recordedSeconds}s). Inicie uma nova gravação mais longa.`
          : `Recordings under 20s are discarded (this one was ${recordedSeconds}s). Start a longer recording.`,
      });
      setSeconds(0);
      setState("idle");
      return;
    }

    setState("uploading");

    try {
      if (!user?.id) throw new Error("Not authenticated");
      if (!snap) throw new Error("No session");


      const insertRow: any = {
        created_by: user.id,
        professional_id: snap.professionalId,
        clinic_id: snap.clinicId || null,
        patient_id: snap.patientId || null,
        assessment_id: snap.assessmentId || null,
        status: "processing",
        duration_seconds: recordedSeconds,
        language,
      };
      const { data: vn, error: insErr } = await supabase
        .from("assessment_voice_notes")
        .insert(insertRow)
        .select("id")
        .single();
      if (insErr) throw insErr;

      const payload: any = { voice_note_id: vn.id, language, mime_type: blob.type };

      if (blob.size > MAX_INLINE_SIZE) {
        const path = `${user.id}/${vn.id}.webm`;
        const { error: upErr } = await supabase.storage
          .from("voice-notes-tmp")
          .upload(path, blob, { contentType: blob.type, upsert: true });
        if (upErr) throw upErr;
        payload.storage_path = path;
      } else {
        const arr = new Uint8Array(await blob.arrayBuffer());
        let bin = "";
        const CHUNK = 0x8000;
        for (let i = 0; i < arr.length; i += CHUNK) {
          bin += String.fromCharCode.apply(null, Array.from(arr.subarray(i, i + CHUNK)));
        }
        payload.audio_base64 = btoa(bin);
      }

      supabase.functions.invoke("transcribe-anamnesis", { body: payload })
        .then(({ error }) => {
          if (error) console.error("transcribe-anamnesis error:", error);
        });

      toast({
        title: isPt ? "Processando em segundo plano" : "Processing in background",
        description: isPt
          ? `A transcrição aparecerá no prontuário de ${snap.patientName} em breve.`
          : `Transcription will appear in ${snap.patientName}'s record shortly.`,
      });

      setSeconds(0);
      setState("idle");
    } catch (err: any) {
      console.error("Voice note upload error:", err);
      toast({
        title: isPt ? "Erro ao enviar áudio" : "Upload error",
        description: err?.message || "",
        variant: "destructive",
      });
      setState("idle");
      setSeconds(0);
    }
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Show the FAB whenever a session is attached OR a recording/upload is in
  // flight (so the user can still see/stop it even if the modal closed).
  const visible = !!session || state !== "idle";
  if (!visible) return null;
  if (typeof document === "undefined") return null;

  const onDragPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Only drag with the dedicated handle (so internal buttons still get clicks).
    if (!(e.target as HTMLElement).closest("[data-voice-drag-handle]")) return;
    // IMPORTANT: do NOT call setPointerCapture here. On desktop, capturing the
    // pointer on the wrapper redirects pointerup/click away from the inner
    // <Button>, so onClick never fires and the recording can't start. We only
    // capture the pointer after the user actually starts dragging (threshold
    // crossed in onPointerMove).
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRight: pos.right,
      startBottom: pos.bottom,
      moved: false,
      pointerId: e.pointerId,
      captured: false,
    };
  };
  const onDragPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 4) {
      d.moved = true;
    }
    if (!d.moved) return;
    if (!d.captured) {
      try { (e.currentTarget as HTMLElement).setPointerCapture?.(d.pointerId); } catch {}
      d.captured = true;
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const nextRight = Math.max(8, Math.min(vw - 80, d.startRight - dx));
    const nextBottom = Math.max(8, Math.min(vh - 80, d.startBottom - dy));
    setPos({ right: nextRight, bottom: nextBottom });
  };
  const onDragPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (d?.captured) {
      try { (e.currentTarget as HTMLElement).releasePointerCapture?.(d.pointerId); } catch {}
    }
    dragRef.current = null;
  };

  return createPortal(
    <div
      data-voice-recorder-fab=""
      onPointerDown={onDragPointerDown}
      onPointerMove={onDragPointerMove}
      onPointerUp={onDragPointerUp}
      onPointerCancel={onDragPointerUp}
      style={{ right: pos.right, bottom: pos.bottom }}
      className="fixed z-[200] flex flex-col items-end gap-2 pointer-events-auto"
    >
      {showHint && state === "idle" && (
        <div className="bg-background border border-border shadow-lg rounded-xl px-3 py-2 text-xs max-w-[220px] relative">
          <button
            onClick={() => setShowHint(false)}
            className="absolute -top-1 -right-1 bg-muted rounded-full p-0.5"
            aria-label="close"
          >
            <X className="h-3 w-3" />
          </button>
          {isPt
            ? "Grave a anamnese. Arraste pela borda para reposicionar."
            : "Record the anamnesis. Drag the edge to reposition."}
        </div>
      )}

      {state === "idle" && (
        <div
          data-voice-drag-handle=""
          className="relative h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
        >
          <Button
            onClick={(e) => { if (!dragRef.current?.moved) startRecording(); e.stopPropagation(); }}
            onMouseEnter={() => setShowHint(true)}
            size="icon"
            className="h-10 w-10 rounded-full bg-transparent hover:bg-white/10 text-primary-foreground"
            aria-label={isPt ? "Iniciar gravação" : "Start recording"}
          >
            <Mic className="h-5 w-5" />
          </Button>
        </div>
      )}

      {(state === "recording" || state === "paused") && (
        <div
          data-voice-drag-handle=""
          className="bg-background border-2 border-primary shadow-xl rounded-2xl p-2 flex items-center gap-2 touch-none cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-1.5 px-2">
            <span className={`h-2 w-2 rounded-full ${state === "recording" ? "bg-red-500 animate-pulse" : "bg-amber-500"}`} />
            <span className="text-xs font-mono tabular-nums">{fmt(seconds)}</span>
          </div>
          <Button onClick={pauseResume} size="icon" variant="ghost" className="h-8 w-8 rounded-full" aria-label={state === "recording" ? "pause" : "resume"}>
            {state === "recording" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button onClick={stopRecording} size="icon" className="h-8 w-8 rounded-full bg-red-500 hover:bg-red-600" aria-label="stop">
            <Square className="h-3.5 w-3.5 fill-white" />
          </Button>
          <Button onClick={cancelRecording} size="icon" variant="ghost" className="h-8 w-8 rounded-full" aria-label="cancel">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {state === "uploading" && (
        <div className="bg-background border border-border shadow-lg rounded-full px-3 py-2 flex items-center gap-2 text-xs">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {isPt ? "Enviando..." : "Uploading..."}
        </div>
      )}
    </div>,
    document.body,
  );
};
