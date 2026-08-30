import { motion } from "framer-motion";
import PhotoFrame from "@/pages/studio/blocks/PhotoFrame";
import { blockPadding, sectionHeight, type StudioFormat } from "@/pages/studio/blocks/shared";
import type { StudioPhoto } from "@/pages/studio/photos";
import type { AuthorialArt, AuthorialSlide } from "./authorial";
import AuthorialOrnaments from "./AuthorialOrnaments";


/**
 * ARTE DO MODO AUTORAL
 *
 * Diagramação puramente tipográfica do trecho autoral: nada de copy de venda,
 * nada de jargão, nada gerado por IA. O texto exibido é EXATAMENTE o que o
 * autor escreveu, na ordem em que escreveu.
 *
 * Foto do acervo entra como plano de fundo (total ou em faixa) sempre com
 * pouco brilho — véu escuro + saturação e opacidade reduzidas — para nunca
 * competir com a leitura.
 *
 * Layouts: 0 centro, 1 editorial à esquerda, 2 inverso (fundo de cor),
 * 3 aspas gigantes, 4 foto de fundo total, 5 foto em faixa.
 */

type Props = {
  art: AuthorialArt;
  slide: AuthorialSlide;
  slideIndex: number;
  format: StudioFormat;
  photo?: StudioPhoto | null;
  /** Rodapé discreto: título da obra e a posição do trecho. */
  showMeta?: boolean;
};

const Lines = ({
  lines,
  className,
  inverse,
}: {
  lines: string[];
  className: string;
  inverse: boolean;
}) => (
  <>
    {lines.map((line, i) => (
      <p
        key={i}
        className={`${className} ${i > 0 ? "mt-[0.6em]" : ""} ${
          inverse ? "text-primary-foreground" : "text-foreground"
        }`}
      >
        {line}
      </p>
    ))}
  </>
);

/** Tamanho tipográfico proporcional ao volume de texto do trecho. */
const scaleFor = (chars: number) => {
  if (chars <= 90) return "text-3xl leading-[1.18] md:text-5xl";
  if (chars <= 200) return "text-2xl leading-[1.25] md:text-4xl";
  if (chars <= 420) return "text-xl leading-[1.35] md:text-3xl";
  return "text-base leading-[1.45] md:text-xl";
};

const AuthorialArtBlock = ({ art, slide, slideIndex, format, photo, showMeta = true }: Props) => {
  const chars = slide.lines.join(" ").length;
  const size = scaleFor(chars);
  const inverse = art.layout === 2;
  const isSlogan = art.kind === "slogan";
  const usePhoto = (art.layout === 4 || art.layout === 5) && !!photo;
  const partial = art.photoPartial;

  const meta =
    art.kind === "carousel"
      ? `${art.title || "Trecho"} · ${slideIndex + 1} de ${art.slides.length}`
      : art.kind === "slogan"
        ? ""
        : art.title;


  const surface = inverse ? "bg-primary" : usePhoto ? "bg-foreground" : "bg-background";

  return (
    <section
      className={`relative flex ${sectionHeight(format)} items-center overflow-hidden ${surface}`}
      style={usePhoto ? { backgroundColor: "#0c0c12" } : undefined}
    >
      {/* Plano de fundo fotográfico esmaecido: presença, nunca protagonismo.
          A foto SEMPRE é camada absoluta atrás do texto — PhotoFrame é
          `relative` por padrão, então o enquadramento absoluto fica no
          wrapper, nunca na moldura (senão a foto entra no fluxo e empurra
          o texto para fora do quadro). */}
      {usePhoto && photo && (
        <>
          <div
            aria-hidden
            className={`pointer-events-none absolute inset-x-0 ${
              partial ? "bottom-0 h-[45%]" : "inset-y-0"
            }`}
          >
            <PhotoFrame
              photo={photo}
              className="h-full w-full rounded-none"
              imgClassName="opacity-50 brightness-[0.6] saturate-[0.6] contrast-[0.95]"
            />
          </div>
          {/* Película translúcida levemente escurecida: garante o texto
              destacado à frente em qualquer foto, sem apagar a imagem. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: partial
                ? "linear-gradient(to top, rgba(8,8,12,0.82) 0%, rgba(8,8,12,0.55) 34%, rgba(8,8,12,0.25) 55%, rgba(8,8,12,0.55) 100%)"
                : "rgba(8,8,12,0.55)",
            }}
          />
        </>
      )}

      {/* Sem foto: camada gráfica leve (chuva, linhas, geometria) para o fundo
          nunca ficar completamente liso. */}
      {!usePhoto && (
        <AuthorialOrnaments
          seed={`${art.key}:${slideIndex}:${art.layout}`}
          tone={inverse ? "inverse" : "normal"}
        />
      )}

      {/* Aspas gigantes como elemento gráfico (layout 3). */}
      {art.layout === 3 && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-[8%] left-[2%] select-none text-[14rem] font-bold leading-none text-primary/15 md:text-[20rem]"
        >
          &ldquo;
        </span>
      )}


      <div className={`container relative ${blockPadding(format)}`}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={art.layout === 0 ? "mx-auto max-w-3xl text-center" : "max-w-3xl text-left"}
        >
          {art.layout === 1 && (
            <span aria-hidden className="mb-8 block h-1 w-14 rounded-full bg-primary" />
          )}

          {/* Sobre foto, o texto é SEMPRE claro — os tokens da marca podem
              ser escuros e fariam o trecho sumir sobre o véu escuro. */}
          <div style={usePhoto ? { color: "#f5f5f4" } : undefined}>
            <Lines
              lines={slide.lines}
              inverse={inverse}
              className={`font-medium tracking-tight ${size} ${
                isSlogan ? "font-semibold uppercase tracking-[0.06em]" : ""
              } ${usePhoto ? "text-inherit" : ""}`}
            />

            {showMeta && meta && (
              <p
                className={`mt-10 text-[10px] font-medium uppercase tracking-[0.3em] ${
                  inverse && !usePhoto ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
                style={usePhoto ? { color: "rgba(245,245,244,0.7)" } : undefined}
              >
                {meta}
              </p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Marcador de sequência do carrossel: leitura cronológica visível. */}
      {art.kind === "carousel" && (
        <div aria-hidden className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
          {art.slides.map((_, i) => (
            <span
              key={i}
              className={`h-1 w-4 rounded-full ${
                i === slideIndex ? "bg-primary" : usePhoto ? "bg-background/30" : "bg-muted-foreground/25"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default AuthorialArtBlock;
