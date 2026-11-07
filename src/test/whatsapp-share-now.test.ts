import { afterEach, describe, expect, it, vi } from "vitest";
import { shareTextNowOrOpenWhatsApp } from "@/lib/whatsappShare";

const setPointer = (coarse: boolean) => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: coarse }) as any;
};

afterEach(() => {
  vi.restoreAllMocks();
  delete (navigator as any).share;
});

describe("shareTextNowOrOpenWhatsApp", () => {
  it("opens the native share sheet synchronously on touch devices", () => {
    setPointer(true);
    const share = vi.fn().mockResolvedValue(undefined);
    (navigator as any).share = share;
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    shareTextNowOrOpenWhatsApp("Seu programa: https://x/hep/1", "Programa de exercícios");
    expect(share).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledWith({ title: "Programa de exercícios", text: "Seu programa: https://x/hep/1" });
    expect(open).not.toHaveBeenCalled();
  });

  it("opens WhatsApp with prefilled text on desktop", () => {
    setPointer(false);
    (navigator as any).share = vi.fn();
    const open = vi.spyOn(window, "open").mockReturnValue({} as Window);
    shareTextNowOrOpenWhatsApp("Olá");
    expect(open).toHaveBeenCalledWith("https://wa.me/?text=Ol%C3%A1", "_blank");
    expect((navigator as any).share).not.toHaveBeenCalled();
  });
});
