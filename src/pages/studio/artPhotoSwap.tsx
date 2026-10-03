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
import { Upload } from "lucide-react";
import type { PhotoFraming } from "./photos";

export type SwapPhoto = PhotoFraming & { src: string; label?: string };
/** Arte -> posição da foto -> imagem escolhida. */
export type ArtPhotoSwaps = Record<number, Record<number, SwapPhoto>>;

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

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slotCount: number;
  photos: SwapPhoto[];
  allowDevice: boolean;
  onPick: (slot: number, photo: SwapPhoto) => void;
};

export const ArtPhotoSwapDialog = ({ open, onOpenChange, slotCount, photos, allowDevice, onPick }: Props) => {
  const [slot, setSlot] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const pick = (p: SwapPhoto) => {
    onPick(slot, p);
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
          <DialogTitle>Trocar imagem da arte</DialogTitle>
        </DialogHeader>
        {slotCount > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: slotCount }, (_, i) => (
              <Button key={i} size="sm" variant={slot === i ? "secondary" : "outline"} className="h-8 rounded-full text-xs" onClick={() => setSlot(i)}>
                Foto {i + 1}
              </Button>
            ))}
          </div>
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
