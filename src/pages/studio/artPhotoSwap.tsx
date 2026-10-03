/**
 * TROCA DE IMAGEM NA PRÓPRIA ARTE
 *
 * Igual ao editor de texto: a troca acontece no nó renderizado, então o que se
 * vê é o que sai no PNG. Cada arte guarda {posição da foto -> imagem nova} e a
 * troca é reaplicada depois de cada re-render. Upload do aparelho (só admin)
 * fica apenas nesta sessão: não entra no acervo nem consome cota.
 */
import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageIcon, Layers3, Upload } from "lucide-react";
import type { PhotoFraming } from "./photos";

export type SwapPhoto = PhotoFraming & { src: string; label?: string };
/** Arte -> posição da foto -> imagem escolhida. */
export type ArtPhotoSwaps = Record<number, Record<number, SwapPhoto>>;
export type InsertedImageMode = "background" | "composition";
export type InsertedArtImage = {
  photo: SwapPhoto;
  mode: InsertedImageMode;
  /** Posição e tamanho em frações do quadro, preservados em qualquer formato. */
  x: number;
  y: number;
  width: number;
};
export type ArtImageInsertions = Record<number, InsertedArtImage>;

export const artPhotoSlots = (node: HTMLElement | null) =>
  node ? Array.from(node.querySelectorAll<HTMLImageElement>('img[data-studio-photo="1"]')) : [];

const scaleOf = (p: SwapPhoto) => {
  const rad = (p.rotation * Math.PI) / 180;
  return p.zoom * (Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad)));
};

/** Aplica a troca no DOM (idempotente). */
export const applyArtPhotoSwaps = (node: HTMLElement | null, swaps?: Record<number, SwapPhoto>) => {
  if (!node || !swaps) return;
  const slots = artPhotoSlots(node);
  Object.entries(swaps).forEach(([k, p]) => {
    const img = slots[Number(k)];
    if (!img) return;
    if (img.getAttribute("src") !== p.src) img.setAttribute("src", p.src);
    const scale = scaleOf(p);
    img.dataset.studioPhotoFocusX = String(p.focusX);
    img.dataset.studioPhotoFocusY = String(p.focusY);
    img.dataset.studioPhotoRotation = String(p.rotation);
    img.dataset.studioPhotoScale = String(scale);
    img.style.objectPosition = `${p.focusX}% ${p.focusY}%`;
    img.style.transform = `rotate(${p.rotation}deg) scale(${scale})`;
    img.style.transformOrigin = `${p.focusX}% ${p.focusY}%`;
    if (p.label) img.alt = p.label;
  });
};

const INSERT_ATTR = "data-studio-inserted-image";

/** Insere imagem em qualquer arte, inclusive nas que nasceram somente com texto. */
export const applyInsertedArtImage = (node: HTMLElement | null, insertion?: InsertedArtImage) => {
  if (!node) return;
  node.querySelector(`[${INSERT_ATTR}]`)?.remove();
  if (!insertion) return;

  const layer = document.createElement("div");
  layer.setAttribute(INSERT_ATTR, "1");
  layer.dataset.studioPhotoFrame = "1";
  layer.style.position = "absolute";
  layer.style.overflow = "hidden";
  layer.style.pointerEvents = insertion.mode === "composition" ? "auto" : "none";

  const img = document.createElement("img");
  img.dataset.studioPhoto = "1";
  img.dataset.studioExportImageLayer = insertion.mode === "composition" ? "foreground" : "backdrop";
  img.dataset.studioPhotoFocusX = String(insertion.photo.focusX);
  img.dataset.studioPhotoFocusY = String(insertion.photo.focusY);
  img.dataset.studioPhotoRotation = String(insertion.photo.rotation);
  img.dataset.studioPhotoScale = String(scaleOf(insertion.photo));
  img.src = insertion.photo.src;
  img.alt = insertion.photo.label ?? "Imagem inserida";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.objectPosition = `${insertion.photo.focusX}% ${insertion.photo.focusY}%`;
  img.style.transform = `rotate(${insertion.photo.rotation}deg) scale(${scaleOf(insertion.photo)})`;
  img.style.transformOrigin = `${insertion.photo.focusX}% ${insertion.photo.focusY}%`;
  layer.appendChild(img);

  if (getComputedStyle(node).position === "static") node.style.position = "relative";
  if (insertion.mode === "background") {
    Object.assign(layer.style, { inset: "0", zIndex: "0", borderRadius: "inherit" });
    img.style.filter = "brightness(0.42) saturate(0.82)";
    node.prepend(layer);
  } else {
    const paint = () => {
      layer.style.left = `${insertion.x * 100}%`;
      layer.style.top = `${insertion.y * 100}%`;
      layer.style.width = `${insertion.width * 100}%`;
      layer.style.aspectRatio = "1 / 1";
      layer.style.zIndex = "30";
      layer.style.borderRadius = "12px";
    };
    paint();

    const handle = document.createElement("button");
    handle.type = "button";
    handle.dataset.studioNoExport = "1";
    handle.setAttribute("aria-label", "Redimensionar imagem");
    handle.textContent = "↘";
    Object.assign(handle.style, {
      position: "absolute", right: "4px", bottom: "4px", width: "28px", height: "28px",
      borderRadius: "999px", border: "1px solid currentColor", background: "var(--background)",
      color: "var(--foreground)", cursor: "nwse-resize", touchAction: "none", zIndex: "2",
    });
    layer.appendChild(handle);

    let action: { kind: "move" | "resize"; px: number; py: number; x: number; y: number; width: number } | null = null;
    const begin = (event: PointerEvent, kind: "move" | "resize") => {
      event.preventDefault();
      event.stopPropagation();
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      action = { kind, px: event.clientX, py: event.clientY, x: insertion.x, y: insertion.y, width: insertion.width };
    };
    layer.addEventListener("pointerdown", (event) => {
      if (event.target === handle) return;
      begin(event, "move");
    });
    handle.addEventListener("pointerdown", (event) => begin(event, "resize"));
    layer.addEventListener("pointermove", (event) => {
      if (!action) return;
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      if (action.kind === "move") {
        insertion.x = Math.max(0, Math.min(1 - insertion.width, action.x + (event.clientX - action.px) / rect.width));
        insertion.y = Math.max(0, Math.min(1 - insertion.width, action.y + (event.clientY - action.py) / rect.height));
      } else {
        insertion.width = Math.max(0.18, Math.min(0.9, action.width + (event.clientX - action.px) / rect.width));
        insertion.x = Math.min(insertion.x, 1 - insertion.width);
        insertion.y = Math.min(insertion.y, 1 - insertion.width);
      }
      paint();
    });
    const end = () => { action = null; };
    layer.addEventListener("pointerup", end);
    layer.addEventListener("pointercancel", end);
    node.appendChild(layer);
  }
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slotCount: number;
  photos: SwapPhoto[];
  allowDevice: boolean;
  hasInsertion: boolean;
  onRemoveInsertion: () => void;
  onPick: (slot: number, photo: SwapPhoto, mode: "replace" | InsertedImageMode) => void;
};

