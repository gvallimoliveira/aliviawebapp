import { useRef, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import PhotoFrame from "./blocks/PhotoFrame";
import { DEFAULT_FRAMING, type PhotoFraming, type SafeArea, type StudioPhoto } from "./photos";

const SAFE_LABELS: { id: SafeArea; label: string; hint: string }[] = [
  { id: "none", label: "Sem área segura", hint: "Foto limpa, sem véu" },
  { id: "top", label: "Texto no topo", hint: "Escurece o terço superior" },
  { id: "bottom", label: "Texto embaixo", hint: "Escurece o terço inferior" },
];

const RATIOS: { id: string; label: string; className: string }[] = [
  { id: "9x16", label: "9:16", className: "aspect-[9/16]" },
  { id: "4x5", label: "4:5", className: "aspect-[4/5]" },
  { id: "1x1", label: "1:1", className: "aspect-square" },
  { id: "split", label: "Meia-face", className: "aspect-[1/2]" },
];

/**
 * EDITOR DE ENQUADRAMENTO
 *
 * Define recorte (ponto focal + zoom), rotação e área segura de uma foto. O
 * resultado é salvo na conta e usado automaticamente por todos os blocos
 * fotográficos, então basta escolher o melhor recorte uma vez por foto.
 */
const StudioPhotoEditor = ({
  photo,
  onSave,
  onClose,
}: {
  photo: StudioPhoto;
  onSave: (id: string, patch: PhotoFraming) => Promise<void>;
  onClose: () => void;
}) => {
  const [framing, setFraming] = useState<PhotoFraming>({
    focusX: photo.focusX,
    focusY: photo.focusY,
    zoom: photo.zoom,
    rotation: photo.rotation,
    safeArea: photo.safeArea,
  });
  const [ratio, setRatio] = useState(RATIOS[0]);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ x: number; y: number; fx: number; fy: number } | null>(null);

  const set = <K extends keyof PhotoFraming>(key: K, value: PhotoFraming[K]) =>
    setFraming((prev) => ({ ...prev, [key]: value }));

  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

  /** Clique no preview move o ponto focal — mais rápido que sliders. */
  const pick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setFraming((prev) => ({
      ...prev,
      focusX: clamp(((e.clientX - rect.left) / rect.width) * 100),
      focusY: clamp(((e.clientY - rect.top) / rect.height) * 100),
    }));
  };

  /**
   * ARRASTAR PARA ESCOLHER O QUADRO.
   *
   * Com zoom aplicado, só o ponto focal define o recorte — então arrastar move
   * o ponto focal na direção oposta ao gesto (o quadro "anda" junto com o
   * dedo/mouse, como em qualquer visualizador de imagem). A sensibilidade cai
   * com o zoom, porque cada pixel de tela cobre menos imagem.
   */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, fx: framing.focusX, fy: framing.focusY };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const k = 100 / Math.max(framing.zoom, 1);
    setFraming((prev) => ({
      ...prev,
      focusX: clamp(start.fx - ((e.clientX - start.x) / rect.width) * k),
      focusY: clamp(start.fy - ((e.clientY - start.y) / rect.height) * k),
    }));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    drag.current = null;
    setDragging(false);
    /** Gesto curto = toque: vale como clique para marcar o ponto focal. */
    if (start && Math.abs(e.clientX - start.x) < 4 && Math.abs(e.clientY - start.y) < 4) {
      pick(e as unknown as React.MouseEvent<HTMLDivElement>);
    }
  };


  const save = async () => {
    setSaving(true);
    try {
      await onSave(photo.id, framing);
      toast.success("Enquadramento salvo");
      onClose();
    } catch (error) {
      console.error("[studio] enquadramento não salvo", error);
      toast.error("Não foi possível salvar o enquadramento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/50 p-3 backdrop-blur-sm md:items-center">
      <div className="max-h-[92svh] w-full max-w-md overflow-y-auto rounded-3xl border border-border bg-card p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Enquadrar foto</h2>
            <p className="text-[11px] text-muted-foreground">
              Arraste a foto para escolher o quadro e toque para marcar o que não pode ser cortado.
              Vale para todas as artes.

            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-border p-1.5 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-2 flex gap-1.5">
          {RATIOS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRatio(r)}
              className={`rounded-full border border-border px-2.5 py-1 text-[10px] font-medium ${
                ratio.id === r.id ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null;
            setDragging(false);
          }}
          className={`mx-auto mb-3 w-full max-w-[240px] touch-none select-none rounded-2xl border border-border ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          <PhotoFrame
            photo={{ ...photo, ...framing }}
            className={`w-full rounded-2xl ${ratio.className}`}
          />
        </div>


        <div className="space-y-3 rounded-2xl border border-border bg-background p-3">
          <label className="block">
            <span className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              Aproximação <span className="tabular-nums">{framing.zoom.toFixed(2)}×</span>
            </span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={framing.zoom}
              onChange={(e) => set("zoom", Number(e.target.value))}
              className="w-full accent-primary"
            />
          </label>

          <label className="block">
            <span className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              Rotação <span className="tabular-nums">{framing.rotation}°</span>
            </span>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={framing.rotation}
              onChange={(e) => set("rotation", Number(e.target.value))}
              className="w-full accent-primary"
            />
          </label>

          <div className="flex flex-wrap gap-1.5">
            {SAFE_LABELS.map((s) => (
              <button
                key={s.id}
                type="button"
                title={s.hint}
                onClick={() => set("safeArea", s.id)}
                className={`rounded-full border border-border px-2.5 py-1 text-[10px] font-medium ${
                  framing.safeArea === s.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFraming(DEFAULT_FRAMING)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-[11px] text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Redefinir
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="flex-1 rounded-full bg-primary px-4 py-2.5 text-[12px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Salvando…" : "Salvar enquadramento"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudioPhotoEditor;
