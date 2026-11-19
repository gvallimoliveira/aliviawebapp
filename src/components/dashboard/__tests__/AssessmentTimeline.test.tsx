import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AssessmentTimeline from "../AssessmentTimeline";

const list = [
  { id: "old", created_at: "2026-08-21T10:00:00Z", pain_score: 6, pain_regions: [] },
  { id: "new", created_at: "2026-11-19T10:00:00Z", pain_score: 4, pain_regions: [] },
];

describe("Linha do tempo", () => {
  it("mostra a atual primeiro e seleciona sem abrir relatório", () => {
    const onSelect = vi.fn(); const onOpenReport = vi.fn();
    render(<AssessmentTimeline assessments={list as any} onSelect={onSelect} onOpenReport={onOpenReport} />);
    const cards = screen.getAllByRole("button", { pressed: undefined }).filter((b) => b.getAttribute("aria-pressed") !== null);
    expect(cards[0].textContent).toContain("Atual");
    fireEvent.click(cards[1]);
    expect(onSelect).toHaveBeenCalledWith("old");
    expect(onOpenReport).not.toHaveBeenCalled();
  });
});
