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

const CHUNK_DURATION_SEC = 3 * 60;      // rotate every 3 min — keep transcript flowing into the chart
const MAX_TOTAL_DURATION_SEC = 60 * 60; // hard cap: 1h
// Áudio acima de 1 MB vai por arquivo temporário. Enviar base64 grande no corpo
// da chamada era a causa de "Failed to send a request to the Edge Function".
const MAX_INLINE_SIZE = 1 * 1024 * 1024;
const MIN_KEEP_SEC = 20;

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

  // Drag-to-reposition. `pos` is the top-right offset in px.
  // Default: near the top-right corner of the manual assessment modal,
  // just below the modal close button so it doesn't overlap.
  const [pos, setPos] = useState<{ right: number; top: number }>(() => ({
    right: 24,
    top: 72,
  }));
  const autoPositionedRef = useRef(false);
  const dragRef = useRef<{ startX: number; startY: number; startRight: number; startTop: number; moved: boolean; pointerId: number; captured: boolean } | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);

  // Multi-chunk session state — every 10 min we rotate the MediaRecorder and
  // upload the chunk so partial recordings survive crashes, navigation, or
  // closing the modal without finalising the assessment.
  const voiceNoteIdRef = useRef<string | null>(null);
  const chunkIndexRef = useRef(0);
  const chunkSecondsRef = useRef(0);
  const totalSecondsRef = useRef(0);
  const finalStopRef = useRef(true);
  const isRotatingRef = useRef(false);
  const sessionMimeRef = useRef<string>("audio/webm");
  const sessionRef = useRef<VoiceRecorderSession | null>(null);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // When a manual-assessment session starts, snap the FAB inside the modal
  // (top-right, below the close button) so it isn't left floating in the
  // dark overlay margin.
  useEffect(() => {
    if (!session) {
      autoPositionedRef.current = false;
      return;
    }
    if (autoPositionedRef.current) return;
    const dialog = document.querySelector(
      "[data-manual-assessment-modal]"
    ) as HTMLElement | null;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    setPos({
      right: Math.max(24, window.innerWidth - rect.right + 24),
      top: Math.max(24, rect.top + 64),
    });
    autoPositionedRef.current = true;
  }, [session]);

  const startTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      chunkSecondsRef.current += 1;
      totalSecondsRef.current += 1;
      setSeconds(totalSecondsRef.current);
      if (totalSecondsRef.current >= MAX_TOTAL_DURATION_SEC) {
        stopRecording();
        return;
      }
      if (chunkSecondsRef.current >= CHUNK_DURATION_SEC) {
        rotateChunk();
      }
    }, 1000);
  };

  const stopTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const pickMime = (): string => {
    if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    return "";
  };

  const newRecorderOnStream = (stream: MediaStream) => {
    const mime = sessionMimeRef.current;
    const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = handleStop;
    recRef.current = mr;
    mr.start(1000);
  };

  const startRecording = async () => {
    if (!session) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      sessionMimeRef.current = pickMime();
      sessionRef.current = session;

      voiceNoteIdRef.current = null;
      chunkIndexRef.current = 0;
      chunkSecondsRef.current = 0;
      totalSecondsRef.current = 0;
      finalStopRef.current = true;
      isRotatingRef.current = false;
      setSeconds(0);

      newRecorderOnStream(stream);
      setState("recording");
      startTick();
      toast({
        title: isPt ? "Gravação iniciada" : "Recording started",
        description: isPt
          ? "A cada 10 min a transcrição é salva no prontuário, mesmo se a avaliação não for finalizada."
          : "Every 10 min the transcript is saved to the chart, even if the assessment isn't finalised.",
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

  const rotateChunk = () => {
    if (!recRef.current || isRotatingRef.current) return;
    if (recRef.current.state === "inactive") return;
    isRotatingRef.current = true;
    finalStopRef.current = false;
    recRef.current.stop();
  };

  const stopRecording = () => {
    if (!recRef.current) return;
    finalStopRef.current = true;
    if (recRef.current.state !== "inactive") recRef.current.stop();
    stopTick();
  };

  // Auto-finalize when the host screen (e.g. ManualAssessmentModal) detaches
  // mid-recording. This ensures any partial audio captured so far is uploaded,
  // transcribed and saved to the chart — instead of waiting for the user to
  // press Stop or for the next 3-min rotation.
  const prevSessionRef = useRef<VoiceRecorderSession | null>(null);
  useEffect(() => {
    const hadSession = !!prevSessionRef.current;
    const hasSession = !!session;
    prevSessionRef.current = session;
    if (hadSession && !hasSession && (state === "recording" || state === "paused")) {
      try {
        if (recRef.current?.state === "paused") {
          recRef.current.resume();
        }
      } catch {}
      finalStopRef.current = true;
      if (recRef.current && recRef.current.state !== "inactive") {
        recRef.current.stop();
      }
      stopTick();
      toast({
        title: isPt ? "Gravação finalizada" : "Recording finalized",
        description: isPt
          ? "Avaliação encerrada — processando transcrição parcial e enviando ao prontuário."
          : "Assessment closed — processing partial transcript and saving to chart.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);



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
    setSeconds(0);
    voiceNoteIdRef.current = null;
    chunkIndexRef.current = 0;
    chunkSecondsRef.current = 0;
    totalSecondsRef.current = 0;
    isRotatingRef.current = false;
    setState("idle");
  };

  const handleStop = async () => {
    const wasFinal = finalStopRef.current;
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    chunksRef.current = [];

    const idx = chunkIndexRef.current;
    chunkIndexRef.current += 1;
    const chunkDuration = chunkSecondsRef.current;
    chunkSecondsRef.current = 0;
    const totalAtStop = totalSecondsRef.current;
    const snap = sessionRef.current;

    // Discard accidental short single recordings
    if (wasFinal && idx === 0 && totalAtStop < MIN_KEEP_SEC) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      recRef.current = null;
      sessionRef.current = null;
      toast({
        title: isPt ? "Gravação descartada" : "Recording discarded",
        description: isPt
          ? `Gravações com menos de ${MIN_KEEP_SEC}s são ignoradas (esta teve ${totalAtStop}s).`
          : `Recordings under ${MIN_KEEP_SEC}s are discarded (this one was ${totalAtStop}s).`,
      });
      setSeconds(0);
      setState("idle");
      return;
    }

    // If we're just rotating, restart a new recorder on the same stream so
    // there's no audible gap, and upload this chunk in the background.
    if (!wasFinal && streamRef.current) {
      try {
        newRecorderOnStream(streamRef.current);
      } catch (e) {
        console.error("Failed to start next chunk recorder:", e);
      }
      isRotatingRef.current = false;
    } else {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      recRef.current = null;
      sessionRef.current = null;
      stopTick();
      setState("uploading");
    }

    uploadChunk(blob, idx, wasFinal, chunkDuration, totalAtStop, snap).catch((err) => {
      console.error(`Chunk ${idx} upload error:`, err);
      if (wasFinal) {
        toast({
          title: isPt ? "Erro ao enviar áudio" : "Upload error",
          description: err?.message || "",
          variant: "destructive",
        });
        setState("idle");
        setSeconds(0);
      }
    });

    if (wasFinal) {
      setSeconds(0);
      voiceNoteIdRef.current = null;
      chunkIndexRef.current = 0;
      totalSecondsRef.current = 0;
      setState("idle");
    }
  };

  const uploadChunk = async (
    blob: Blob,
    chunkIndex: number,
    isFinal: boolean,
    chunkDuration: number,
    totalDuration: number,
    snap: VoiceRecorderSession | null,
  ) => {
    if (!user?.id) throw new Error("Not authenticated");
    if (!snap) throw new Error("No session");

    if (chunkIndex === 0 && !voiceNoteIdRef.current) {
      const insertRow: any = {
        created_by: user.id,
        professional_id: snap.professionalId,
        clinic_id: snap.clinicId || null,
        patient_id: snap.patientId || null,
        assessment_id: snap.assessmentId || null,
        patient_name: snap.patientName || null,
        status: "processing",
        duration_seconds: totalDuration,
        language,
      };
      const { data: vn, error: insErr } = await supabase
        .from("assessment_voice_notes")
        .insert(insertRow)
        .select("id")
        .single();
      if (insErr) throw insErr;
      voiceNoteIdRef.current = vn.id;
    }

    const voiceNoteId = voiceNoteIdRef.current;
    if (!voiceNoteId) throw new Error("voice_note_id missing");

    if (chunkIndex > 0) {
      await supabase
        .from("assessment_voice_notes")
        .update({ duration_seconds: totalDuration })
        .eq("id", voiceNoteId)
        .then(() => {}, () => {});
    }

    const payload: any = {
      voice_note_id: voiceNoteId,
      language,
      mime_type: blob.type || sessionMimeRef.current,
      chunk_index: chunkIndex,
      is_final: isFinal,
      chunk_duration_seconds: chunkDuration,
    };

    if (blob.size > MAX_INLINE_SIZE) {
      const path = `${user.id}/${voiceNoteId}/${chunkIndex}.webm`;
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

    // Envio com até 3 tentativas: falhas de rede/tamanho não devem apagar o
    // que já foi transcrito nos trechos anteriores.
    (async () => {
      let lastError: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error } = await supabase.functions.invoke("transcribe-anamnesis", { body: payload });
        if (!error) return;
        lastError = error;
        console.error(`transcribe-anamnesis error (tentativa ${attempt + 1}):`, error);
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }

      if (!isFinal) return;

      // Trecho final não processou. Se já existe transcrição parcial, nunca
      // marcamos como falha: pedimos só o resumo do que foi transcrito.
      const { data: existing } = await supabase
        .from("assessment_voice_notes")
        .select("transcript")
        .eq("id", voiceNoteId)
        .maybeSingle();
      const partial = (existing?.transcript || "").trim();

      if (partial) {
        const { error: sumErr } = await supabase.functions.invoke("transcribe-anamnesis", {
          body: { voice_note_id: voiceNoteId, language, summary_only: true },
        });
        if (!sumErr) return;
        await supabase
          .from("assessment_voice_notes")
          .update({ status: "ready", error: null })
          .eq("id", voiceNoteId)
          .eq("status", "processing");
        return;
      }

      await supabase
        .from("assessment_voice_notes")
        .update({
          status: "failed",
          error: ((lastError as any)?.message || "Audio processing failed") +
            (isPt ? " Tente refazer em trechos menores." : " Please retry in shorter chunks."),
        })
        .eq("id", voiceNoteId)
        .eq("status", "processing");
    })();

    if (isFinal) {
      toast({
        title: isPt ? "Processando em segundo plano" : "Processing in background",
        description: isPt
          ? `A transcrição aparecerá no prontuário de ${snap.patientName} em breve.`
          : `Transcription will appear in ${snap.patientName}'s record shortly.`,
      });
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
      startTop: pos.top,
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
    const nextTop = Math.max(8, Math.min(vh - 80, d.startTop + dy));
    setPos({ right: nextRight, top: nextTop });
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
      style={{ right: pos.right, top: pos.top }}
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
