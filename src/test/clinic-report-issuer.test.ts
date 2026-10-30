import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), signed: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc, from: mocks.from, storage: { from: () => ({ createSignedUrl: mocks.signed }) } } }));
import { resolveResponsibleProfessional } from "@/lib/getResponsibleProfessional";

describe("clinic report issuer", () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });
  it("keeps Sifeg as issuer even without a council rather than using Guilherme", async () => {
    mocks.rpc.mockResolvedValue({ data: { full_name: "Sifeg", council_number: null }, error: null });
    const result = await resolveResponsibleProfessional({ userId: "sifeg", clinicId: "gv", clinicOwnerUserId: "guilherme", includeSignature: false });
    expect(result?.name).toBe("Sifeg");
    expect(result?.councilNumber).toBeUndefined();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("loads the issuer's saved phone signature without requiring a council", async () => {
    mocks.rpc.mockResolvedValue({ data: { full_name: "Sifeg", signature_image_url: "sifeg/signature.png" }, error: null });
    mocks.signed.mockResolvedValue({ data: { signedUrl: "https://example.test/signature" } });
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, blob: async () => new Blob(["ink"], { type: "image/png" }) } as Response);
    const result = await resolveResponsibleProfessional({ userId: "sifeg", clinicId: "gv", includeSignature: true });
    expect(result?.signatureImageDataUrl).toBe("data:image/png;base64,aW5r");
    expect(mocks.signed).toHaveBeenCalledWith("sifeg/signature.png", 60);
    fetcher.mockRestore();
  });
  it("does not fetch a signature when it is disabled", async () => {
    mocks.rpc.mockResolvedValue({ data: { full_name: "Sifeg", signature_image_url: "sifeg/signature.png" }, error: null });
    const result = await resolveResponsibleProfessional({ userId: "sifeg", clinicId: "gv", includeSignature: false });
    expect(result?.signatureImageDataUrl).toBeUndefined();
    expect(mocks.signed).not.toHaveBeenCalled();
  });
  it("preserves CREF instead of relabeling it CREFITO", async () => {
    mocks.rpc.mockResolvedValue({ data: { full_name: "Nome Completo", council_type: "CREF", council_number: "123456-G/SP" }, error: null });
    const result = await resolveResponsibleProfessional({ userId: "staff", clinicId: "gv", includeSignature: false });
    expect(result?.councilType).toBe("CREF");
    expect(result?.councilNumber).toBe("123456-G/SP");
  });
  it("never falls back to owner for a member outside the requested clinic", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    expect(await resolveResponsibleProfessional({ userId: "staff", clinicId: "another-clinic", clinicOwnerUserId: "owner" })).toBeUndefined();
    expect(mocks.rpc).toHaveBeenCalledWith("get_clinic_report_issuer", { _clinic_id: "another-clinic", _user_id: "staff" });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("preserves the academic disclaimer for a student issuer", async () => {
    mocks.rpc.mockResolvedValue({ data: { full_name: "Estudante", is_student: true, active_profile_mode: "student" }, error: null });
    expect((await resolveResponsibleProfessional({ userId: "student", clinicId: "gv", includeSignature: false }))?.isStudent).toBe(true);
  });
});