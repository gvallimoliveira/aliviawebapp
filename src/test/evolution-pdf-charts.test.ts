import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import {
  buildLongitudinalSeries,
  generateEvolutionPdfBlob,
  type EvolutionSummary,
} from "@/utils/generatePdf";

describe("buildLongitudinalSeries", () => {
  const base = [
    {
      date: "2026-08-10T12:00:00Z",
      romTable: [
        { joint: "Rot. Int. Quadril", leftValue: "17°", rightValue: "23°" },
        { joint: "Flexão de joelho", leftValue: "110", rightValue: "112" },
      ],
      strengthTable: [
        {
          movement: "abd quadril",
          leftValue: "12",
          rightValue: "14",
          leftTrials: [{ value: "11" }, { value: "13" }],
          rightTrials: [{ value: "14" }, { value: "14" }],
        },
      ],
    },
    {
      date: "2026-08-20T12:00:00Z",
      romTable: [
        { joint: "rotação interna de quadril", leftValue: "19", rightValue: "24" },
        { joint: "Ext. Joelho", leftValue: "0", rightValue: "2" },
      ],
      strengthTable: [
        { movement: "Abdução de Quadril", leftValue: "13", rightValue: "15" },
      ],
    },
    {
      date: "2026-08-24T12:00:00Z",
      romTable: [{ joint: "rot int quadril", leftValue: "21°", rightValue: "26°" }],
      strengthTable: [],
    },
  ];

  it("agrupa variantes de escrita/abreviação na mesma série de ADM", () => {
    const series = buildLongitudinalSeries(base, "rom", "pt-BR");
    const hip = series.find((s) => s.points.length === 3);
    expect(hip).toBeTruthy();
    // longest label wins for display
    expect(hip!.label).toBe("rotação interna de quadril");
    expect(hip!.points.map((p) => p.esq)).toEqual([17, 19, 21]);
    expect(hip!.points.map((p) => p.dir)).toEqual([23, 24, 26]);
    // datas em pt-BR abreviado
    expect(hip!.points[0].dateLabel).toContain("ago");
  });

  it("usa a média das tentativas na dinamometria e agrupa variantes", () => {
    const series = buildLongitudinalSeries(base, "strength", "pt-BR");
    expect(series).toHaveLength(1);
    expect(series[0].label).toBe("Abdução de Quadril");
    expect(series[0].points[0].esq).toBe(12); // mean(11,13)
    expect(series[0].points[0].dir).toBe(14); // mean(14,14)
    expect(series[0].points[1].esq).toBe(13);
  });

  it("ignora movimentos com menos de 2 medições numéricas", () => {
    const single = [
      { date: "2026-08-10T12:00:00Z", romTable: [{ joint: "Flexão de ombro", leftValue: "150", rightValue: "150" }] },
      { date: "2026-08-20T12:00:00Z", romTable: [{ joint: "Flexão de ombro", leftValue: "", rightValue: "" }] },
    ];
    expect(buildLongitudinalSeries(single, "rom", "pt-BR")).toHaveLength(0);
  });

  it("ordena avaliações fora de ordem cronologicamente", () => {
    const shuffled = [base[2], base[0], base[1]];
    const series = buildLongitudinalSeries(shuffled, "rom", "pt-BR");
    const hip = series.find((s) => s.points.length === 3)!;
    expect(hip.points.map((p) => p.esq)).toEqual([17, 19, 21]);
  });
});

describe("generateEvolutionPdfBlob — gráficos longitudinais", () => {
  it("gera PDF com seções de evolução de ADM e dinamometria", async () => {
    const summary: EvolutionSummary = {
      narrative: "Paciente apresenta evolução favorável da mobilidade de quadril ao longo das avaliações.",
      painChange: "Dor reduziu de 7 para 3.",
      conclusion: "Evolução satisfatória, manter plano.",
      recommendation: "continue",
    };
    const blob = await generateEvolutionPdfBlob({
      patientName: "Paciente Teste",
      firstAssessment: {
        date: "2026-08-10T12:00:00Z",
        pain_score: 7,
        pain_regions: [],
        test_results: [],
        hypothesis: "Síndrome do impacto de quadril",
      },
      lastAssessment: {
        date: "2026-08-24T12:00:00Z",
        pain_score: 3,
        pain_regions: [],
        test_results: [],
        hypothesis: "Síndrome do impacto de quadril",
        romTable: [{ joint: "rot int quadril", leftValue: "21°", rightValue: "26°" }],
      },
      longitudinalAssessments: [
        {
          date: "2026-08-10T12:00:00Z",
          romTable: [{ joint: "Rot. Int. Quadril", leftValue: "17°", rightValue: "23°" }],
          strengthTable: [{ movement: "abd quadril", leftValue: "12", rightValue: "14" }],
        },
        {
          date: "2026-08-17T12:00:00Z",
          romTable: [{ joint: "rotação interna de quadril", leftValue: "19", rightValue: "24" }],
          strengthTable: [{ movement: "Abdução de Quadril", leftValue: "13", rightValue: "15" }],
        },
        {
          date: "2026-08-24T12:00:00Z",
          romTable: [{ joint: "rot int quadril", leftValue: "21°", rightValue: "26°" }],
          strengthTable: [{ movement: "Abdução de Quadril", leftValue: "14", rightValue: "16" }],
        },
      ],
      totalAssessments: 3,
      summary,
      language: "pt",
    });
    expect(blob.size).toBeGreaterThan(10000);
    // Dump for visual QA (pdftoppm) — jsdom Blob has no arrayBuffer()
    const buf = await new Promise<Buffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(Buffer.from(reader.result as ArrayBuffer));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blob);
    });
    writeFileSync("/tmp/evolution-charts-qa.pdf", buf);
  }, 30000);
});
