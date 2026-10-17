import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AnamnesisForm from "@/components/assessment/AnamnesisForm";

vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ language: "pt", t: (key: string) => key }) }));
vi.mock("@/hooks/useAutosaveDraft", () => ({ useAutosaveDraft: () => ({ hasDraft: false, discard: vi.fn(), restore: vi.fn() }) }));
vi.mock("@/components/assessment/PainMap", () => ({ default: ({ onRegionsChange }: { onRegionsChange: (ids: string[]) => void }) => <button onClick={() => onRegionsChange(["thoracic"])}>Historical thoracic site</button> }));
beforeEach(() => { vi.spyOn(window, "scrollTo").mockImplementation(() => {}); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("preventive anamnestic answers", () => {
  it("completes without painful areas and preserves health, posture goals and historical sites", () => {
    const onComplete = vi.fn();
    render(<AnamnesisForm mode="professional" onComplete={onComplete} onBack={vi.fn()} initialExtras={{ assessmentPurpose: "prevention", preventionGoals: ["posture"], hasPriorSurgery: "anamnesis.surgery.no", healthConditions: ["none"], usesContinuousMedication: "no", sex: "anamnesis.sex.female", ageRange: "anamnesis.age.25_34", activityLevel: "anamnesis.activity.regular", hasGymAccess: "anamnesis.gym.no" }} />);
    fireEvent.click(screen.getByRole("button", { name: "anamnesis.next" }));
    fireEvent.click(screen.getByRole("button", { name: "anamnesis.next" }));
    fireEvent.click(screen.getByRole("button", { name: "anamnesis.next" }));
    fireEvent.click(screen.getByRole("button", { name: "Historical thoracic site" }));
    fireEvent.click(screen.getByRole("button", { name: "anamnesis.next" }));
    fireEvent.click(screen.getByRole("button", { name: "anamnesis.next" }));
    fireEvent.click(screen.getByRole("button", { name: "anamnesis.next" }));
    fireEvent.click(screen.getByRole("button", { name: "anamnesis.finish" }));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onComplete.mock.calls[0][0]).toMatchObject({ assessmentPurpose: "prevention", preventionGoals: ["posture"], historyRegions: ["thoracic"], painScore: null, painRegions: [], healthConditions: ["none"], usesContinuousMedication: "no", activityLevel: "anamnesis.activity.regular" });
  });
  it("keeps the painful complaint required in the default flow", () => {
    const onComplete = vi.fn();
    render(<AnamnesisForm mode="professional" onComplete={onComplete} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "anamnesis.next" }));
    expect(screen.getByRole("button", { name: "anamnesis.next" })).toBeDisabled();
    expect(onComplete).not.toHaveBeenCalled();
  });
});