import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ select: vi.fn(), remove: vi.fn(), eq: vi.fn(), del: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ delete: mocks.del }),
    storage: { from: () => ({ remove: mocks.remove }) },
  },
}));
import { deletePhoto, type StudioPhoto } from "@/pages/studio/photos";

const photo = { id: "photo-original", storagePath: "owner/photo.png" } as StudioPhoto;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.del.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ select: mocks.select });
  mocks.remove.mockResolvedValue({ error: null });
});
describe("Studio photo deletion", () => {
  it("deletes only the selected ID and then cleans its file", async () => {
    mocks.select.mockResolvedValue({ data: [{ id: photo.id }], error: null });
    await deletePhoto(photo);
    expect(mocks.eq).toHaveBeenCalledWith("id", "photo-original");
    expect(mocks.remove).toHaveBeenCalledWith(["owner/photo.png"]);
  });
  it("does not clean storage when no authorized row was deleted", async () => {
    mocks.select.mockResolvedValue({ data: [], error: null });
    await expect(deletePhoto(photo)).rejects.toThrow("A foto não foi removida");
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("propagates database failures without deleting the file", async () => {
    mocks.select.mockResolvedValue({ data: null, error: new Error("delete failed") });
    await expect(deletePhoto(photo)).rejects.toThrow("delete failed");
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});