import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
}

const MAX_DURATION_SEC = 30 * 60; // 30 min
const MAX_INLINE_SIZE = 4 * 1024 * 1024; // 4MB → inline base64; bigger goes via storage

type State = "idle" | "recording" | "paused" | "uploading";

export default function VoiceRecorderFAB({
  professionalId, clinicId, patientId, assessmentId, patientName,
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

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startTick = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_DURATION_SEC) {
          stopRecording();
          return s + 1;
        }
        return s + 1;
      });
    }, 1000);
  };

  const stopTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const startRecording = async () => {
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
    stopTick();
    setSeconds(0);
    setState("idle");
  };

  const handleStop = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    chunksRef.current = [];
    setState("uploading");

    try {
      if (!user?.id) throw new Error("Not authenticated");

      // Create voice note row first
      const insertRow: any = {
        created_by: user.id,
        professional_id: professionalId,
        clinic_id: clinicId || null,
        patient_id: patientId || null,
        assessment_id: assessmentId || null,
        status: "processing",
        duration_seconds: seconds,
        language,
      };
      const { data: vn, error: insErr } = await supabase
        .from("assessment_voice_notes")
        .insert(insertRow)
        .select("id")
        .single();
      if (insErr) throw insErr;

      let payload: any = { voice_note_id: vn.id, language, mime_type: blob.type };

      if (blob.size > MAX_INLINE_SIZE) {
        // Upload to storage tmp
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

      // Fire-and-forget invoke; do not await result so user isn't blocked
      supabase.functions.invoke("transcribe-anamnesis", { body: payload })
        .then(({ error }) => {
          if (error) console.error("transcribe-anamnesis error:", error);
        });

      toast({
        title: isPt ? "Processando em segundo plano" : "Processing in background",
        description: isPt
          ? `A transcrição aparecerá no prontuário de ${patientName} em breve.`
          : `Transcription will appear in ${patientName}'s record shortly.`,
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

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[100] flex flex-col items-end gap-2 pointer-events-auto">

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
            ? "Grave a entrevista da anamnese. A IA transcreve e resume depois — só texto fica salvo."
            : "Record the anamnesis interview. AI transcribes & summarizes after — only text is saved."}
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
    </div>,
    document.body
  );
}
