import { useEffect, useRef, useState } from "react";
import { FileUp, ImageUp, Loader2, Trash2, Type } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STUDIO_FONTS, ensureFontLoaded, findFont } from "./brandFonts";

/**
 * ATIVOS DA MARCA: manual (PDF), logo e tipografia.
 *
 * - O PDF é a FONTE PRINCIPAL do kit: ao interpretar, a IA lê o documento e
 *   preenche posicionamento, públicos, cores e a fonte da marca.
 * - O logo entra por upload (PNG/JPG/WEBP/SVG) e é guardado como data URL, para
 *   aparecer nas artes e no PNG exportado sem depender de CORS.
 * - A tipografia escolhida é aplicada em todas as artes desta marca.
 */

export type BrandDoc = { name: string; mime: string; base64: string };

const MAX_DOC_BYTES = 6 * 1024 * 1024;
const MAX_LOGO_BYTES = 4 * 1024 * 1024;
const LOGO_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** Reduz o logo para no máximo 640px de lado — data URL leve e nítida. */
const shrinkLogo = async (file: File): Promise<string> => {
  const dataUrl = await readAsDataUrl(file);
  if (file.type === "image/svg+xml") return dataUrl;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("imagem inválida"));
    el.src = dataUrl;
  });
  const max = 640;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  if (scale === 1 && dataUrl.length < 400_000) return dataUrl;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
};

export type BrandAssetKey = "doc" | "logo" | "font";

type Props = {
  logoUrl: string;
  onLogoChange: (value: string) => void;
  fontKey: string;
  onFontChange: (key: string) => void;
  doc: BrandDoc | null;
  onDocChange: (doc: BrandDoc | null) => void;
  /** Quais ativos mostrar — permite distribuí-los entre as etapas da página. */
  only?: BrandAssetKey[];
};

const BrandAssetsFields = ({
  logoUrl,
  onLogoChange,
  fontKey,
  onFontChange,
  doc,
  onDocChange,
  only,
}: Props) => {
  const logoInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"logo" | "doc" | null>(null);
  const font = findFont(fontKey);
  const visible: BrandAssetKey[] = only ?? ["doc", "logo", "font"];
  const shows = (key: BrandAssetKey) => visible.includes(key);
  /** Separador só entre blocos visíveis — evita linha órfã no topo. */
  const divider = (key: BrandAssetKey) => (visible.indexOf(key) > 0 ? "border-t border-border pt-4" : "");


  /** A prévia precisa da fonte real carregada. */
  useEffect(() => {
    ensureFontLoaded(fontKey);
  }, [fontKey]);

  const pickLogo = async (file?: File | null) => {
    if (!file) return;
    if (!LOGO_MIME.includes(file.type)) {
      toast.error("Use PNG, JPG, WEBP ou SVG.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo muito grande (máx. 4MB).");
      return;
    }
    setBusy("logo");
    try {
      onLogoChange(await shrinkLogo(file));
      toast.success("Logo carregado. Salve as alterações para aplicar nas artes.");
    } catch {
      toast.error("Não foi possível ler esta imagem.");
    } finally {
      setBusy(null);
      if (logoInput.current) logoInput.current.value = "";
    }
  };

  const pickDoc = async (file?: File | null) => {
    if (!file) return;
    const ok = file.type === "application/pdf" || file.type.startsWith("image/");
    if (!ok) {
      toast.error("Envie o manual da marca em PDF (ou uma imagem dele).");
      return;
    }
    if (file.size > MAX_DOC_BYTES) {
      toast.error("Documento muito grande (máx. 6MB).");
      return;
    }
    setBusy("doc");
    try {
      const dataUrl = await readAsDataUrl(file);
      const base64 = dataUrl.split(",")[1] ?? "";
      onDocChange({ name: file.name, mime: file.type, base64 });
      toast.success("Documento anexado. Clique em “Interpretar com IA” para preencher o kit.");
    } catch {
      toast.error("Não foi possível ler o documento.");
    } finally {
      setBusy(null);
      if (docInput.current) docInput.current.value = "";
    }
  };

  return (
    <div className="sm:col-span-2 space-y-4 rounded-2xl border border-border bg-muted/30 p-4">
      {/* ---------- Manual da marca (fonte principal) ---------- */}
      <div>
        <p className="text-sm font-semibold">Manual da marca (PDF)</p>
        <p className="text-xs text-muted-foreground">
          Envie o descritivo completo da marca. Ao interpretar, ele passa a ser a{" "}
          <strong>fonte principal</strong> do kit: posicionamento, públicos, cores e tipografia saem de lá.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            ref={docInput}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => void pickDoc(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={busy === "doc"}
            onClick={() => docInput.current?.click()}
          >
            {busy === "doc" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="mr-1.5 h-4 w-4" />
            )}
            {doc ? "Trocar documento" : "Enviar PDF da marca"}
          </Button>
          {doc && (
            <>
              <span className="max-w-[220px] truncate text-xs text-muted-foreground">{doc.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remover documento"
                onClick={() => onDocChange(null)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ---------- Logo ---------- */}
      <div className="border-t border-border pt-4">
        <p className="text-sm font-semibold">Logo da marca</p>
        <p className="text-xs text-muted-foreground">
          PNG, JPG, WEBP ou SVG. Aparece na assinatura e nos blocos que usam o lockup.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo da marca" className="h-full w-full object-contain" />
            ) : (
              <ImageUp className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <input
            ref={logoInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => void pickLogo(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={busy === "logo"}
            onClick={() => logoInput.current?.click()}
          >
            {busy === "logo" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ImageUp className="mr-1.5 h-4 w-4" />
            )}
            Enviar logo
          </Button>
          {logoUrl && (
            <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => onLogoChange("")}>
              Remover
            </Button>
          )}
        </div>
        <div className="mt-2">
          <Label htmlFor="edit-logo" className="text-xs">
            Ou cole a URL do logo
          </Label>
          <Input
            id="edit-logo"
            className="mt-1"
            placeholder="https://minhamarca.com/logo.png"
            value={logoUrl.startsWith("data:") ? "" : logoUrl}
            onChange={(e) => onLogoChange(e.target.value)}
          />
          {logoUrl.startsWith("data:") && (
            <p className="mt-1 text-[11px] text-muted-foreground">Logo enviado por upload (guardado na marca).</p>
          )}
        </div>
      </div>

      {/* ---------- Tipografia ---------- */}
      <div className="border-t border-border pt-4">
        <p className="text-sm font-semibold">Tipografia da marca</p>
        <p className="text-xs text-muted-foreground">
          Aplicada em todas as artes desta marca. A IA também sugere a fonte quando ela está no manual.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Select value={fontKey || "default"} onValueChange={onFontChange}>
            <SelectTrigger className="w-[240px]">
              <Type className="mr-1.5 h-4 w-4 shrink-0" />
              <SelectValue placeholder="Escolha a fonte" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {STUDIO_FONTS.map((f) => (
                <SelectItem key={f.key} value={f.key}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span
            className="rounded-xl border border-border bg-background px-3 py-2 text-base font-bold"
            style={font.stack ? { fontFamily: font.stack } : undefined}
          >
            {font.label === "Padrão do Studio" ? "Aa — padrão" : "Aa Bb Cc 123"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BrandAssetsFields;
