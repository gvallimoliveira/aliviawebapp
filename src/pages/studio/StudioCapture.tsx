import { useRef, useState } from "react";
import { Check, Copy, Download, Loader2, Star, StarOff, Type } from "lucide-react";
import { exportNodeAsPng } from "./exportImage";
import { toast } from "sonner";

type Props = {
  /** Nome do arquivo, ex. "pro-4f2a-03-quote" */
  fileName: string;
  /** Esconde os botões durante gravações de tela */
  visible: boolean;
  /** Legenda de vendas pronta para o Instagram desta seção */
  caption: string;
  /** Ancora para reabrir a arte a partir dos favoritos */
  anchorId?: string;
  /** Esta arte está favoritada? */
  favorited?: boolean;
  /** Favoritar/desfavoritar apenas esta arte */
  onToggleFavorite?: () => void;
  children: React.ReactNode;
};

/**
 * Envolve uma seção do Studio e oferece saídas de conteúdo:
 * - PNG em alta resolução (3x = ~1290x2790 no formato 9:16);
 * - legenda de vendas pronta (gancho, prova, oferta, CTA e hashtags);
 * - favoritar a arte isolada (persistido no localStorage).
 */
const StudioCapture = ({
  fileName,
  visible,
  caption,
  anchorId,
  favorited = false,
  onToggleFavorite,
  children,
}: Props) => {

  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const download = async () => {
    if (!ref.current || busy) return;
    setBusy(true);
    try {
      const { ratio, shared } = await exportNodeAsPng(ref.current, `alivia-studio-${fileName}.png`);
      const scale = `${ratio.toFixed(1).replace(".0", "")}x`;
      toast.success(shared ? `Arte pronta para compartilhar (${scale})` : `Arte exportada em ${scale}`);
    } catch (error) {
      console.error("[studio] export failed", error);
      toast.error("Não foi possível exportar esta seção. Tente novamente com a barra oculta (tecla H).");
    } finally {
      setBusy(false);
    }
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      toast.success("Legenda copiada");
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto manualmente.");
    }
  };

  return (
    <div ref={ref} className="relative">
      {children}

      {visible && (
        <div data-studio-no-export="1" className="absolute right-3 top-3 z-30 flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCaptionOpen((v) => !v)}
              title="Legenda de vendas pronta para o Instagram"
              className={`flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-[11px] font-medium shadow-sm backdrop-blur transition-opacity hover:opacity-100 md:opacity-40 ${
                captionOpen ? "bg-primary text-primary-foreground" : "bg-card/85 text-foreground"
              }`}
            >
              <Type className="h-3.5 w-3.5" />
              Legenda
            </button>

            <button
              type="button"
              onClick={download}
              disabled={busy}
              title="Baixar esta arte em alta resolução"
              className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-card/85 px-3 text-[11px] font-medium text-foreground shadow-sm backdrop-blur transition-opacity hover:opacity-100 md:opacity-40"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {busy ? "Gerando…" : "Baixar PNG"}
            </button>
          </div>

          {captionOpen && (
            <div className="w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur">
              <textarea
                readOnly
                value={caption}
                onFocus={(e) => e.currentTarget.select()}
                className="h-52 w-full resize-none rounded-lg border border-border bg-background p-2.5 text-[11px] leading-relaxed text-foreground"
              />
              <button
                type="button"
                onClick={copyCaption}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-full bg-primary px-3 py-2 text-[11px] font-semibold text-primary-foreground"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copiada" : "Copiar legenda"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudioCapture;
