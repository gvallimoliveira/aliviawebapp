import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

const mocks = vi.hoisted(() => ({ toast: vi.fn(), handlers: new Map<string, (p: any) => Promise<void> | void>() }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn(), useLocation: () => ({ pathname: "/dashboard", search: "" }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "professional-user" } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => ({ select: () => ({ eq: () => table === "professionals"
    ? { maybeSingle: async () => ({ data: { id: "pro" } }) }
    : Promise.resolve({ data: [{ id: "saved-assessment", status: "completed" }, { id: "pending-assessment", status: "in_progress" }] }) }) }),
  channel: () => {
    const channel = { on: (_: string, filter: any, callback: any) => { mocks.handlers.set(`${filter.table}:${filter.event}`, callback); return channel; }, subscribe: () => channel };
    return channel;
  },
  removeChannel: vi.fn(),
} }));
beforeEach(() => { mocks.handlers.clear(); mocks.toast.mockClear(); });
afterEach(cleanup);
async function listen() {
  renderHook(() => useRealtimeNotifications());
  await waitFor(() => expect(mocks.handlers.has("assessments:UPDATE")).toBe(true));
  const callback = mocks.handlers.get("assessments:UPDATE");
  if (!callback) throw new Error("listener missing");
  return callback;
}
describe("realtime completion with missing old payload", () => {
  it("does not toast when saving an impression on an existing completed row", async () => {
    const update = await listen();
    await update({ old: {}, new: { id: "saved-assessment", status: "completed", diagnosis: { clinicalImpression: { overview: "saved" } } } });
    expect(mocks.toast).not.toHaveBeenCalled();
  });
  it("announces actual completion once, then ignores later impression edits", async () => {
    const update = await listen();
    const event = { old: {}, new: { id: "pending-assessment", status: "completed" } };
    await update(event); await update(event);
    expect(mocks.toast).toHaveBeenCalledTimes(1);
  });
  it("tracks a newly inserted in-progress assessment without announcing its creation", async () => {
    const update = await listen();
    const insert = mocks.handlers.get("assessments:INSERT");
    if (!insert) throw new Error("insert listener missing");
    await insert({ new: { id: "new-assessment", status: "in_progress" } });
    expect(mocks.toast).not.toHaveBeenCalled();
    await update({ old: {}, new: { id: "new-assessment", status: "completed" } });
    expect(mocks.toast).toHaveBeenCalledTimes(1);
  });
});