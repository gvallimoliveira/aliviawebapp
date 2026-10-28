import { describe, expect, it } from "vitest";
import { fallbackScreen, themedScreen } from "@/pages/studio/mockScreens";

describe("telas simuladas do Studio", () => {
  it("título sobre testes mostra tela de testes, não de relatório", () => {
    const s = themedScreen("Você sabe os testes. Tomar decisões com lógica", ["discharge-report"]);
    expect(s?.rows.map((r) => r.label)).toContain("Cluster de Laslett");
  });
  it("tela de reserva nunca repete o nome do público", () => {
    const s = fallbackScreen(
      [
        { tag: "FISIOTERAPEUTA AUTÔNOMO", title: "Agenda cheia sem planilha" },
        { tag: "FISIOTERAPEUTA AUTÔNOMO · COMO FUNCIONA", title: "Link de avaliação" },
        { tag: "RELATÓRIO DE ALTA", title: "Evolução" },
      ],
      ["FISIOTERAPEUTA AUTÔNOMO"],
    );
    const labels = s.rows.map((r) => r.label.toLowerCase());
    expect(labels.some((l) => l.includes("autônomo"))).toBe(false);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
