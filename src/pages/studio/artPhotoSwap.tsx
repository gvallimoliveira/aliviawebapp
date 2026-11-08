/**
 * TROCA DE IMAGEM NA PRÓPRIA ARTE
 *
 * Igual ao editor de texto: a troca acontece no nó renderizado, então o que se
 * vê é o que sai no PNG. Cada arte guarda {posição da foto -> imagem nova} e a
 * troca é reaplicada depois de cada re-render. Upload do aparelho (só admin)
 * fica apenas nesta sessão: não entra no acervo nem consome cota.
 */
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImageIcon, Layers3, Trash2, Upload } from "lucide-react";
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
  node ? Array.from(node.querySelectorAll<HTMLImageElement>('img[data-studio-photo="1"]'))
    .filter((img) => !img.closest('[data-studio-inserted-image="1"]')) : [];

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
const insertionListeners = new WeakMap<HTMLElement, AbortController>();

const insertionSurface = (node: HTMLElement) => {
  const sections = Array.from(node.querySelectorAll<HTMLElement>("section"));
  const rootRect = node.getBoundingClientRect();
  return sections.find((section) => {
    const rect = section.getBoundingClientRect();
    return Math.abs(rect.width - rootRect.width) < 2 && Math.abs(rect.height - rootRect.height) < 2;
  }) ?? sections[0] ?? node;
};

