import { deliver } from "./exportImage";

/** Entrega um .txt (share no mobile, download no desktop). */
export const exportTextFile = async (text: string, fileName: string) => {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const shared = await deliver(blob, fileName, "text/plain");
  return { shared };
};
