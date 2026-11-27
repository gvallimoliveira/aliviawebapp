// Who may grant, change or remove clinic team roles. Mirrors the database guards
// (guard_clinic_member_privileged_roles / guard_clinic_invitation_privileged_roles): change both together.
export const PRIVILEGED_CLINIC_ROLES = ["owner", "admin"];
export const isPrivilegedClinicRole = (role: string) => PRIVILEGED_CLINIC_ROLES.includes(role);

/** Roles the viewer may give to a member or invitation. */
export function canAssignClinicRole(viewerRole: string | null | undefined, role: string): boolean {
  if (!viewerRole) return false;
  if (isPrivilegedClinicRole(viewerRole)) return true;
  return viewerRole === "secretary" && !isPrivilegedClinicRole(role);
}

/** Whether the viewer may change the role of, or remove, a member/invitation holding `targetRole`. */
export function canManageClinicMember(viewerRole: string | null | undefined, targetRole: string): boolean {
  return canAssignClinicRole(viewerRole, targetRole);
}
