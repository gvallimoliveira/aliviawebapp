import { useEffect, useRef, useState } from "react";
import { Mic, Square, Pause, Play, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  professionalId: string;
  clinicId?: string | null;
  patientId?: string | null;
  assessmentId?: string | null;
  patientName: string;
  className?: string;
}

const CHUNK_DURATION_SEC = 10 * 60;     // rotate MediaRecorder every 10 min
const MAX_TOTAL_DURATION_SEC = 60 * 60; // hard cap: 1 h per session
const MAX_INLINE_SIZE = 4 * 1024 * 1024; // 4MB → inline base64; bigger goes via storage
const MIN_KEEP_SEC = 20;

type State = "idle" | "recording" | "paused" | "uploading";

export default function VoiceRecorderFAB({
  professionalId, clinicId, patientId, assessmentId, patientName, className,
}: Props) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { toast } = useToast();
  const isPt = language === "pt";

  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<number | null>(null);

  // Multi-chunk session state
  const voiceNoteIdRef = useRef<string | null>(null);
  const chunkIndexRef = useRef(0);
  const chunkSecondsRef = useRef(0);
  const totalSecondsRef = useRef(0);
  const finalStopRef = useRef(true); // true when user pressed stop; false when auto-rotating
  const isRotatingRef = useRef(false);
  const sessionMimeRef = useRef<string>("audio/webm");

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      sessionMimeRef.current = pickMime();

      // reset session refs
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

  const rotateChunk = () => {
    if (!recRef.current || isRotatingRef.current) return;
    if (recRef.current.state === "inactive") return;
    isRotatingRef.current = true;
    finalStopRef.current = false;
    recRef.current.stop(); // onstop will upload + start next chunk
  };

  const stopRecording = () => {
    if (!recRef.current) return;
    finalStopRef.current = true;
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

    // Discard very short single-chunk accidental recordings
    if (wasFinal && idx === 0 && totalAtStop < MIN_KEEP_SEC) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      recRef.current = null;
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

    // If rotating, start the next recorder IMMEDIATELY on the same stream so the user
    // doesn't experience any gap. The chunk upload runs in the background.
    if (!wasFinal && streamRef.current) {
      try {
        newRecorderOnStream(streamRef.current);
      } catch (e) {
        console.error("Failed to start next chunk recorder:", e);
      }
      isRotatingRef.current = false;
      // UI remains in "recording" state — fully invisible to user
    } else {
      // Final stop → tear down stream
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      recRef.current = null;
      stopTick();
      setState("uploading");
    }

    // Upload chunk to backend (fire-and-forget for non-final chunks)
    uploadChunk(blob, idx, wasFinal, chunkDuration, totalAtStop).catch((err) => {
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
      // Reset UI; processing continues in background
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
  ) => {
    if (!user?.id) throw new Error("Not authenticated");

    // For first chunk, create the voice_note row up-front
    if (chunkIndex === 0 && !voiceNoteIdRef.current) {
      const insertRow: any = {
        created_by: user.id,
        professional_id: professionalId,
        clinic_id: clinicId || null,
        patient_id: patientId || null,
        assessment_id: assessmentId || null,
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

    // Update total duration as we accumulate chunks
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

    // Fire-and-forget invoke
    supabase.functions.invoke("transcribe-anamnesis", { body: payload })
      .then(({ error }) => {
        if (error) console.error("transcribe-anamnesis error:", error);
      });

    if (isFinal) {
      toast({
        title: isPt ? "Processando em segundo plano" : "Processing in background",
        description: isPt
          ? `A transcrição aparecerá no prontuário de ${patientName} em breve.`
          : `Transcription will appear in ${patientName}'s record shortly.`,
      });
    }
  };

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className={className ?? "fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[100] flex flex-col items-end gap-2 pointer-events-auto"}>

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
            ? "Grave a entrevista da anamnese (até 1h). A IA transcreve e resume depois — só texto fica salvo."
            : "Record the anamnesis interview (up to 1h). AI transcribes & summarizes after — only text is saved."}
        </div>
      )}

      {state === "idle" && (
        <Button
          onClick={startRecording}
          onMouseEnter={() => setShowHint(true)}
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          aria-label={isPt ? "Iniciar gravação" : "Start recording"}
        >
          <Mic className="h-5 w-5" />
        </Button>
      )}

      {(state === "recording" || state === "paused") && (
        <div className="bg-background border-2 border-primary shadow-xl rounded-2xl p-2 flex items-center gap-2">
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
    </div>
  );
}