export const ArtPhotoSwapDialog = ({ open, onOpenChange, slotCount, photos, allowDevice, hasInsertion, onRemoveInsertion, onPick }: Props) => {
  const [slot, setSlot] = useState(0);
  const [mode, setMode] = useState<"replace" | InsertedImageMode>(slotCount ? "replace" : "composition");
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (p: SwapPhoto) => {
    onPick(slot, p, mode);
    onOpenChange(false);
  };

  const fromDevice = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () =>
      pick({ src: String(reader.result), focusX: 50, focusY: 50, zoom: 1, rotation: 0, safeArea: "none", label: file.name });
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Imagem da arte</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Escolha como a imagem participa da arte. As mais relacionadas ao assunto aparecem primeiro.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {slotCount > 0 && (
            <Button variant={mode === "replace" ? "secondary" : "outline"} className="h-auto min-h-16 justify-start whitespace-normal" onClick={() => setMode("replace")}>
              <ImageIcon className="mr-2 h-4 w-4 shrink-0" /> Substituir atual
            </Button>
          )}
          <Button variant={mode === "background" ? "secondary" : "outline"} className="h-auto min-h-16 justify-start whitespace-normal" onClick={() => setMode("background")}>
            <Layers3 className="mr-2 h-4 w-4 shrink-0" /> Fundo escurecido
          </Button>
          <Button variant={mode === "composition" ? "secondary" : "outline"} className="h-auto min-h-16 justify-start whitespace-normal" onClick={() => setMode("composition")}>
            <ImageIcon className="mr-2 h-4 w-4 shrink-0" /> Primeiro plano livre
          </Button>
        </div>
        {mode === "replace" && slotCount > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: slotCount }, (_, i) => (
              <Button key={i} size="sm" variant={slot === i ? "secondary" : "outline"} className="h-8 rounded-full text-xs" onClick={() => setSlot(i)}>
                Foto {i + 1}
              </Button>
            ))}
          </div>
        )}
        {hasInsertion && (
          <Button variant="ghost" className="w-full" onClick={() => { onRemoveInsertion(); onOpenChange(false); }}>
            Remover imagem inserida
          </Button>
        )}
        {allowDevice && (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => fromDevice(e.target.files?.[0])} />
            <Button variant="outline" className="w-full rounded-full" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Enviar do aparelho (só nesta arte, não entra no acervo)
            </Button>
          </>
        )}
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma foto no acervo desta marca.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <button
                key={`${p.src.slice(-24)}-${i}`}
                type="button"
                onClick={() => pick(p)}
                className="aspect-square overflow-hidden rounded-xl border border-border hover:ring-2 hover:ring-primary"
                title={p.label}
              >
                <img src={p.src} alt={p.label ?? ""} className="h-full w-full object-cover" style={{ objectPosition: `${p.focusX}% ${p.focusY}%` }} />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
