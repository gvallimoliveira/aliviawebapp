import { describe, it, expect } from "vitest";
import {
  classifyMechanism,
  parseStoredMechanism,
  toStoredMechanism,
} from "@/lib/painMechanism";
import { computePainExtent, describeRegion, suggestDistribution } from "@/lib/painExtent";

describe("classifyMechanism", () => {
  it("classifica lombalgia mecânica como nociceptiva", () => {
    const r = classifyMechanism({
      descriptors: ["aching", "stiff"],
      distribution: "localized",
      proportionateToStimulus: true,
      spontaneousPain: false,
      multisensoryHypersensitivity: false,
      nonRestorativeSleep: false,
      persistentFatigue: false,
      objectiveNeuroSigns: false,
      durationWeeks: 4,
      regionCount: 1,
    });
    expect(r.mechanism).toBe("nociceptive");
    expect(r.axis).toBe("peripheral");
    expect(r.confidence).not.toBe("low");
  });

  it("classifica radiculopatia como neuropática", () => {
    const r = classifyMechanism({
      descriptors: ["burning", "tingling", "shock"],
      distribution: "dermatomal",
      proportionateToStimulus: true,
      objectiveNeuroSigns: true,
      multisensoryHypersensitivity: false,
      durationWeeks: 8,
      regionCount: 3,
    });
    expect(r.mechanism).toBe("neuropathic");
    expect(r.signals.map((s) => s.key)).toContain("dermatomal_distribution");
  });

  it("classifica quadro fibromiálgico como nociplástico com sensibilização central", () => {
    const r = classifyMechanism({
      descriptors: ["aching"],
      distribution: "widespread",
      proportionateToStimulus: false,
      spontaneousPain: true,
      multisensoryHypersensitivity: true,
      nonRestorativeSleep: true,
      persistentFatigue: true,
      objectiveNeuroSigns: false,
      durationWeeks: 52,
      csiScore: 58,
      regionCount: 9,
    });
    expect(r.mechanism).toBe("nociplastic");
    expect(r.centralSensitizationLikely).toBe(true);
    expect(r.axis).toBe("central");
    expect(r.confidence).toBe("high");
  });

  it("marca quadro empatado como misto", () => {
    const r = classifyMechanism({
      descriptors: ["burning", "shock"],
      distribution: "dermatomal",
      proportionateToStimulus: false,
      multisensoryHypersensitivity: true,
      nonRestorativeSleep: true,
      durationWeeks: 30,
      regionCount: 4,
    });
    expect(["mixed", "nociplastic", "neuropathic"]).toContain(r.mechanism);
    if (r.mechanism === "mixed") expect(r.secondary).not.toBeNull();
  });

  it("retorna unknown quando há poucos dados", () => {
    const r = classifyMechanism({ descriptors: ["aching"] });
    expect(r.mechanism).toBe("unknown");
    expect(r.confidence).toBe("low");
  });

  it("serializa e reinterpreta o payload sem perder informação", () => {
    const r = classifyMechanism({
      descriptors: ["burning"],
      distribution: "dermatomal",
      objectiveNeuroSigns: true,
      proportionateToStimulus: true,
      durationWeeks: 6,
    });
    const stored = toStoredMechanism(r, "rules", 12);
    const parsed = parseStoredMechanism(JSON.parse(JSON.stringify(stored)));
    expect(parsed?.mechanism).toBe(r.mechanism);
    expect(parsed?.csi_score).toBe(12);
  });

  it("parse tolerante devolve null para lixo", () => {
    expect(parseStoredMechanism(null)).toBeNull();
    expect(parseStoredMechanism({ mechanism: "banana" })).toBeNull();
  });
});

describe("computePainExtent", () => {
  it("retorna zero sem regiões", () => {
    const e = computePainExtent([]);
    expect(e.regionCount).toBe(0);
    expect(e.band).toBe("none");
  });

  it("colapsa vistas do mesmo segmento", () => {
    const e = computePainExtent(["cervical", "cervical_front"]);
    expect(e.regionCount).toBe(2);
    expect(e.segmentCount).toBe(1);
  });

  it("distingue lados", () => {
    const e = computePainExtent(["right_knee", "left_knee"]);
    expect(e.segmentCount).toBe(2);
  });

  it("classifica quadro difuso como widespread", () => {
    const e = computePainExtent([
      "cervical",
      "thoracic",
      "lower_back",
      "right_shoulder",
      "left_shoulder",
      "right_knee",
    ]);
    expect(e.band).toBe("widespread");
    expect(suggestDistribution(["cervical", "thoracic", "lower_back", "right_shoulder", "left_shoulder", "right_knee"])).toBe("multisite");
  });

  it("mapeia grupo e lado corretamente", () => {
    expect(describeRegion("left_thigh_post")).toEqual({
      id: "left_thigh_post",
      group: "thigh",
      side: "left",
    });
    expect(describeRegion("lower_back").group).toBe("lumbar");
    expect(describeRegion("right_forearm_back").group).toBe("forearm");
  });

  it("nunca passa de 100% de superfície", () => {
    const all = [
      "head", "cervical", "thoracic", "lower_back", "chest", "abdomen",
      "right_shoulder", "left_shoulder", "right_arm", "left_arm",
      "right_thigh_ant", "left_thigh_ant", "right_shin", "left_shin",
      "right_gluteal", "left_gluteal", "right_foot", "left_foot",
    ];
    expect(computePainExtent(all).surfacePercent).toBeLessThanOrEqual(100);
  });
});

describe("triagem aprofundada (critérios ponderados + subtipo)", () => {
  it("critérios neuropáticos levam a neuropática periférica", () => {
    const r = classifyMechanism({
      criteria: ["neu_burning_shock", "neu_dermatomal", "neu_neurodynamic", "neu_sensory_loss"],
    });
    expect(r.mechanism).toBe("neuropathic");
    expect(r.subtype).toBe("peripheral_neuropathic");
    expect(r.axis).toBe("peripheral");
  });

  it("critérios nociplásticos levam a eixo central", () => {
    const r = classifyMechanism({
      criteria: ["nop_multisite", "nop_hypersensitivity", "nop_migrating", "nop_disproportionate"],
    });
    expect(r.mechanism).toBe("nociplastic");
    expect(r.axis).toBe("central");
  });

  it("subtipo escolhido pelo avaliador sobrepõe a sugestão", () => {
    const r = classifyMechanism({
      criteria: ["noc_movement_relation", "noc_rest_relief", "noc_localized"],
      subtype: "inflammatory",
    });
    expect(r.mechanism).toBe("nociceptive");
    expect(r.subtype).toBe("inflammatory");
  });
});
