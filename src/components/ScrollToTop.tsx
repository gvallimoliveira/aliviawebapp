import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Rola ao topo quando o usuário troca de tela — mas NÃO quando a mudança é
 * apenas de parâmetro/estado dentro da mesma tela (ex.: `/agente/:threadId`,
 * `?paciente=...`), nem quando existe um modal/diálogo aberto. Isso evitava o
 * "salto ao topo" que dava sensação de instabilidade.
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();
  const lastBaseRef = useRef<string | null>(null);

  useEffect(() => {
    // Base da rota = primeiro segmento (a "tela"). Mudanças em segmentos
    // seguintes são navegação interna e preservam a rolagem.
    const base = "/" + (pathname.split("/")[1] || "");
    const isNewScreen = lastBaseRef.current !== base;
    lastBaseRef.current = base;
    if (!isNewScreen) return;

    const dialogOpen = document.querySelector("[role='dialog'],[role='alertdialog']");
    if (dialogOpen) return;

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }, [pathname]);

  return null;
};

export default ScrollToTop;
