import "server-only";

import { apiFetch } from "./client";
import type { ReferenceOption } from "./reference-options";

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
