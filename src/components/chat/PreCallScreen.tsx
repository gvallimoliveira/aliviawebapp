import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Camera, CameraOff, Mic, MicOff, Video, Phone, AlertTriangle, CheckCircle2, Settings, RefreshCw } from "lucide-react";

interface PreCallScreenProps {
  open: boolean;
  otherName: string;
  onStartCall: () => void;
  onCancel: () => void;
}

type PermStatus = "prompt" | "granted" | "denied" | "checking";

const PreCallScreen = ({ open, otherName, onStartCall, onCancel }: PreCallScreenProps) => {
  const { t } = useLanguage();
  const [cameraStatus, setCameraStatus] = useState<PermStatus>("checking");
  const [micStatus, setMicStatus] = useState<PermStatus>("checking");
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [requesting, setRequesting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Check current permission status
  const checkPermissions = useCallback(async () => {
    setCameraStatus("checking");
    setMicStatus("checking");

    if (!navigator.permissions) {
      setCameraStatus("prompt");
      setMicStatus("prompt");
      return;
    }

    try {
      const [camResult, micResult] = await Promise.all([
        navigator.permissions.query({ name: "camera" as PermissionName }),
        navigator.permissions.query({ name: "microphone" as PermissionName }),
      ]);
      setCameraStatus(camResult.state as PermStatus);
      setMicStatus(micResult.state as PermStatus);

      // Listen for changes
      camResult.onchange = () => setCameraStatus(camResult.state as PermStatus);
      micResult.onchange = () => setMicStatus(micResult.state as PermStatus);
    } catch {
      setCameraStatus("prompt");
      setMicStatus("prompt");
    }
  }, []);

  useEffect(() => {
    if (open) {
      checkPermissions();
    }
    return () => {
      // Cleanup preview stream when dialog closes
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
        setPreviewStream(null);
      }
    };
  }, [open, checkPermissions]);

  // Stop preview when dialog closes
  useEffect(() => {
    if (!open && previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
      setPreviewStream(null);
    }
  }, [open, previewStream]);

  const requestPermissions = useCallback(async () => {
    setRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setPreviewStream(stream);
      setCameraStatus("granted");
      setMicStatus("granted");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        // Check which one was denied
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicStatus("granted");
          audioStream.getTracks().forEach((t) => t.stop());
          setCameraStatus("denied");
        } catch {
          setMicStatus("denied");
          setCameraStatus("denied");
        }
      } else if (err.name === "NotFoundError") {
        setCameraStatus("denied");
        // Try audio only
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          setMicStatus("granted");
          setPreviewStream(audioStream);
        } catch {
          setMicStatus("denied");
        }
      }
    } finally {
      setRequesting(false);
    }
  }, []);

  // Attach preview stream to video element
  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  const handleStartCall = () => {
    // Stop preview stream before starting real call
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
      setPreviewStream(null);
    }
    onStartCall();
  };

  const handleCancel = () => {
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
      setPreviewStream(null);
    }
    onCancel();
  };

  const canCall = micStatus === "granted"; // Camera optional, mic required
  const allGranted = cameraStatus === "granted" && micStatus === "granted";
  const anyDenied = cameraStatus === "denied" || micStatus === "denied";
  const needsRequest = cameraStatus === "prompt" || micStatus === "prompt";

  const getStatusIcon = (status: PermStatus) => {
    switch (status) {
      case "granted":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
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
      <DialogContent className="sm:max-w-md p-0 overflow-hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        {/* Video preview area */}
        <div className="relative bg-black aspect-video rounded-t-lg overflow-hidden">
          {previewStream && previewStream.getVideoTracks().length > 0 ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: "scaleX(-1)" }}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3">
              {cameraStatus === "denied" ? (
                <>
                  <CameraOff className="h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground/70 text-xs text-center px-4">
                    Câmera bloqueada
                  </p>
                </>
              ) : (
                <>
                  <Camera className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground/50 text-xs">
                    Pré-visualização da câmera
                  </p>
                </>
              )}
            </div>
          )}

          {/* Name overlay */}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
            <p className="text-white text-xs font-medium">
              Ligando para {otherName}
            </p>
          </div>
        </div>

        <div className="px-5 pb-5 pt-4 space-y-4">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Preparar videochamada
            </DialogTitle>
            <DialogDescription className="text-xs">
              Verifique câmera e microfone antes de iniciar.
            </DialogDescription>
          </DialogHeader>

          {/* Permission status cards */}
          <div className="space-y-2">
            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              cameraStatus === "granted" 
                ? "border-green-500/30 bg-green-500/5" 
                : cameraStatus === "denied" 
                ? "border-destructive/30 bg-destructive/5" 
                : "border-border bg-muted/30"
            }`}>
              {cameraStatus === "granted" ? (
                <Camera className="h-5 w-5 text-green-500" />
              ) : cameraStatus === "denied" ? (
                <CameraOff className="h-5 w-5 text-destructive" />
              ) : (
                <Camera className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{getStatusLabel(cameraStatus, "camera")}</p>
                {cameraStatus === "denied" && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    A chamada continuará apenas com áudio
                  </p>
                )}
              </div>
              {getStatusIcon(cameraStatus)}
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
              micStatus === "granted" 
                ? "border-green-500/30 bg-green-500/5" 
                : micStatus === "denied" 
                ? "border-destructive/30 bg-destructive/5" 
                : "border-border bg-muted/30"
            }`}>
              {micStatus === "granted" ? (
                <Mic className="h-5 w-5 text-green-500" />
              ) : micStatus === "denied" ? (
                <MicOff className="h-5 w-5 text-destructive" />
              ) : (
                <Mic className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{getStatusLabel(micStatus, "mic")}</p>
                {micStatus === "denied" && (
                  <p className="text-[10px] text-destructive mt-0.5 font-medium">
                    Microfone é obrigatório para a chamada
                  </p>
                )}
              </div>
              {getStatusIcon(micStatus)}
            </div>
          </div>

          {/* Denied instructions */}
          {anyDenied && (
            <div className="bg-muted/50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                Como liberar permissões
              </p>
              <ol className="text-[10px] text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Toque no ícone de <strong>cadeado</strong> (🔒) na barra de endereço</li>
                <li>Selecione <strong>"Configurações do site"</strong></li>
                <li>Altere <strong>Câmera</strong> e <strong>Microfone</strong> para "Permitir"</li>
                <li>Recarregue a página e tente novamente</li>
              </ol>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 h-8 text-xs rounded-lg gap-1.5"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-3 w-3" />
                Recarregar página
              </Button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={handleCancel}
            >
              Cancelar
            </Button>

            {needsRequest && !allGranted ? (
              <Button
                className="flex-1 rounded-xl gap-2"
                onClick={requestPermissions}
                disabled={requesting}
              >
                {requesting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                Permitir acesso
              </Button>
            ) : (
              <Button
                className="flex-1 rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={handleStartCall}
                disabled={!canCall}
              >
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
