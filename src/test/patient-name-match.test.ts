import { describe, it, expect } from "vitest";
import { findBestPatient, looksLikeCommitment } from "@/lib/patientNameMatch";

const patients = [
  { id: "1", full_name: "Rafael Lobianco" },
  { id: "2", full_name: "Rafaela Souza" },
  { id: "3", full_name: "Carolina Petisco" },
];

describe("patient name match", () => {
  it("links nickname + surname to existing patient", () => {
    expect(findBestPatient("rafa lobianco", patients)?.id).toBe("1");
  });
  it("ignores accents and case", () => {
    expect(findBestPatient("CAROLINA PETÍSCO", patients)?.id).toBe("3");
  });
  it("does not link different people", () => {
    expect(findBestPatient("Rafael Martins", patients)).toBeNull();
    expect(findBestPatient("Rafa", patients)).toBeNull();
  });
  it("flags commitments", () => {
    expect(looksLikeCommitment("Reunião equipe")).toBe(true);
    expect(looksLikeCommitment("Almoço")).toBe(true);
    expect(looksLikeCommitment("Rafa Lobianco")).toBe(false);
  });
});
