import { describe, it, expect } from "vitest";
import { isPermissionDenied } from "@/lib/permissionErrors";
describe("isPermissionDenied", () => {
  it("flags RLS violation", () => expect(isPermissionDenied(403, '{"code":"42501","message":"new row violates row-level security policy"}')).toBe(true));
  it("flags 403 from functions", () => expect(isPermissionDenied(403, '{"error":"forbidden"}')).toBe(true));
  it("ignores expired session 401", () => expect(isPermissionDenied(401, '{"message":"JWT expired"}')).toBe(false));
  it("ignores validation 400", () => expect(isPermissionDenied(400, '{"code":"23505","message":"duplicate key"}')).toBe(false));
});
