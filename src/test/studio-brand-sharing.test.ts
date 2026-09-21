import { describe, expect, it } from "vitest";
import {
  countOwnBrands,
  isOwnBrand,
  isSharedBrand,
  normalizeInviteEmail,
} from "@/pages/studio-pro/brandSharing";

describe("compartilhamento de marca", () => {
  it("normaliza o e-mail do convite e recusa formato inválido", () => {
    expect(normalizeInviteEmail("  Aline@Exemplo.COM ")).toBe("aline@exemplo.com");
    expect(normalizeInviteEmail("aline")).toBeNull();
    expect(normalizeInviteEmail("")).toBeNull();
  });

  it("distingue marca própria de marca recebida", () => {
    const own = { id: "a", user_id: "u1" };
    const shared = { id: "b", user_id: "u2" };
    expect(isOwnBrand(own, "u1")).toBe(true);
    expect(isSharedBrand(own, "u1")).toBe(false);
    expect(isOwnBrand(shared, "u1")).toBe(false);
    expect(isSharedBrand(shared, "u1")).toBe(true);
  });

  it("limite do plano conta só as marcas próprias", () => {
    const brands = [
      { id: "a", user_id: "u1" },
      { id: "b", user_id: "u2" },
      { id: "c", user_id: "u1" },
    ];
    expect(countOwnBrands(brands, "u1")).toBe(2);
    expect(countOwnBrands(brands, "u2")).toBe(1);
  });
});
