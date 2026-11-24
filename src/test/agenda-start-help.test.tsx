import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AgendaStartHelp from "@/components/onboarding/AgendaStartHelp";
import pt from "@/locales/pt.json";

vi.mock("@/contexts/LanguageContext", () => ({ useLanguage: () => ({ t: (key: string) => (pt as Record<string, string>)[key] ?? key }) }));
beforeEach(() => localStorage.clear());
afterEach(cleanup);

it("opens the existing appointment command rather than marking onboarding complete", () => {
  const onNew = vi.fn();
  render(<AgendaStartHelp scopeKey="user:clinic:a" appointments={[]} loading={false} hasError={false} canSchedule clinical onNew={onNew} />);
  fireEvent.click(screen.getByRole("button", { name: "Criar agendamento" }));
  expect(onNew).toHaveBeenCalledTimes(1);
  expect(localStorage.length).toBe(0);
});

it("dismisses only the clinical hint for this viewer and care scope", () => {
  const props = { appointments: [], loading: false, hasError: false, canSchedule: true, clinical: true, onNew: vi.fn() };
  const view = render(<AgendaStartHelp {...props} scopeKey="user:clinic:a" />);
  fireEvent.click(screen.getByRole("button", { name: "Dispensar dica da Agenda" }));
  expect(localStorage.getItem("alivia:agenda-tip:v1:user:clinic:a")).toBe("dismissed");
  expect(localStorage.getItem("alivia:agenda-tip:v1:user:clinic:b")).toBeNull();
  view.unmount();
  render(<AgendaStartHelp {...props} scopeKey="user:clinic:b" />);
  fireEvent.click(screen.getByRole("button", { name: "Dispensar dica da Agenda" }));
  expect(localStorage.getItem("alivia:agenda-tip:v1:user:clinic:b")).toBe("dismissed");
});