import { useEffect, useState } from "react";
import { readThumbs, THUMBS_EVENT } from "./thumbs";

/** Mantém as miniaturas dos favoritos sincronizadas com o localStorage. */
export const useStudioThumbs = () => {
  const [thumbs, setThumbs] = useState<Record<string, string>>(readThumbs);

  useEffect(() => {
    const sync = () => setThumbs(readThumbs());
    window.addEventListener(THUMBS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(THUMBS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return thumbs;
};
