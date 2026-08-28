import { useState, type CSSProperties } from "react";
import type { StudioPhoto } from "../photos";
import { BRAND_NAME } from "../brand";

/**
 * MOLDURA DE FOTO DO STUDIO
 *
 * Ponto único onde o enquadramento escolhido no editor (ponto focal, zoom,
 * rotação e área segura) é aplicado. Todos os blocos fotográficos passam por
 * aqui — assim o recorte definido uma vez vale para todas as artes.
 *
 * - ponto focal → `object-position` (o que importa nunca é cortado)
 * - zoom + rotação → `transform` na imagem, com compensação de escala para a
 *   rotação não deixar cantos vazios
 * - área segura → véu suave na faixa onde o texto da arte cai, garantindo
 *   leitura sem precisar editar a foto original
 */
const PhotoFrame = ({
  photo,
  className = "",
  imgClassName = "",
  style,
}: {
  photo: StudioPhoto;
  className?: string;
  imgClassName?: string;
  style?: CSSProperties;
}) => {
  const [failed, setFailed] = useState(false);
  const rad = (photo.rotation * Math.PI) / 180;
  /** Rotacionar encolhe a área útil: amplia o bastante para não sobrar canto. */
  const cover = Math.abs(Math.cos(rad)) + Math.abs(Math.sin(rad));
  const scale = photo.zoom * cover;

  /** Bordas arredondadas por padrão nas fotos de acervo; blocos que precisam
   *  de formato próprio (meia-face, palco, topo arredondado) passam classe
   *  `rounded-*` ou `rounded-none` e o padrão cede. */
  const hasRounded = /\brounded-/.test(className);

  return (
    <div
      className={`relative overflow-hidden ${hasRounded ? "" : "rounded-2xl"} ${className}`}
      style={style}
    >
      {failed ? (
        <div className="flex h-full w-full items-center justify-center bg-muted px-6 text-center text-xs font-medium text-muted-foreground">
          Imagem indisponível
        </div>
      ) : (
        <img
          src={photo.src}
          alt={photo.label || BRAND_NAME}
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover ${imgClassName}`}
          style={{
            objectPosition: `${photo.focusX}% ${photo.focusY}%`,
            transform: `rotate(${photo.rotation}deg) scale(${scale})`,
            transformOrigin: `${photo.focusX}% ${photo.focusY}%`,
          }}
        />
      )}

      {photo.safeArea !== "none" && (
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 h-[42%] ${
            photo.safeArea === "top"
              ? "top-0 bg-gradient-to-b from-foreground/55 to-transparent"
              : "bottom-0 bg-gradient-to-t from-foreground/55 to-transparent"
          }`}
        />
      )}
    </div>
  );
};

export default PhotoFrame;
