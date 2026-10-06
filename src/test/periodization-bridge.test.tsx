import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BridgeCard from "@/components/dashboard/periodization/BridgeCard";

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/getPublicOrigin", () => ({ getPublicOrigin: () => "https://example.test" }));
vi.mock("@/lib/periodizationData", () => ({
  addRestriction: vi.fn(), createLink: vi.fn(), deleteRestriction: vi.fn(), revokeLink: vi.fn(),
}));

describe("check-in link inside patient form", () => {
  it("copies the existing link without submitting or refreshing the record", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const changed = vi.fn();
    render(<form onSubmit={submit}>
      <BridgeCard patientId="patient" restrictions={[]} onChanged={changed} links={[
        { id: "link", token: "test-token", audience: "patient", active: true } as any,
      ]} />
    </form>);
    fireEvent.click(screen.getByRole("button", { name: "Copiar link de check-in" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://example.test/carga/test-token"));
    expect(submit).not.toHaveBeenCalled();
    expect(changed).not.toHaveBeenCalled();
    for (const button of screen.getAllByRole("button")) expect(button.getAttribute("type")).toBe("button");
  });
});