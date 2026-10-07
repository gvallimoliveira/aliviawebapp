import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DoseAdherenceCard from "@/components/dashboard/periodization/DoseAdherenceCard";

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/periodizationData", () => ({ savePlannedDose: vi.fn() }));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ data }: any) => <div data-testid="dose-chart">{JSON.stringify(data)}</div>,
  Bar: () => null, CartesianGrid: () => null, Legend: () => null,
  Tooltip: () => null, XAxis: () => null, YAxis: () => null,
}));

afterEach(() => { cleanup(); vi.useRealTimers(); });

const sessions = [
  { id: "monday", session_date: "2026-10-05", track: "physio", planned_duration_min: 50, planned_rpe: 8 },
  { id: "thursday", session_date: "2026-10-08", track: "physio", planned_duration_min: 50, planned_rpe: 7 },
  { id: "gym", session_date: "2026-10-05", track: "gym", planned_duration_min: 30, planned_rpe: 6 },
];

function show(rpe = 8, extras = false) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 6, 12));
  const entries = [{ session_id: "monday", session_date: "2026-10-05", track: "physio", duration_min: 50, rpe }];
  if (extras) entries.push({ session_id: "extra", session_date: "2026-10-06", track: "physio", duration_min: 20, rpe: 5 });
  render(<DoseAdherenceCard patientId="test" sessions={sessions as any} entries={entries as any} onChanged={vi.fn()} readOnly />);
}

describe("weekly totals versus partial dose comparison", () => {
  it("shows full targets, 1/2 track coverage and keeps the chart at 400 versus 400", () => {
    show();
    expect(screen.getByText("Semana: planejado 750 · Real 400")).toBeInTheDocument();
    expect(screen.getByText("Dose certa (1/2 sessões semanais)")).toBeInTheDocument();
    expect(screen.getByText("Dose certa (1/3 sessões semanais)")).toBeInTheDocument();
    expect(screen.getByTestId("dose-chart").textContent).toContain('"Planejado":400,"Percebido":400');
    expect(screen.getByText("Sem comparação (0/1 sessões semanais)")).toBeInTheDocument();
    expect(screen.getByText("Total planejado da semana").parentElement?.textContent).toContain("930");
  });
  it("labels partial underdose without treating upcoming sessions as zero", () => {
    show(6);
    expect(screen.getByText("Subdosado (1/2 sessões semanais)")).toBeInTheDocument();
    expect(screen.getByTestId("dose-chart").textContent).toContain('"Planejado":400,"Percebido":300');
  });
  it("includes extra real work only in the weekly total, not the comparison", () => {
    show(8, true);
    expect(screen.getByText("Semana: planejado 750 · Real 500")).toBeInTheDocument();
    expect(screen.getByText("Total real registrado até hoje").parentElement?.textContent).toContain("500");
    expect(screen.getByTestId("dose-chart").textContent).toContain('"Planejado":400,"Percebido":400');
  });
});