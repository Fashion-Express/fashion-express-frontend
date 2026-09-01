import "server-only";

import { apiFetch } from "./client";
import type { Id, Money, Option, Paginated } from "./types";

/**
 * FR-03. Every customer belongs to exactly one shop (BR-49), and that shop is
 * fixed at creation (BR-54).
 */
export type Customer = {
  id: Id;
  /** Issued by the server, never accepted from the caller — `FE26082026-01`. */
  customer_id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  notes: string;
  status_code: "active" | "inactive";
  status_label: string;
  shop_id: Id;
  shop_name: string;
  /** A timestamp, so it renders through `formatDate` as a Dhaka day (NFR-05). */
  created_at: string;
};

export type CustomerListParams = {
  page?: number;
  search?: string;
  statusCode?: string;
  shopId?: Id;
};

export function listCustomers(params: CustomerListParams = {}) {
  return apiFetch<Paginated<Customer>>("/customers", {
    query: {
      page: params.page,
      // FR-03.3 — matches name, customer ID, company or phone.
      search: params.search,
      statusCode: params.statusCode,
      shopId: params.shopId,
    },
  });
}

export function getCustomer(id: Id) {
  return apiFetch<Customer>(`/customers/${id}`);
}

/**
 * The picker for a sale form. `shopId` is required: a sale's customer must
 * belong to the sale's shop (BR-53), so offering anyone else would produce a
 * save the database refuses.
 */
export function listCustomerOptions(shopId: Id) {
  return apiFetch<Option[]>("/customers/options", { query: { shopId } });
}

export type CustomerInput = {
  name: string;
  phone: string;
  shopId: Id;
  company?: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
  statusCode?: "active" | "inactive";
};

export function createCustomer(input: CustomerInput) {
  return apiFetch<Customer>("/customers", { method: "POST", body: input });
}

/**
 * `customerId` and `shopId` are refused with a 400 rather than ignored — the
 * number is issued once and immutable (BR-45), and a record's shop is fixed at
 * creation (BR-54) because its sales are scoped to the same shop. So neither is
 * in this type.
 */
export type CustomerUpdate = Omit<Partial<CustomerInput>, "shopId">;

export function updateCustomer(id: Id, input: CustomerUpdate) {
  return apiFetch<Customer>(`/customers/${id}`, { method: "PATCH", body: input });
}

/**
 * FR-03.6.1 — call this BEFORE offering a Delete button. Deleting a customer
 * cascades to their sales, line items, payments, batches and allocations
 * (BR-21): no orphaned financial record may survive its customer.
 */
export type DeletionImpact = {
  customer: { id: Id; customer_id: string; name: string };
  sales: number;
  salePayments: number;
  paymentBatches: number;
  /** Finalised sales only — drafts and quotations are excluded (BR-03). */
  totalInvoiced: Money;
  totalReceived: Money;
};

export function getDeletionImpact(id: Id) {
  return apiFetch<DeletionImpact>(`/customers/${id}/deletion-impact`);
}

export function deleteCustomer(id: Id) {
  return apiFetch<void>(`/customers/${id}`, { method: "DELETE" });
}

/* ---------------------------------------------------------------------------
   FR-03.4 / FR-03.5 — the account view and lump-sum payment.
   --------------------------------------------------------------------------- */

export type CustomerAccount = {
  customer: {
    id: Id;
    customer_id: string;
    name: string;
    company: string;
    phone: string;
    shop_name: string;
  };
  /** Finalised sales only, per BR-03. */
  totals: {
    invoiced: Money;
    received: Money;
    due: Money;
    order_count: string;
  };
  orders: Array<{
    id: Id;
    sale_number: string;
    finalized_at: string;
    total_amount: Money;
    amount_paid: Money;
    balance_due: Money;
  }>;
  /** Each lump-sum event, with how many invoices it was spread across. */
  paymentEvents: Array<{
    id: Id;
    batch_ref: string;
    payment_date: string;
    total_amount: Money;
    method_label: string;
    notes: string | null;
    invoices_settled: string;
  }>;
};

export function getCustomerAccount(id: Id) {
  return apiFetch<CustomerAccount>(`/customers/${id}/account`);
}

/** FR-03.5.1 — offer the payment action only when this is above zero. */
export function getOutstanding(id: Id) {
  return apiFetch<{ outstanding: Money }>(`/customers/${id}/outstanding`);
}

export type CustomerPaymentInput = {
  amount: Money;
  paymentDate: string;
  paymentMethodId: Id;
  notes?: string;
};

/**
 * One lump sum, distributed by the system: oldest finalised sale first (BR-16),
 * never exceeding total outstanding (BR-17 — otherwise the whole event is
 * rejected and nothing is written), each sale getting its own receipt (BR-18),
 * all grouped under one reference (BR-19).
 */
export type PaymentAllocation = {
  batchRef: string;
  totalAmount: Money;
  invoicesSettled: number;
  allocations: Array<{
    saleNumber: string;
    amount: Money;
    receiptNumber: string;
  }>;
};

export function recordCustomerPayment(id: Id, input: CustomerPaymentInput) {
  return apiFetch<PaymentAllocation>(`/customers/${id}/payments`, {
    method: "POST",
    body: input,
  });
}

/**
 * BR-19's combined receipt, read back.
 *
 * Deliberately NOT `PaymentAllocation` above: that is the shape `POST` answers
 * with, in camelCase. This is a read, so it arrives snake_case and carries the
 * batch's own header — who recorded it, when, against which customer. Same
 * event, two shapes, typed separately so neither drifts into the other.
 *
 * `batchRef` is globally unique and the route is not customer-scoped, so a
 * caller must check `customer_number` before showing this under a customer.
 */
export type PaymentBatch = {
  id: Id;
  batch_ref: string;
  payment_date: string;
  total_amount: Money;
  notes: string | null;
  method_label: string;
  customer_name: string;
  customer_number: string;
  recorded_by: string | null;
  /** Oldest finalised sale first (BR-16), each with its own receipt (BR-18). */
  allocations: Array<{
    sale_number: string;
    amount: Money;
    receipt_number: string;
  }>;
};

export function getPaymentBatch(batchRef: string) {
  return apiFetch<PaymentBatch>(`/customer-payments/${batchRef}`);
}
