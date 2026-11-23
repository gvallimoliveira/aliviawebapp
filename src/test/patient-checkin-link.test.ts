// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { getPatientCheckinLink } from "../../supabase/functions/periodization-checkin/myLink";

type QueryResult = { data: { id?: string; token?: string } | null; error: { message: string } | null };

function mockClient(
  patient: QueryResult,
  link: QueryResult = { data: null, error: null },
  insertError: { message: string } | null = null,
) {
  const patientQuery = {
    select: vi.fn().mockReturnThis(), ilike: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue(patient),
  };
  const linkQuery = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue(link),
    insert: vi.fn().mockResolvedValue({ error: insertError }),
  };
  const from = vi.fn((table: string) => {
    if (table === "patients") return patientQuery;
    if (table === "periodization_links") return linkQuery;
    throw new Error(`Unexpected table: ${table}`);
  });
  return { client: { from } as unknown as Parameters<typeof getPatientCheckinLink>[0], from, patientQuery, linkQuery };
}

describe("patient dashboard check-in link", () => {
  it("returns HTTP 200 with a null token when the authenticated account has no patient", async () => {
    const { client, from, linkQuery } = mockClient({ data: null, error: null });
    expect(await getPatientCheckinLink(client, "self-service@example.com")).toEqual({ status: 200, body: { token: null } });
    expect(from.mock.calls).toEqual([["patients"]]);
    expect(linkQuery.insert).not.toHaveBeenCalled();
  });

  it("matches the authenticated account email, not a request-supplied patient ID", async () => {
    const { client, patientQuery } = mockClient({ data: null, error: null });
    await getPatientCheckinLink(client, "signed-in@example.com");
    expect(patientQuery.ilike).toHaveBeenCalledWith("email", "signed-in@example.com");
    expect(patientQuery.limit).toHaveBeenCalledWith(1);
  });

  for (const id of ["solo-patient", "clinic-patient"]) {
    it(`reuses the active patient link for ${id} without creating another`, async () => {
      const { client, linkQuery } = mockClient({ data: { id }, error: null }, { data: { token: "existing-patient-token" }, error: null });
      expect(await getPatientCheckinLink(client, "patient@example.com")).toEqual({ status: 200, body: { token: "existing-patient-token" } });
      expect(linkQuery.eq.mock.calls).toEqual([["patient_id", id], ["audience", "patient"], ["active", true]]);
      expect(linkQuery.insert).not.toHaveBeenCalled();
    });
  }

  it("creates a patient link only for an existing patient when no active link exists", async () => {
    const { client, from, linkQuery } = mockClient({ data: { id: "patient-123" }, error: null });
    const result = await getPatientCheckinLink(client, "patient@example.com");
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ token: expect.stringMatching(/^[0-9a-f-]{36}$/) });
    expect(linkQuery.insert).toHaveBeenCalledWith({ patient_id: "patient-123", plan_id: null, audience: "patient", token: "token" in result.body ? result.body.token : null, active: true });
    expect(from.mock.calls).toEqual([["patients"], ["periodization_links"], ["periodization_links"]]);
  });

  it("does not conceal a patient lookup failure as a normal empty state", async () => {
    const { client, from, linkQuery } = mockClient({ data: null, error: { message: "database unavailable" } });
    expect(await getPatientCheckinLink(client, "patient@example.com")).toEqual({ status: 500, body: { error: "patient_lookup_failed" } });
    expect(from.mock.calls).toEqual([["patients"]]);
    expect(linkQuery.insert).not.toHaveBeenCalled();
  });

  it("does not create a duplicate link after a link lookup failure", async () => {
    const { client, linkQuery } = mockClient({ data: { id: "patient-123" }, error: null }, { data: null, error: { message: "database unavailable" } });
    expect(await getPatientCheckinLink(client, "patient@example.com")).toEqual({ status: 500, body: { error: "link_lookup_failed" } });
    expect(linkQuery.insert).not.toHaveBeenCalled();
  });

  it("does not return a usable token when link creation fails", async () => {
    const { client } = mockClient({ data: { id: "patient-123" }, error: null }, { data: null, error: null }, { message: "insert failed" });
    expect(await getPatientCheckinLink(client, "patient@example.com")).toEqual({ status: 500, body: { error: "link_create_failed" } });
  });
});