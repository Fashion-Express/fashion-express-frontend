import "server-only";

import { apiFetch } from "./client";
import type { Id } from "./types";

/**
 * FR-00.4 — roles are containers for permissions, so a capability can be
 * granted or revoked per role without touching individual accounts.
 *
 * A "role" here is a **user type**: BR-56 makes the type the only place
 * privilege is recorded, and BR-57 gives every account exactly one. So this
 * module reads the four types and edits what each one grants — it does not
 * create, rename or delete them, and it does not touch `is_superuser` /
 * `is_manager`. Those stay on the reference-list routes.
 *
 * Two things are worth knowing before changing anything here:
 *
 *  - **Editing grants is privilege escalation.** The API restricts it to
 *    administrators and refuses entirely unless the deployment set
 *    `ENABLE_ROLE_EDITING=true`, the same shape the cleanup tool carries
 *    (BR-42). `grantsInfo()` reports that so a screen can say why it is
 *    read-only rather than discovering it by failing a save.
 *  - **A change lands immediately** on every holder, including sessions already
 *    signed in (BR-56). There is no "apply on next login".
 */

/** `GET /admin/roles` — counts included, so a screen can say what a change costs. */
export type RoleSummary = {
  id: Id;
  code: string;
  label: string;
  is_superuser: boolean;
  is_manager: boolean;
  /** Counts arrive as decimal strings, like every other figure. */
  permission_count: string;
  account_count: string;
};

export function listRoles() {
  return apiFetch<RoleSummary[]>("/admin/roles");
}

/** One row of the permission catalogue. `module` groups the matrix. */
export type PermissionRow = {
  id: Id;
  codename: string;
  label: string;
  module: string;
};

/**
 * What a role grants, and everything it could grant.
 *
 * The catalogue is the API's, not the frontend's typed `PERMISSIONS` union —
 * that union exists to make a `can()` typo a build error, and it carries no
 * labels or modules. A screen listing permissions to a human wants the labels.
 */
export type RoleGrants = {
  granted: string[];
  catalogue: PermissionRow[];
};

export function getRoleGrants(id: Id) {
  return apiFetch<RoleGrants>(`/users/types/${id}/permissions`);
}

/** Whether grants may be edited at all here, and what stands in the way. */
export function grantsInfo() {
  return apiFetch<{ enabled: boolean; safeguards: string[] }>(
    "/users/types/grants-info",
  );
}

/**
 * Replace what a role grants. The whole set is sent, never a delta — see the
 * endpoint's own note. Refusals arrive as 403 (not an administrator, disabled,
 * unrestricted role, your own role) or 400 (unknown codename), each with a
 * sentence written for the user.
 */
export function setRoleGrants(id: Id, permissions: string[]) {
  return apiFetch<RoleGrants>(`/users/types/${id}/permissions`, {
    method: "PUT",
    body: { permissions },
  });
}
