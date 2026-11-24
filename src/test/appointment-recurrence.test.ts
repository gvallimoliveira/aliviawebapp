import { describe, it, expect } from "vitest";
import { expandRecurrence, planRecurrenceDates } from "@/lib/appointmentRecurrence";

describe("appointment recurrence", () => {
  it("weekly for 10 sessions", () => {
    const d = expandRecurrence("2026-10-23", { freq: "weekly", count: 10 });
    expect(d.length).toBe(10);
    expect(d[1]).toBe("2026-10-30");
    expect(d[9]).toBe("2026-12-25");
  });
  it("chosen weekdays (mon + wed)", () => {
    expect(expandRecurrence("2026-10-26", { freq: "weekdays", days: [1, 3], count: 4 }))
      .toEqual(["2026-10-26", "2026-10-28", "2026-11-02", "2026-11-04"]);
  });
  it("biweekly", () => {
    expect(expandRecurrence("2026-10-23", { freq: "biweekly", count: 3 })).toEqual(["2026-10-23", "2026-11-06", "2026-11-20"]);
  });
  it("monthly on day 31 clamps to month end", () => {
    expect(expandRecurrence("2027-01-31", { freq: "monthly", count: 3 })).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
  });
  it("caps at 60 sessions", () => {
    expect(expandRecurrence("2026-10-23", { freq: "daily", count: 500 }).length).toBe(60);
  });
  it("ends on date inclusive", () => {
    expect(expandRecurrence("2026-10-23", { freq: "weekly", until: "2026-11-06" })).toEqual(["2026-10-23", "2026-10-30", "2026-11-06"]);
  });
  it("no repeat returns single date", () => {
    expect(expandRecurrence("2026-10-23", { freq: "none" })).toEqual(["2026-10-23"]);
  });
});

describe("recurring series over occupied slots", () => {
  const dates = ["2026-12-01", "2026-12-08", "2026-12-15"];
  const ana = { time: "09:00", professional_id: "pro-1", patient_name: "Ana Lima", patient_email: null };

  it("creates every date when another patient already has the same weekly time", () => {
    const taken = dates.map((d) => ({ appointment_date: d, appointment_time: "09:00:00", professional_id: "pro-1", patient_name: "Bruno Reis", patient_email: null }));
    const r = planRecurrenceDates(dates, ana, taken);
    expect(r.free).toEqual(dates);
    expect(r.duplicates).toEqual([]);
    expect(r.shared).toEqual(dates);
  });
  it("skips only the dates where the same patient is already booked at that time", () => {
    const r = planRecurrenceDates(dates, ana, [
      { appointment_date: "2026-12-08", appointment_time: "09:00:00", professional_id: "pro-1", patient_name: " ana  lima ", patient_email: null },
    ]);
    expect(r.free).toEqual(["2026-12-01", "2026-12-15"]);
    expect(r.duplicates).toEqual(["2026-12-08"]);
  });
  it("different e-mails are different patients even with the same name", () => {
    const r = planRecurrenceDates(dates, { ...ana, patient_email: "ana@a.com" }, [
      { appointment_date: "2026-12-08", appointment_time: "09:00", professional_id: "pro-1", patient_name: "Ana Lima", patient_email: "outra@a.com" },
    ]);
    expect(r.free).toEqual(dates);
  });
  it("another professional's slot never interferes", () => {
    const r = planRecurrenceDates(dates, ana, [
      { appointment_date: "2026-12-08", appointment_time: "09:00", professional_id: "pro-2", patient_name: "Ana Lima", patient_email: null },
    ]);
    expect(r.free).toEqual(dates);
    expect(r.shared).toEqual([]);
  });
  it("a different time on the same day is not a conflict", () => {
    const r = planRecurrenceDates(dates, ana, [
      { appointment_date: "2026-12-08", appointment_time: "10:00", professional_id: "pro-1", patient_name: "Ana Lima", patient_email: null },
    ]);
    expect(r.free).toEqual(dates);
  });
});
