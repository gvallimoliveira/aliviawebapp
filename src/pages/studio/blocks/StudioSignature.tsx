import { BRAND_LOGO, BRAND_NAME } from "../brand";

/**
 * ASSINATURA DA MARCA — presente em TODA arte do Studio.
 *
 * Regra editorial: nenhum criativo sai sem a marca. A assinatura é discreta
 * (canto, escala pequena, opacidade baixa), muda de canto conforme a arte para
 * não brigar com o conteúdo e adapta o tom (claro/escuro) ao fundo. Em fundos
 * escuros vira monocromática clara; em fundos claros, monocromática escura —
 * sempre com o "iA" no verde Aliv.iA como ponto de cor.
 */

export type SignatureCorner = "bl" | "br" | "tl";

const CORNER_CLASS: Record<SignatureCorner, string> = {
  bl: "bottom-5 left-5 md:bottom-7 md:left-8",
  br: "bottom-5 right-5 md:bottom-7 md:right-8",
  tl: "top-5 left-5 md:top-7 md:left-8",
};

type Props = {
  /** Fundo escuro? Define a versão monocromática clara. */
  dark?: boolean;
  /** Canto onde a assinatura flui melhor nesta arte. */
  corner?: SignatureCorner;
  /** Só logo, sem wordmark (para artes muito densas). */
  markOnly?: boolean;
};

const StudioSignature = ({ dark = false, corner = "br", markOnly = false }: Props) => {
  const [name, suffix] = BRAND_NAME.split(".");
  return (
    <div
      aria-hidden
      data-studio-no-export="0"
      className={`pointer-events-none absolute z-20 flex items-center gap-2 ${CORNER_CLASS[corner]}`}
    >
      <img
        src={BRAND_LOGO}
        alt=""
        className={`h-5 w-5 md:h-6 md:w-6 ${dark ? "opacity-90" : "opacity-80"}`}
      />
      {!markOnly && (
        <span
          className={`text-[11px] font-semibold tracking-tight md:text-xs ${
            dark ? "text-mono-paper/70" : "text-mono-ink/60"
          }`}
        >
          {name}.<span className="text-primary">{suffix}</span>
        </span>
      )}
    </div>
  );
};

export default StudioSignature;
