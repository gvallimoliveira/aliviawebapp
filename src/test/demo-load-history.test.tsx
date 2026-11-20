import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoadHistoryDialog from "@/components/dashboard/periodization/LoadHistoryDialog";
import { createDemoPeriodization } from "@/data/demoPeriodization";
import { localISODate } from "@/lib/periodization";

const db = vi.hoisted(() => ({ from: vi.fn(() => { throw new Error("Demo must not read live rows"); }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: db }));
vi.mock("@/components/dashboard/periodization/DailyLoadChart", () => ({ default: () => null }));
describe("demo load history", () => {
  it("opens and paginates local entries without any database read", () => {
    const fixture = createDemoPeriodization(localISODate(), "Maria Silva");
    render(<LoadHistoryDialog patientId={fixture.patientId} demoData={fixture} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver histórico" }));
    expect(screen.getByText(/Carga realizada no período/).textContent).not.toContain(" 0 sRPE");
    fireEvent.click(screen.getByRole("button", { name: "Mais antigos" }));
    expect(screen.getByText(/Carga realizada no período/).textContent).not.toContain(" 0 sRPE");
    expect(db.from).not.toHaveBeenCalled();
  });
});
