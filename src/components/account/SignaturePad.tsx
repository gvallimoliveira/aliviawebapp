import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  isPt: boolean;
  saving: boolean;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

/** Finger/stylus signature pad (tablet/phone/mouse). Exports transparent PNG. */
const SignaturePad = ({ isPt, saving, onSave, onCancel }: Props) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = ref.current!;
    const ratio = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * ratio;
    c.height = rect.height * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2.4;
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    ref.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    const p = pos(e);
    const ctx = ref.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setEmpty(false);
  };
  const up = () => { drawing.current = false; last.current = null; };

  const clear = () => {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  };

  const save = () => {
    ref.current!.toBlob((b) => b && onSave(b), "image/png");
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={ref}
        className="w-full h-40 rounded-lg border-2 border-dashed bg-background touch-none cursor-crosshair"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
      />
      <p className="text-xs text-muted-foreground">
        {isPt ? "Assine com o dedo ou caneta no quadro acima." : "Sign with your finger or stylus above."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={save} disabled={empty || saving}>
          {isPt ? "Salvar assinatura" : "Save signature"}
        </Button>
        <Button size="sm" variant="outline" onClick={clear} disabled={saving}>
          {isPt ? "Limpar" : "Clear"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          {isPt ? "Cancelar" : "Cancel"}
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;
