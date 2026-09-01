import "server-only";

import { apiFetch } from "./client";
import type { Id, Money, NamedOption, Paginated } from "./types";

/**
 * FR-05. NOT shop-scoped — buying is done centrally for the business (FR-11.4).
 *
 * Two rules run through the whole module:
 *  - The amount due is DERIVED, never entered (BR-28). `paid_amount` is
 *    maintained by a database trigger over the payment rows, so it cannot drift.
 *  - Every payment posts a Debit to the ledger automatically (BR-38), in the
 *    same transaction. Edit a payment and its entry follows; delete it and the
 *    entry goes (BR-40).
 */
export type Supplier = {
  id: Id;
  name: string;
  phone: string;
  email: string;
  address: string;
  total_purchased: Money;
  total_paid: Money;
  total_due: Money;
  purchase_count: string;
};

export function listSuppliers(params: { page?: number; search?: string } = {}) {
  return apiFetch<Paginated<Supplier>>("/suppliers", {
    query: { page: params.page, search: params.search },
  });
}

export function getSupplier(id: Id) {
  return apiFetch<Supplier>(`/suppliers/${id}`);
}

/**
 * The picker for the inventory form's supplier reference. Needs no permission.
 *
 * Answers `{ id, name }`, NOT `{ id, label }` — see `NamedOption`.
 */
export function listSupplierOptions() {
  return apiFetch<NamedOption[]>("/suppliers/options");
}

export type SupplierInput = {
  name: string;
  phone: string;
  email?: string;
  address?: string;
};

export function createSupplier(input: SupplierInput) {
  return apiFetch<Supplier>("/suppliers", { method: "POST", body: input });
}

export function updateSupplier(id: Id, input: Partial<SupplierInput>) {
  return apiFetch<Supplier>(`/suppliers/${id}`, { method: "PATCH", body: input });
}

/** Cascades to purchases and their payments — that history belongs to the supplier. */
export function deleteSupplier(id: Id) {
  return apiFetch<void>(`/suppliers/${id}`, { method: "DELETE" });
}

/* ---------------------------------------------------------------------------
   Purchases
   --------------------------------------------------------------------------- */

/** `product_name` is free text: a purchase is deliberately NOT linked to an
 * inventory item (FR-05.3). */
export type Purchase = {
  id: Id;
  product_name: string;
  price: Money;
  paid_amount: Money;
  due: Money;
  purchase_date: string;
  notes: string;
};

export function listPurchases(supplierId: Id) {
  return apiFetch<Purchase[]>(`/suppliers/${supplierId}/purchases`);
}

/** One purchase, with the supplier it belongs to named. */
export type PurchaseDetail = Purchase & {
  supplier_id: Id;
  supplier_name: string;
};

export function getPurchase(purchaseId: Id) {
  return apiFetch<PurchaseDetail>(`/purchases/${purchaseId}`);
}

export type PurchaseInput = {
  productName: string;
  price: Money;
  purchaseDate: string;
  notes?: string;
  /** BR-32 — may not exceed the price, and both are saved atomically or not at
   * all. Send too much and NOTHING is written, not even the purchase. */
  initialPayment?: Money;
  initialPaymentMethodId?: Id;
  initialPaymentReference?: string;
};

export function createPurchase(supplierId: Id, input: PurchaseInput) {
  return apiFetch<Purchase>(`/suppliers/${supplierId}/purchases`, {
    method: "POST",
    body: input,
  });
}

/**
 * FR-05.4 — correcting a purchase.
 *
 * The supplier is not here: a purchase belongs to the supplier it was entered
 * against, and `UpdatePurchaseDto` does not accept a new one. Neither is
 * `paid_amount` — that is the sum of the payment rows, derived and not
 * writable.
 *
 * Lowering the price below what has already been paid is refused by
 * `purchase_not_overpaid`, which is the right answer: the money has moved, so
 * it is the price that is wrong.
 */
export type PurchaseUpdate = {
  productName?: string;
  price?: Money;
  purchaseDate?: string;
  notes?: string;
};

export function updatePurchase(purchaseId: Id, input: PurchaseUpdate) {
  return apiFetch<PurchaseDetail>(`/purchases/${purchaseId}`, {
    method: "PATCH",
    body: input,
  });
}

/**
 * Deleting a purchase takes its payments with it, and their ledger lines
 * (BR-40) — no debit survives the purchase it was recorded against.
 */
export function deletePurchase(purchaseId: Id) {
  return apiFetch<void>(`/purchases/${purchaseId}`, { method: "DELETE" });
}

/* ---------------------------------------------------------------------------
   Payments
   --------------------------------------------------------------------------- */

/** A receipt against one purchase. */
export type PurchasePayment = {
  id: Id;
  receipt_number: string;
  amount: Money;
  payment_date: string;
  method_code: string;
  method_label: string;
  reference_number: string | null;
  notes: string | null;
};

export function listPurchasePayments(purchaseId: Id) {
  return apiFetch<PurchasePayment[]>(`/purchases/${purchaseId}/payments`);
}

export type PurchasePaymentInput = {
  amount: Money;
  paymentDate: string;
  paymentMethodId: Id;
  /** BR-29 — mandatory for LC, cheque, TT and bank; only cash needs none. The
   * rule fails CLOSED: any method that is not cash requires a reference, so a
   * newly added method errs toward demanding a trace. */
  referenceNumber?: string;
};

/**
 * Instalments are the norm. Each payment gets its own receipt number
 * (SPAY-20260826-A1B2C3).
 *
 * Three rules reject a payment: BR-29 (reference required), BR-62 (the method
 * must be supplier-scoped) and BR-30 (may not exceed the remaining due).
 */
export function recordPurchasePayment(purchaseId: Id, input: PurchasePaymentInput) {
  return apiFetch<{ receiptNumber: string }>(`/purchases/${purchaseId}/payments`, {
    method: "POST",
    body: input,
  });
}

/**
 * BR-31 — pay at the SUPPLIER level and the amount is allocated oldest purchase
 * first, by purchase date. Each purchase touched receives its own payment row
 * and receipt number, and posts its own ledger debit. It may not exceed the
 * supplier's total outstanding.
 */
/**
 * FR-05.5 — correcting a receipt against one purchase.
 *
 * BR-29 is judged on the values the row ends up with: switching cash to bank
 * without adding a reference is refused, and so is clearing the reference on a
 * payment that is already bank. BR-30 still caps the amount — raising it past
 * the purchase price trips `purchase_not_overpaid`.
 */
export type PurchasePaymentUpdate = {
  amount?: Money;
  paymentDate?: string;
  paymentMethodId?: Id;
  referenceNumber?: string;
  notes?: string;
};

export function updatePurchasePayment(
  paymentId: Id,
  input: PurchasePaymentUpdate,
) {
  return apiFetch<Purchase>(`/purchase-payments/${paymentId}`, {
    method: "PATCH",
    body: input,
  });
}

/** Removing a receipt reverses its ledger debit (BR-40) and reopens the due. */
export function deletePurchasePayment(paymentId: Id) {
  return apiFetch<void>(`/purchase-payments/${paymentId}`, { method: "DELETE" });
}

export function paySupplier(supplierId: Id, input: PurchasePaymentInput) {
  return apiFetch<{ allocated: Array<{ purchaseId: Id; amount: Money }> }>(
    `/suppliers/${supplierId}/pay`,
    { method: "POST", body: input },
  );
}
