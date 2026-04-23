import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Video,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Settings,
  RefreshCw,
} from "lucide-react";

interface PreCallScreenProps {
  open: boolean;
  otherName: string;
  onStartCall: (preparedStream?: MediaStream | null) => void;
  onCancel: () => void;
}

type PermStatus = "prompt" | "granted" | "denied" | "checking";

const stopStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop());
};

const PreCallScreen = ({ open, otherName, onStartCall, onCancel }: PreCallScreenProps) => {
  const [cameraStatus, setCameraStatus] = useState<PermStatus>("checking");
  const [micStatus, setMicStatus] = useState<PermStatus>("checking");
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [requesting, setRequesting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handoffRef = useRef(false);

  const attachPreview = useCallback((stream: MediaStream | null) => {
    if (!videoRef.current) return;

    videoRef.current.srcObject = stream;
    if (stream) {
      videoRef.current.onloadedmetadata = () => {
        void videoRef.current?.play().catch(() => {});
      };
    }
  }, []);

  const checkPermissions = useCallback(async () => {
    setCameraStatus("checking");
    setMicStatus("checking");

    if (!navigator.permissions) {
      setCameraStatus("prompt");
      setMicStatus("prompt");
      return;
    }

    try {
      const [cameraResult, micResult] = await Promise.all([
        navigator.permissions.query({ name: "camera" as PermissionName }),
        navigator.permissions.query({ name: "microphone" as PermissionName }),
      ]);

      setCameraStatus(cameraResult.state as PermStatus);
      setMicStatus(micResult.state as PermStatus);

      cameraResult.onchange = () => setCameraStatus(cameraResult.state as PermStatus);
      micResult.onchange = () => setMicStatus(micResult.state as PermStatus);
    } catch {
      setCameraStatus("prompt");
      setMicStatus("prompt");
    }
  }, []);

  useEffect(() => {
    if (open) {
      handoffRef.current = false;
      void checkPermissions();
      return;
    }

    if (previewStream && !handoffRef.current) {
      stopStream(previewStream);
      setPreviewStream(null);
    }
  }, [checkPermissions, open, previewStream]);

  useEffect(() => {
    attachPreview(previewStream);
  }, [attachPreview, previewStream]);

  useEffect(() => {
    return () => {
      if (previewStream && !handoffRef.current) {
        stopStream(previewStream);
      }
    };
  }, [previewStream]);

  const requestPermissions = useCallback(async () => {
    setRequesting(true);
    handoffRef.current = false;

    try {
      stopStream(previewStream);

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setPreviewStream(stream);
      setCameraStatus("granted");
      setMicStatus("granted");
    } catch (error: any) {
      if (error?.name === "NotAllowedError") {
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setPreviewStream(audioOnlyStream);
          setMicStatus("granted");
          setCameraStatus("denied");
        } catch {
          setMicStatus("denied");
          setCameraStatus("denied");
          setPreviewStream(null);
        }
      } else if (error?.name === "NotFoundError" || error?.name === "NotReadableError") {
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setPreviewStream(audioOnlyStream);
          setMicStatus("granted");
          setCameraStatus("denied");
        } catch {
          setMicStatus("denied");
          setCameraStatus("denied");
          setPreviewStream(null);
        }
      }
    } finally {
      setRequesting(false);
    }
  }, [previewStream]);

  const handleStartCall = () => {
    handoffRef.current = Boolean(previewStream);
    const streamToPass = previewStream;
    setPreviewStream(null);
    onStartCall(streamToPass);
  };

  const handleCancel = () => {
    handoffRef.current = false;
    if (previewStream) {
      stopStream(previewStream);
      setPreviewStream(null);
    }
    onCancel();
  };

  const canCall = micStatus === "granted";
  const hasVideoPreview = Boolean(previewStream && previewStream.getVideoTracks().length > 0);
  const anyDenied = cameraStatus === "denied" || micStatus === "denied";
  const shouldRequestPermissions = micStatus !== "granted" && (micStatus === "prompt" || cameraStatus === "prompt");

  const getStatusIcon = (status: PermStatus) => {
    switch (status) {
      case "granted":
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "denied":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "checking":
        return <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />;
      default:
        return <Settings className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: PermStatus, type: "camera" | "mic") => {
    switch (status) {
      case "granted":
        return type === "camera" ? "Câmera pronta" : "Microfone pronto";
      case "denied":
        return type === "camera" ? "Câmera bloqueada" : "Microfone bloqueado";
      case "checking":
        return "Verificando...";
      default:
        return type === "camera" ? "Permitir câmera" : "Permitir microfone";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" onPointerDownOutside={(event) => event.preventDefault()}>
        <div className="relative bg-black aspect-video rounded-t-lg overflow-hidden">
          {hasVideoPreview ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-4 text-center">
              {cameraStatus === "denied" ? (
                <>
                  <CameraOff className="h-12 w-12 text-muted-foreground/60" />
                  <p className="text-muted-foreground text-xs">Câmera indisponível. A chamada seguirá apenas com áudio local.</p>
                </>
              ) : (
                <>
                  <Camera className="h-12 w-12 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-xs">Verifique câmera e microfone antes de iniciar.</p>
                </>
              )}
            </div>
          )}

          <div className="absolute bottom-3 left-3 rounded-full bg-background/15 backdrop-blur-sm px-3 py-1">
            <p className="text-primary-foreground text-xs font-medium">Ligando para {otherName}</p>
          </div>
        </div>

        <div className="px-5 pb-5 pt-4 space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Preparar videochamada
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirme as permissões antes de iniciar para evitar tela preta ou áudio sem conexão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                cameraStatus === "granted"
                  ? "border-primary/20 bg-primary/5"
                  : cameraStatus === "denied"
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-muted/30"
              }`}
            >
              {cameraStatus === "granted" ? (
                <Camera className="h-5 w-5 text-primary" />
              ) : cameraStatus === "denied" ? (
                <CameraOff className="h-5 w-5 text-destructive" />
              ) : (
                <Camera className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{getStatusLabel(cameraStatus, "camera")}</p>
                {cameraStatus === "denied" && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Você ainda poderá entrar na chamada com áudio.</p>
                )}
              </div>
              {getStatusIcon(cameraStatus)}
            </div>

            <div
              className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                micStatus === "granted"
                  ? "border-primary/20 bg-primary/5"
                  : micStatus === "denied"
                    ? "border-destructive/30 bg-destructive/5"
                    : "border-border bg-muted/30"
              }`}
            >
              {micStatus === "granted" ? (
                <Mic className="h-5 w-5 text-primary" />
              ) : micStatus === "denied" ? (
                <MicOff className="h-5 w-5 text-destructive" />
              ) : (
                <Mic className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{getStatusLabel(micStatus, "mic")}</p>
                {micStatus === "denied" && (
                  <p className="mt-0.5 text-[10px] text-destructive font-medium">O microfone é obrigatório para entrar na chamada.</p>
                )}
              </div>
              {getStatusIcon(micStatus)}
            </div>
          </div>

          {anyDenied && (
            <div className="rounded-xl bg-muted/50 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                Como liberar permissões
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[10px] text-muted-foreground">
                <li>Toque no cadeado da barra de endereço</li>
                <li>Abra as configurações do site</li>
                <li>Permita câmera e microfone</li>
                <li>Recarregue a página e tente novamente</li>
              </ol>
              <Button variant="outline" size="sm" className="mt-2 h-8 w-full rounded-lg gap-1.5 text-xs" onClick={() => window.location.reload()}>
                <RefreshCw className="h-3 w-3" />
                Recarregar página
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={handleCancel}>
              Cancelar
            </Button>

            {shouldRequestPermissions ? (
              <Button className="flex-1 rounded-xl gap-2" onClick={requestPermissions} disabled={requesting}>
                {requesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Permitir acesso
              </Button>
            ) : (
              <Button className="flex-1 rounded-xl gap-2" onClick={handleStartCall} disabled={!canCall}>
                <Phone className="h-4 w-4" />
                {canCall ? "Iniciar chamada" : "Microfone necessário"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreCallScreen;
