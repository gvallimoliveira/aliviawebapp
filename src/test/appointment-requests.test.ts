import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { formatRequestCreatedAt, oldestRequestsFirst } from "@/lib/appointmentRequests";

describe("appointment request arrival order", () => {
  it("prioritizes the oldest request, not the earliest appointment date, without dropping requests", () => {
    const requests = [
      { id: "recent", created_at: "2026-10-28T09:15:00Z", requested_date: "2026-10-29" },
      { id: "oldest", created_at: "2026-10-27T23:30:00Z", requested_date: "2026-11-05" },
      { id: "middle", created_at: "2026-10-28T09:00:00Z", requested_date: "2026-10-30" },
      { id: "latest", created_at: "2026-10-28T09:20:00Z", requested_date: "2026-10-29" },
    ];
    expect(oldestRequestsFirst(requests).map((r) => r.id)).toEqual(["oldest", "middle", "recent", "latest"]);
    expect(requests[0].id).toBe("recent");
  });

  it("keeps deterministic ordering when two requests share the same timestamp", () => {
    expect(oldestRequestsFirst([
      { id: "b", created_at: "2026-10-28T09:00:00Z" },
      { id: "a", created_at: "2026-10-28T09:00:00Z" },
    ]).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("preserves the request's local calendar day and exact time in Brazil", () => {
    const formatted = formatRequestCreatedAt("2026-10-28T01:20:35Z");
    expect(formatted).toContain("27/10/2026");
    expect(formatted).toContain("22:20:35");
  });
});