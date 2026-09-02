import "server-only";

import { apiFetch } from "./client";
import type { ReferenceOption } from "./reference-options";
import type { Id, Paginated } from "./types";

export { optionLabel, type ReferenceOption } from "./reference-options";


/**
 * FR-12 — the twelve lookup lists, all served by one registry-driven
 * controller. Only the slugs this frontend actually uses are listed here.
 *
 * `payment-methods` and `statuses` are SCOPED: a scope is required and an
 * unknown one is a 400, not an empty list.
 */
export type ReferenceList =
  | "job-positions"
  | "departments"
  | "categories"
  | "units"
  | "expense-categories"
  | "item-types"
  | "user-types"
  | "statuses"
  | "payment-methods";

export type PaymentMethodScope = "customer" | "supplier" | "expense";
export type StatusScope = "user" | "customer" | "sale" | "claim";

export function listOptions(
  list: ReferenceList,
  scope?: PaymentMethodScope | StatusScope,
) {
  return apiFetch<ReferenceOption[]>(`/reference/${list}/options`, {
    query: { scope },
  });
}

/** The method picker on any customer-facing payment form. */
export function customerPaymentMethods() {
  return listOptions("payment-methods", "customer");
}

export function customerStatuses() {
  return listOptions("statuses", "customer");
}

/** Pickers used across the console, each already carrying its required scope. */
export const supplierPaymentMethods = () => listOptions("payment-methods", "supplier");
export const expensePaymentMethods = () => listOptions("payment-methods", "expense");
export const saleStatuses = () => listOptions("statuses", "sale");
export const userStatuses = () => listOptions("statuses", "user");
export const units = () => listOptions("units");
export const categories = () => listOptions("categories");
export const expenseCategories = () => listOptions("expense-categories");
export const jobPositions = () => listOptions("job-positions");
export const departments = () => listOptions("departments");

/* ---------------------------------------------------------------------------
   FR-12.5 — the administration side of the same lists.
   --------------------------------------------------------------------------- */

/**
 * One row of any reference list.
 *
 * The registry decides which optional fields a given list actually carries: a
 * `named` list (product categories, departments) has `name`; a `coded` one
 * (units, payment methods) has `code` and `label` instead. They are optional
 * here rather than split into a type per list because the endpoints are one
 * generic controller — a screen knows which list it is looking at and reads the
 * fields that list has.
 */
export type ReferenceRow = {
  id: Id;
  name?: string;
  code?: string;
  label?: string;
  description?: string;
  scope?: string;
  sort_order?: number;
  is_active: boolean;
  /** `user-types` only — the privilege the type confers (FR-12.1.2). */
  is_superuser?: boolean;
  is_manager?: boolean;
};

export type ReferenceListParams = {
  page?: number;
  search?: string;
  scope?: string;
  /**
   * Absent means every entry, active or not — which is what an administration
   * screen wants. Only `/options` hides inactive entries by default, because a
   * product whose category was deactivated must still display that category.
   */
  isActive?: boolean;
};

export function listReference(list: ReferenceList, params: ReferenceListParams = {}) {
  return apiFetch<Paginated<ReferenceRow>>(`/reference/${list}`, {
    query: {
      page: params.page,
      search: params.search,
      scope: params.scope,
      isActive: params.isActive,
    },
  });
}

export function getReference(list: ReferenceList, id: Id) {
  return apiFetch<ReferenceRow>(`/reference/${list}/${id}`);
}

/**
 * BR-60 — what would break if this entry were retired, discovered from the
 * foreign keys pointing at it rather than from a hand-maintained list.
 *
 * Call it BEFORE offering a delete: an entry in use cannot be deleted at all,
 * and the alternative the user wants is to deactivate it.
 */
export function getReferenceUsage(list: ReferenceList, id: Id) {
  return apiFetch<{ total: number; byTable: Record<string, number> }>(
    `/reference/${list}/${id}/usage`,
  );
}

/** A `code` is set once and never edited (BR-59), so it is absent from updates. */
export type ReferenceInput = {
  name?: string;
  code?: string;
  label?: string;
  description?: string;
  scope?: string;
  sortOrder?: number;
  isActive?: boolean;
  /**
   * `user-types` only. **Writing either is restricted to administrators** — it
   * decides what every holder of the type may do, and an unguarded path here
   * let a manager mint an unrestricted role and step into it.
   */
  isSuperuser?: boolean;
  isManager?: boolean;
};

export type ReferenceUpdate = Omit<ReferenceInput, "code" | "scope">;

export function createReference(list: ReferenceList, input: ReferenceInput) {
  return apiFetch<ReferenceRow>(`/reference/${list}`, {
    method: "POST",
    body: input,
  });
}

export function updateReference(list: ReferenceList, id: Id, input: ReferenceUpdate) {
  return apiFetch<ReferenceRow>(`/reference/${list}/${id}`, {
    method: "PATCH",
    body: input,
  });
}

/**
 * Refused with a 409 when the entry is in use, naming how many records and
 * telling the user to deactivate instead. That message is written for the user
 * and is passed through verbatim.
 */
export function deleteReference(list: ReferenceList, id: Id) {
  return apiFetch<void>(`/reference/${list}/${id}`, { method: "DELETE" });
}
