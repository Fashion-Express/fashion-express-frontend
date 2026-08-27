import "server-only";

import { apiFetch } from "./client";
import type { Id, Money, Paginated } from "./types";

/**
 * FR-00.6. Staff accounts.
 *
 * `status_code` and `is_active` answer different questions and both appear: the
 * status is the person's employment state (FR-00.7), while `is_active` says
 * whether the account may authenticate at all. Suspending an Owner does not
 * stop them being an Owner.
 */
export type User = {
  id: Id;
  username: string;
  name: string;
  email: string;
  /** Generated once as EMP-XXXXXXXX and never editable (FR-00.8, BR-45). */
  employee_id: string;
  phone: string;
  salary: Money;
  join_date: string | null;
  is_active: boolean;
  status_code: "active" | "inactive" | "on_leave";
  status_label: string;
  user_type_id: Id;
  user_type_code: string;
  user_type_label: string;
  job_position: string | null;
  department: string | null;
  shop_id: Id | null;
  shop_name: string | null;
};

export type UserListParams = {
  page?: number;
  search?: string;
  statusCode?: string;
  userTypeId?: Id;
  shopId?: Id;
};

export function listUsers(params: UserListParams = {}) {
  return apiFetch<Paginated<User>>("/users", {
    query: {
      page: params.page,
      search: params.search,
      statusCode: params.statusCode,
      userTypeId: params.userTypeId,
      shopId: params.shopId,
    },
  });
}

export function getUser(id: Id) {
  return apiFetch<User>(`/users/${id}`);
}

/** BR-59 — `label` is editable by the business; `code` is what logic keys on.
 * Finance confers no elevated privilege; it classifies staff and holds
 * permissions. */
export type UserType = {
  id: Id;
  code: string;
  label: string;
  description?: string;
  is_superuser: boolean;
  is_manager: boolean;
};

export function listUserTypes() {
  return apiFetch<UserType[]>("/users/types");
}

export type UserInput = {
  username: string;
  password: string;
  name: string;
  /** BR-57 — every account has exactly one type. */
  userTypeId: Id;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  notes?: string;
  /** Decimal string — a JSON number would be a float. */
  salary?: Money;
  joinDate?: string;
  jobPositionId?: Id;
  departmentId?: Id;
  /** Home shop: defaults create forms, does not limit visibility. */
  shopId?: Id;
  statusCode?: "active" | "inactive" | "on_leave";
};

/** Creates the account and its credential in ONE transaction — an account
 * nobody can sign in to is not a usable half-result. */
export function createUser(input: UserInput) {
  return apiFetch<User>("/users", { method: "POST", body: input });
}

/**
 * Accepts every create field except `username` and `password`, plus `isActive`.
 *
 * `username` (an immutable identifier), `employeeId` (generated once) and
 * `isSuperuser`/`isManager` (privilege comes from the TYPE — to promote
 * someone, change their `userTypeId`) are each a 400 rather than an ignore, so
 * none of them appears in this type.
 */
export type UserUpdate = Omit<Partial<UserInput>, "username" | "password"> & {
  isActive?: boolean;
};

export function updateUser(id: Id, input: UserUpdate) {
  return apiFetch<User>(`/users/${id}`, { method: "PATCH", body: input });
}

/** Sets a password without knowing the old one. Anyone may change their own;
 * changing someone else's needs `change_user`. */
export function setUserPassword(id: Id, password: string) {
  return apiFetch<void>(`/users/${id}/password`, {
    method: "POST",
    body: { password },
  });
}

/** Retiring someone is a status change, not a deletion. */
export function deleteUser(id: Id) {
  return apiFetch<void>(`/users/${id}`, { method: "DELETE" });
}
