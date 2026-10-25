import { describe, expect, it } from "vitest";
import { createLatestRequestGate } from "@/lib/latestRequest";

describe("schedule request ordering", () => {
  it("ignores the old desktop week after the mobile range starts", () => {
    const gate = createLatestRequestGate();
    const desktop = gate.start();
    const mobile = gate.start();
    expect(desktop()).toBe(false);
    expect(mobile()).toBe(true);
  });
  it("rejects results after switching scope or unmounting", () => {
    const gate = createLatestRequestGate();
    const solo = gate.start();
    gate.invalidate();
    expect(solo()).toBe(false);
    expect(gate.start()()).toBe(true);
  });
});