import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Ditado por voz em trechos curtos.
 *
 * Captura PCM pelo Web Audio (não MediaRecorder com timeslice, que gera
 * fragmentos sem cabeçalho e MP4 fragmentado no iOS), fecha um WAV completo
 * de ~6s — de preferência numa pausa da fala — e envia para transcrição.
 * O texto de cada trecho é anexado na ordem correta, então aparece no campo
 * enquanto o profissional fala. O áudio é descartado após o envio.
 */

export type DictationState = "idle" | "recording" | "paused";

const TARGET_RATE = 16000;
const SEGMENT_SEC = 6;          // duração alvo de cada trecho
const MAX_SEGMENT_SEC = 10;     // corte forçado se a fala não pausar
const SILENCE_RMS = 0.012;      // limiar de pausa
const SILENCE_HOLD_SEC = 0.35;  // pausa mínima para cortar
const MIN_SEGMENT_SEC = 1.2;    // trechos menores que isso não são enviados sozinhos
const MAX_TOTAL_SEC = 30 * 60;

function downsample(input: Float32Array, from: number, to: number): Float32Array {
  if (to >= from) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function encodeWav(chunks: Float32Array[], sampleRate: number): Blob {
  const length = chunks.reduce((acc, c) => acc + c.length, 0);
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, length * 2, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, chunk[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  }
  return new Blob([buffer], { type: "audio/wav" });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(bin);
}

/** Une o texto ditado ao que já existe no campo, sem apagar nada. */
export function appendDictated(current: string, addition: string): string {
  const add = addition.trim();
  if (!add) return current;
  const base = current.replace(/\s+$/, "");
  if (!base) return add;
  const needsPeriod = /[a-zà-ú0-9)]$/i.test(base);
  return `${base}${needsPeriod ? "." : ""} ${add}`;
}

interface Options {
  language?: string;
  onText: (text: string) => void;
  onError?: (message: string) => void;
}

export function useDictation({ language, onText, onError }: Options) {
  const [state, setState] = useState<DictationState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [pending, setPending] = useState(0);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const bufferRef = useRef<Float32Array[]>([]);
  const bufferSamplesRef = useRef(0);
  const silenceSamplesRef = useRef(0);
  const pausedRef = useRef(false);
  const tickRef = useRef<number | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const onTextRef = useRef(onText);
  const onErrorRef = useRef(onError);
  onTextRef.current = onText;
  onErrorRef.current = onError;

  const sendSegment = useCallback((chunks: Float32Array[], samples: number) => {
    if (samples < MIN_SEGMENT_SEC * TARGET_RATE) return;
    const blob = encodeWav(chunks, TARGET_RATE);
    setPending((p) => p + 1);
    // Fila serial: garante que os textos entrem na ordem em que foram falados.
    queueRef.current = queueRef.current.then(async () => {
      try {
        const audio_base64 = await blobToBase64(blob);
        const { data, error } = await supabase.functions.invoke("transcribe-session-note", {
          body: { audio_base64, mime_type: "audio/wav", language },
        });
        if (error) throw error;
        const text = (data?.text || "").trim();
        if (text) onTextRef.current(text);
      } catch (err: any) {
        onErrorRef.current?.(err?.message || "Não foi possível transcrever este trecho.");
      } finally {
        setPending((p) => Math.max(0, p - 1));
      }
    });
  }, [language]);

  const flush = useCallback((force: boolean) => {
    const chunks = bufferRef.current;
    const samples = bufferSamplesRef.current;
    bufferRef.current = [];
    bufferSamplesRef.current = 0;
    silenceSamplesRef.current = 0;
    if (samples === 0) return;
    if (!force && samples < MIN_SEGMENT_SEC * TARGET_RATE) return;
    sendSegment(chunks, samples);
  }, [sendSegment]);

  const teardown = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    try { nodeRef.current?.disconnect(); } catch { /* noop */ }
    try { sourceRef.current?.disconnect(); } catch { /* noop */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close().catch(() => {});
    nodeRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    ctxRef.current = null;
  }, []);

  useEffect(() => () => teardown(), [teardown]);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const Ctx: typeof AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const node = ctx.createScriptProcessor(4096, 1, 1);
      nodeRef.current = node;

      bufferRef.current = [];
      bufferSamplesRef.current = 0;
      silenceSamplesRef.current = 0;
      pausedRef.current = false;
      setSeconds(0);

      node.onaudioprocess = (e) => {
        if (pausedRef.current) return;
        const raw = e.inputBuffer.getChannelData(0);
        const chunk = downsample(new Float32Array(raw), ctx.sampleRate, TARGET_RATE);
        bufferRef.current.push(chunk);
        bufferSamplesRef.current += chunk.length;

        let sum = 0;
        for (let i = 0; i < chunk.length; i++) sum += chunk[i] * chunk[i];
        const rms = Math.sqrt(sum / Math.max(1, chunk.length));
        silenceSamplesRef.current = rms < SILENCE_RMS ? silenceSamplesRef.current + chunk.length : 0;

        const secs = bufferSamplesRef.current / TARGET_RATE;
        const quiet = silenceSamplesRef.current >= SILENCE_HOLD_SEC * TARGET_RATE;
        if ((secs >= SEGMENT_SEC && quiet) || secs >= MAX_SEGMENT_SEC) {
          flush(false);
        }
      };

      source.connect(node);
      node.connect(ctx.destination);
      setState("recording");
      tickRef.current = window.setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= MAX_TOTAL_SEC) { flush(true); teardown(); setState("idle"); return 0; }
          return next;
        });
      }, 1000);
    } catch (err: any) {
      teardown();
      onErrorRef.current?.(err?.message || "Permita o acesso ao microfone para ditar.");
    }
  }, [state, flush, teardown]);

  const pause = useCallback(() => {
    if (state !== "recording") return;
    pausedRef.current = true;
    flush(true);
    setState("paused");
  }, [state, flush]);

  const resume = useCallback(() => {
    if (state !== "paused") return;
    pausedRef.current = false;
    setState("recording");
  }, [state]);

  const stop = useCallback(() => {
    if (state === "idle") return;
    pausedRef.current = true;
    flush(true);
    teardown();
    setSeconds(0);
    setState("idle");
  }, [state, flush, teardown]);

  const cancel = useCallback(() => {
    pausedRef.current = true;
    bufferRef.current = [];
    bufferSamplesRef.current = 0;
    teardown();
    setSeconds(0);
    setState("idle");
  }, [teardown]);

  return { state, seconds, pending, start, pause, resume, stop, cancel };
}