/** Insere imagem em qualquer arte, inclusive nas que nasceram somente com texto. */
export const applyInsertedArtImage = (node: HTMLElement | null, insertion?: InsertedArtImage) => {
  if (!node) return;
  insertionListeners.get(node)?.abort();
  insertionListeners.delete(node);
  node.querySelector(`[${INSERT_ATTR}]`)?.remove();
  if (!insertion) return;

  const surface = insertionSurface(node);
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
  img.crossOrigin = "anonymous";
  img.src = insertion.photo.src;
  img.alt = insertion.photo.label ?? "Imagem inserida";
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.objectPosition = `${insertion.photo.focusX}% ${insertion.photo.focusY}%`;
  img.style.transform = `rotate(${insertion.photo.rotation}deg) scale(${scaleOf(insertion.photo)})`;
  img.style.transformOrigin = `${insertion.photo.focusX}% ${insertion.photo.focusY}%`;
  layer.appendChild(img);

  if (getComputedStyle(surface).position === "static") surface.style.position = "relative";
  if (insertion.mode === "background") {
    /* A camada entra dentro da superfície visual, não atrás do bloco opaco. O
       texto continua acima porque os filhos originais recebem um plano próprio. */
    Object.assign(layer.style, { inset: "0", zIndex: "0", borderRadius: "inherit" });
    img.style.filter = "brightness(0.42) saturate(0.82)";
    Array.from(surface.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) return;
      if (getComputedStyle(child).position === "static") child.style.position = "relative";
      if (!getComputedStyle(child).zIndex || getComputedStyle(child).zIndex === "auto") child.style.zIndex = "1";
    });
    surface.prepend(layer);
  } else {
    const frameHeight = () => {
      const rect = node.getBoundingClientRect();
      return rect.height ? insertion.width * (rect.width / rect.height) : insertion.width;
    };
    let selected = true;
    const controls: HTMLButtonElement[] = [];
    const showControls = (value: boolean) => {
      selected = value;
      layer.dataset.studioImageSelected = value ? "1" : "0";
      layer.style.outline = value ? "1px dashed rgba(255,255,255,0.9)" : "none";
      layer.style.outlineOffset = value ? "2px" : "0";
      controls.forEach((control) => { control.style.display = value ? "flex" : "none"; });
    };
    const paint = () => {
      layer.style.left = `${insertion.x * 100}%`;
      layer.style.top = `${insertion.y * 100}%`;
      layer.style.width = `${insertion.width * 100}%`;
      layer.style.height = `${frameHeight() * 100}%`;
      layer.style.zIndex = "30";
      layer.style.borderRadius = "12px";
    };
    paint();

    // A superfície da foto nunca captura o gesto: a página continua rolando.
    // Mover e redimensionar acontecem somente pelos cinco pontos visíveis.
    layer.style.pointerEvents = "none";
    layer.style.boxShadow = "none";
    img.style.pointerEvents = "auto";
    img.style.touchAction = "pan-y";
    img.addEventListener("click", (event) => {
      event.stopPropagation();
      showControls(true);
    });

    type ResizeCorner = "nw" | "ne" | "sw" | "se";
    let action: {
      kind: "move" | "resize";
      corner?: ResizeCorner;
      px: number;
      py: number;
      x: number;
      y: number;
      width: number;
    } | null = null;
    const begin = (event: PointerEvent, kind: "move" | "resize", corner?: ResizeCorner) => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget as HTMLElement;
      target.setPointerCapture(event.pointerId);
      target.style.cursor = kind === "move" ? "grabbing" : target.style.cursor;
      action = { kind, corner, px: event.clientX, py: event.clientY, x: insertion.x, y: insertion.y, width: insertion.width };
    };

    const drag = (event: PointerEvent) => {
      if (!action) return;
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      if (action.kind === "move") {
        insertion.x = Math.max(0, Math.min(1 - insertion.width, action.x + (event.clientX - action.px) / rect.width));
        insertion.y = Math.max(0, Math.min(1 - frameHeight(), action.y + (event.clientY - action.py) / rect.height));
      } else {
        const corner = action.corner ?? "se";
        const directionX = corner.endsWith("e") ? 1 : -1;
        const directionY = corner.startsWith("s") ? 1 : -1;
        const dx = ((event.clientX - action.px) / rect.width) * directionX;
        const dy = ((event.clientY - action.py) / rect.width) * directionY;
        const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
        insertion.width = Math.max(0.18, Math.min(0.9, action.width + delta));
        if (corner.endsWith("w")) insertion.x = action.x + action.width - insertion.width;
        if (corner.startsWith("n")) insertion.y = action.y + (action.width - insertion.width) * (rect.width / rect.height);
        insertion.x = Math.max(0, Math.min(1 - insertion.width, insertion.x));
        insertion.y = Math.max(0, Math.min(1 - frameHeight(), insertion.y));
      }
      paint();
    };
    const end = (event: PointerEvent) => {
      action = null;
      const target = event.currentTarget as HTMLElement;
      if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
      if (target.dataset.studioImageMoveHandle === "1") target.style.cursor = "grab";
    };
    const wire = (control: HTMLButtonElement) => {
      control.addEventListener("pointermove", drag);
      control.addEventListener("pointerup", end);
      control.addEventListener("pointercancel", end);
      controls.push(control);
      layer.appendChild(control);
    };
    const baseControl = () => {
      const control = document.createElement("button");
      control.type = "button";
      control.dataset.studioNoExport = "1";
      Object.assign(control.style, {
        position: "absolute", width: "32px", height: "32px", borderRadius: "999px",
        border: "2px solid rgba(255,255,255,0.95)", background: "rgba(17,17,17,0.88)",
        color: "#fff", touchAction: "none", zIndex: "2", pointerEvents: "auto",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.38)",
      });
      return control;
    };

    const moveHandle = baseControl();
    moveHandle.dataset.studioImageMoveHandle = "1";
    moveHandle.setAttribute("aria-label", "Mover imagem");
    moveHandle.title = "Arraste este ponto para mover a imagem";
    moveHandle.innerHTML = '<span aria-hidden="true" style="font-size:16px;line-height:1">✥</span>';
    Object.assign(moveHandle.style, { left: "50%", top: "50%", transform: "translate(-50%, -50%)", cursor: "grab" });
    moveHandle.addEventListener("pointerdown", (event) => begin(event, "move"));
    wire(moveHandle);

    (["nw", "ne", "sw", "se"] as ResizeCorner[]).forEach((corner) => {
      const handle = baseControl();
      handle.dataset.studioImageResizeHandle = corner;
      handle.setAttribute("aria-label", `Redimensionar imagem pelo canto ${corner}`);
      handle.title = "Arraste para aumentar ou reduzir";
      handle.textContent = "";
      const vertical = corner.startsWith("n") ? "top" : "bottom";
      const horizontal = corner.endsWith("w") ? "left" : "right";
      Object.assign(handle.style, {
        // Inteiro dentro do recorte da foto: no celular o centro do toque não
        // pode cair na área cortada, senão o navegador ignora o arraste.
        [vertical]: "3px", [horizontal]: "3px", width: "32px", height: "32px",
        cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
      });
      handle.addEventListener("pointerdown", (event) => begin(event, "resize", corner));
      wire(handle);
    });
    surface.appendChild(layer);
    showControls(selected);

    const controller = new AbortController();
    insertionListeners.set(node, controller);
    document.addEventListener("pointerdown", (event) => {
      if (!layer.contains(event.target as Node)) showControls(false);
    }, { signal: controller.signal });
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

/** Never dispatch a replacement against a missing/stale slot. */
export const resolvePhotoPick = (slotCount: number, slot: number, mode: "replace" | InsertedImageMode) => ({
  slot: Math.max(0, Math.min(slot, Math.max(0, slotCount - 1))),
  mode: mode === "replace" && slotCount === 0 ? "composition" as const : mode,
});

export const ArtPhotoSwapDialog = ({ open, onOpenChange, slotCount, photos, allowDevice, hasInsertion, onRemoveInsertion, onPick }: Props) => {
  const [slot, setSlot] = useState(0);
  const [mode, setMode] = useState<"replace" | InsertedImageMode>(slotCount ? "replace" : "composition");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!open) return;
    setSlot(0);
    setMode(slotCount > 0 ? "replace" : "composition");
  }, [open, slotCount]);

  const pick = (p: SwapPhoto) => {
    const target = resolvePhotoPick(slotCount, slot, mode);
    onPick(target.slot, p, target.mode);
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
          <Button variant="destructive" className="w-full" onClick={() => { onRemoveInsertion(); onOpenChange(false); }}>
            <Trash2 className="mr-2 h-4 w-4" /> Excluir imagem inserida
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
