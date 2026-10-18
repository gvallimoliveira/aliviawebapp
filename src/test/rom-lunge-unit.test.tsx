import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RomTable, { createInitialRomRows } from "@/components/assessment/RomTable";

afterEach(cleanup);

describe("lunge measurement selection", () => {
  it.each(["pt", "en", "es"])("creates a degree-based measurement in %s without changing existing values", lang => {
    const onChange = vi.fn();
    const existing = { joint: "Lunge (cm)", leftValue: "10 cm", rightValue: "12 cm" };
    render(<RomTable lang={lang} value={[existing, ...createInitialRomRows(1)]} onChange={onChange} disableImport />);
    fireEvent.click(screen.getByRole("button", { name: /lunge/i }));
    const saved = onChange.mock.calls[0][0];
    expect(saved[0]).toEqual(existing);
    expect(saved[1].joint.match(/\(([^)]+)\)$/)?.[1]).toBe("°");
    expect(saved[1].leftValue).toBe("");
    expect(saved[1].rightValue).toBe("");
  });
});