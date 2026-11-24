import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PatientListView from "@/components/dashboard/patient-evolution/PatientListView";

vi.mock("@/components/dashboard/AddPatientModal", () => ({ default: () => null }));
vi.mock("@/components/dashboard/ManualAssessmentModal", () => ({ default: () => null }));

const record = (id: string, name: string, email: string) => ({
  id,
  full_name: name,
  email,
  cpf: `11111111${id}`,
  phone: `99999${id}`,
});

const patients = [
  { groupKey: "ana", name: "Ana Bezerra", email: "ana@x.com", lastDate: "2026-01-05T12:00:00Z", patientRecord: record("1", "Ana Bezerra", "ana@x.com"), assessments: [] },
  { groupKey: "bruno", name: "Bruno Lima", email: "bruno@x.com", lastDate: "2026-03-05T12:00:00Z", patientRecord: record("2", "Bruno Lima", "bruno@x.com"), assessments: [] },
  { groupKey: "carla", name: "Carla Dias", email: "carla@x.com", lastDate: "2026-10-20T12:00:00Z", patientRecord: record("3", "Carla Dias", "carla@x.com"), assessments: [] },
];

function renderList(searchQuery = "") {
  const noop = vi.fn();
  const props = {
    t: (key: string) => key,
    language: "pt",
    patients,
    hiddenKeys: new Set<string>(),
    showHidden: false,
    setShowHidden: noop,
    statusFilter: "all",
    setStatusFilter: noop,
    searchQuery,
    setSearchQuery: noop,
    readOnly: false,
    canAddPatient: false,
    allowManualAssessment: false,
    allowAssessmentLink: false,
    allowQuickNote: false,
    setEditPatientData: noop,
    setAddPatientOpen: noop,
    batchExporting: false,
    handleBatchExport: noop,
    assessments: [],
    exerciseAdherence: {},
    handleAcquireBadgeClick: noop,
    longPressFiredRef: { current: false },
    longPressTimerRef: { current: null },
    setLongPressPatient: noop,
    setSelectedEmail: noop,
    handleRestorePatient: noop,
    handleArchivePatient: noop,
    archiving: null,
    ensurePatientAssessmentToken: vi.fn(async () => "token"),
    buildPersonalizedAssessmentLink: () => "https://aliviawebapp.com.br/a/token",
    professionalId: "pro-1",
    clinicId: null,
    toast: noop,
    setQuickNotePatient: noop,
    setQuickNoteContent: noop,
    addPatientOpen: false,
    setAddPatientOpenState: noop,
    editPatientData: null,
    manualAssessmentTarget: null,
    setManualAssessmentTarget: noop,
    quickNotePatient: null,
    setQuickNotePatientState: noop,
    quickNoteContent: "",
    setQuickNoteContentState: noop,
    handleQuickNoteSave: noop,
    quickNoteSaving: false,
    longPressPatient: null,
    setLongPressPatientState: noop,
    deleteConfirmPatient: null,
    setDeleteConfirmPatient: noop,
    deletingPatient: false,
    handleDeletePatient: noop,
    isDemo: false,
  };
  const view = render(<PatientListView {...(props as any)} />);
  const order = () =>
    Array.from(view.container.querySelectorAll("p.font-semibold")).map((el) => el.textContent?.trim());
  return { ...view, order };
}

describe("patient list default ordering", () => {
  it("opens showing the most recently attended patient first", () => {
    const { order } = renderList();
    expect(order()).toEqual(["Carla Dias", "Bruno Lima", "Ana Bezerra"]);
  });

  it("switches to alphabetical order when A-Z is chosen", () => {
    const { order } = renderList();
    fireEvent.click(screen.getByTitle("Ordem alfabética"));
    expect(order()).toEqual(["Ana Bezerra", "Bruno Lima", "Carla Dias"]);
  });

  it("keeps the most recent first after switching back from A-Z", () => {
    const { order } = renderList();
    fireEvent.click(screen.getByTitle("Ordem alfabética"));
    fireEvent.click(screen.getByTitle("Avaliação mais recente"));
    expect(order()).toEqual(["Carla Dias", "Bruno Lima", "Ana Bezerra"]);
  });

  it("finds a full patient name with spaces", () => {
    expect(renderList("Ana Bezerra").order()).toEqual(["Ana Bezerra"]);
  });

  it("keeps CPF and phone searches ignoring formatting", () => {
    expect(renderList("111.111.111").order()).toEqual(["Ana Bezerra"]);
  });
});
