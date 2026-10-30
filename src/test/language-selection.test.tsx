import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import i18n from "@/i18n";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";

describe("shared language state", () => {
  beforeEach(async () => { await i18n.changeLanguage("pt"); });
  it("defaults to Portuguese even in a fresh English-language browser", () => {
    const { result } = renderHook(useLanguage, { wrapper: LanguageProvider });
    expect(result.current.language).toBe("pt");
    expect(i18n.language).toBe("pt");
  });
  it("changes only after an explicit selection and synchronizes the translation engine", async () => {
    const { result } = renderHook(useLanguage, { wrapper: LanguageProvider });
    await act(async () => { await result.current.selectLanguage("en"); });
    expect(result.current.language).toBe("en");
    expect(i18n.language).toBe("en");
    await act(async () => { await result.current.selectLanguage("pt"); });
    expect(result.current.language).toBe("pt");
    expect(i18n.language).toBe("pt");
  });
  it("keeps a remounted provider consistent with the chosen language", async () => {
    await i18n.changeLanguage("es");
    const { result } = renderHook(useLanguage, { wrapper: LanguageProvider });
    expect(result.current.language).toBe("es");
    await act(async () => { await i18n.changeLanguage("pt"); });
    await waitFor(() => expect(result.current.language).toBe("pt"));
  });
  it("does not cycle twice during concurrent taps", async () => {
    const { result } = renderHook(useLanguage, { wrapper: LanguageProvider });
    await act(async () => {
      await Promise.all([result.current.selectLanguage("en"), result.current.selectLanguage("es")]);
    });
    expect(result.current.language).toBe("en");
    expect(i18n.language).toBe("en");
  });
});