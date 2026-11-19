import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import QuestionnaireAnswersView from "../QuestionnaireAnswersView";

describe("QuestionnaireAnswersView", () => {
  it("highlights the patient's chosen option", () => {
    render(<QuestionnaireAnswersView isPt result={{ questionnaireId: "faos", questionnaireName: "FAOS", answers: { faos_s1: 3 }, subscaleScores: {}, totalScore: 0, maxScore: 0, percentageScore: 22, interpretation_pt: "", interpretation_en: "", severity: "" }} />);
    expect(screen.getByText("Você tem inchaço no pé/tornozelo?")).toBeTruthy();
    const chosen = document.querySelectorAll(".bg-primary");
    expect(chosen.length).toBe(1);
  });
});
