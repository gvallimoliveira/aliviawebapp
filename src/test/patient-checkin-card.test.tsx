import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PatientCheckinCard from "@/components/dashboard/PatientCheckinCard";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
vi.mock("@/pages/PeriodizationCheckin", () => ({ default: ({ token }: { token: string }) => <form aria-label="Patient check-in" data-token={token} /> }));

afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe("check-in card on a personal dashboard", () => {
  it("hides the optional card when the server returns the normal no-patient response", async () => {
    invoke.mockResolvedValue({ data: { token: null }, error: null });
    const { container } = render(<PatientCheckinCard />);
    await waitFor(() => expect(container.firstChild).toBeNull());
    expect(invoke).toHaveBeenCalledWith("periodization-checkin", { body: { action: "my_link" } });
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("opens the existing check-in with the server-authorized patient token", async () => {
    invoke.mockResolvedValue({ data: { token: "authorized-patient-token" }, error: null });
    render(<PatientCheckinCard />);
    fireEvent.click(await screen.findByRole("button", { expanded: false }));
    expect(screen.getByRole("form")).toHaveAttribute("data-token", "authorized-patient-token");
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("does not crash the dashboard if the request fails", async () => {
    invoke.mockRejectedValue(new Error("connection failed"));
    const { container } = render(<PatientCheckinCard />);
    await waitFor(() => expect(container.firstChild).toBeNull());
    expect(screen.queryByRole("form")).toBeNull();
  });
});