import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { toast } from "sonner";

type Props = {
  /** Nome do arquivo, ex. "pro-4f2a-03-quote" */
  fileName: string;
  /** Esconde o botão durante gravações de tela */
  visible: boolean;
  children: React.ReactNode;
};

/**
 * Envolve uma seção do Studio e permite baixá-la como PNG em alta resolução
 * (3x = ~1290x2790 no formato 9:16), pronto para o Instagram.
 */
const StudioCapture = ({ fileName, visible, children }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const download = async () => {
    if (!ref.current) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(ref.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        filter: (node) => !(node instanceof HTMLElement && node.dataset.studioNoExport === "1"),
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `alivia-studio-${fileName}.png`;
      link.click();
      toast.success("Arte exportada em alta resolução");
    } catch {
      toast.error("Não foi possível exportar esta seção");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      {children}
      {visible && (
        <button
          type="button"
          data-studio-no-export="1"
          onClick={download}
          disabled={busy}
          title="Baixar esta arte em alta resolução (PNG 3x)"
          className="absolute right-3 top-3 z-30 flex h-9 items-center gap-1.5 rounded-full border border-border bg-card/85 px-3 text-[11px] font-medium text-foreground shadow-sm backdrop-blur transition-opacity hover:opacity-100 md:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          PNG 3x
        </button>
      )}
    </div>
  );
};

export default StudioCapture;
