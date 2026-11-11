import { describe, it, expect } from "vitest";
import { slotRowHeight, crowdedSlotPosition, serviceFilterKey, CROWDED_ROW_PX } from "@/lib/appointmentTime";
import { appendDictated } from "@/hooks/useDictation";

describe("agenda crowded slots", () => {
  it("keeps 1-2 appointments in a normal row", () => {
    expect(slotRowHeight(2, 48)).toBe(48);
    expect(crowdedSlotPosition(1, 2)).toBeNull();
  });
  it("3 appointments: 2 on top, 1 below, row grows", () => {
    expect(slotRowHeight(3, 48)).toBe(2 * CROWDED_ROW_PX);
    expect(crowdedSlotPosition(0, 3)).toMatchObject({ col: 0, row: 0 });
    expect(crowdedSlotPosition(1, 3)).toMatchObject({ col: 1, row: 0 });
    expect(crowdedSlotPosition(2, 3)).toMatchObject({ col: 0, row: 1 });
  });
  it("4 appointments: 2x2 within the same hour", () => {
    expect(crowdedSlotPosition(3, 4)).toMatchObject({ col: 1, row: 1 });
    expect(slotRowHeight(4, 48)).toBe(2 * CROWDED_ROW_PX);
  });
});

describe("custom service filter", () => {
  it("filters custom services by catalog id, others by type", () => {
    expect(serviceFilterKey({ service_type: "personalizado", service_id: "abc" })).toBe("svc:abc");
    expect(serviceFilterKey({ service_type: "pilates", service_id: "abc" })).toBe("pilates");
    expect(serviceFilterKey({})).toBe("fisioterapia");
  });
});

describe("dictation append", () => {
  it("adds dictated text without erasing typed evolution", () => {
    const out = appendDictated("Paciente sem dor", "realizou agachamento");
    expect(out.startsWith("Paciente sem dor")).toBe(true);
    expect(out).toContain("realizou agachamento");
  });
});
