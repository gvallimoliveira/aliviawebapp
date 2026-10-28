import { describe, expect, it } from "vitest";
import { placeFeed, pillarOfKind, isFeedPreset, FEED_PRESET_MODELS, type FeedEntry } from "@/pages/studio-pro/feedPlan";

const art = (id: string, pillar: string, created: string, extra: Partial<FeedEntry> = {}): FeedEntry => ({
  id, kind: "art", pillar, created_at: created, scheduled_date: null, posted_at: null, ...extra,
});

describe("feed calendar", () => {
  it("orders saved arts by pillar rotation, not save order", () => {
    const placed = placeFeed(
      [art("c", "clean", "1"), art("s", "software", "2"), art("d", "dor", "3")],
      "2026-11-02", // segunda
    );
    expect(placed.map((p) => p.entry.id)).toEqual(["d", "s", "c"]);
    expect(placed.map((p) => p.date)).toEqual(["2026-11-02", "2026-11-04", "2026-11-06"]);
  });

  it("videos are extras and do not take a rotation slot", () => {
    const video: FeedEntry = { id: "v", kind: "video", pillar: null, created_at: "0", scheduled_date: "2026-11-03", posted_at: null };
    const placed = placeFeed([art("d", "dor", "1"), video], "2026-11-02");
    expect(placed.find((p) => p.entry.id === "v")?.extra).toBe(true);
    expect(placed.find((p) => p.entry.id === "d")?.date).toBe("2026-11-02");
  });

  it("maps block kinds and detects the preset", () => {
    expect(pillarOfKind("tutorial")).toBe("software");
    expect(pillarOfKind("hero")).toBeNull();
    expect(isFeedPreset([...FEED_PRESET_MODELS])).toBe(true);
    expect(isFeedPreset(["tutorial"])).toBe(false);
  });
});
