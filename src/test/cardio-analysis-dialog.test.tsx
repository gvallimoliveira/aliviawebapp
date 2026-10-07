import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CardioAnalysisDialog from "@/components/dashboard/periodization/CardioAnalysisDialog";

vi.mock("@/components/dashboard/periodization/CardioAnalysisPanel", () => ({ default: () => <div>Gráficos cardiovasculares</div> }));

describe("cardiovascular dialog", () => {
  it("mantém análise fora do prontuário e abre/fecha sem submeter o formulário", () => {
    const submit = vi.fn((event) => event.preventDefault());
    render(<form onSubmit={submit}><CardioAnalysisDialog patientId="patient" plan={null} entries={[]} patientName="Paciente teste" /></form>);
    expect(screen.queryByText("Gráficos cardiovasculares")).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: "Análise cardiovascular e relatório" });
    expect(trigger).toHaveAttribute("type", "button");
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Gráficos cardiovasculares")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });
});