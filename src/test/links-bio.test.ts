import { describe, expect, it } from "vitest";
import { bioHref, BIO_WHATSAPP } from "@/pages/links/linksBioData";

describe("Instagram bio destinations", () => {
  it.each(["/profissionais", "/clinica", "/academico", "/para-pacientes"])("preserves the destination and attribution for %s", (path) => {
    const url = new URL(bioHref(path), "https://aliviawebapp.com.br");
    expect(url.pathname).toBe(path);
    expect(Object.fromEntries(url.searchParams)).toEqual({ utm_source: "instagram", utm_medium: "bio", utm_campaign: "links" });
  });
  it("opens the approved contact with a predefined message", () => {
    const url = new URL(BIO_WHATSAPP);
    expect(url.pathname).toBe("/5521993003358");
    expect(url.searchParams.get("text")).toBe("Olá! Vim pelo Instagram do Aliv.iA e gostaria de tirar dúvidas.");
  });
});