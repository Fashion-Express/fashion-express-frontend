import "server-only";

import { apiFetch } from "./client";
import type { Id, Money, Paginated, Quantity } from "./types";

/**
 * FR-02. The largest module: quotations, invoices, stock draw-down, payments.
 *
 * BR-01 applies to EVERY route here. A user who is not a manager or superuser
 * sees only the sales they created — in the list, the detail, the line items and
 * the payment history. A sale they may not see returns 404, not 403: learning
 * that it exists would already be more than the rule allows. Nothing on the
 * client enforces this; it is noted because it explains why a link can 404.
 */

/** RD-03. Only `finalized` touches stock or counts toward any total (BR-02, BR-03). */
export type SaleStatus = "quote" | "draft" | "finalized" | "cancelled";

export type Sale = {
  id: Id;
  sale_number: string;
  status_code: SaleStatus;
  status_label: string;
  total_amount: Money;
  amount_paid: Money;
  balance_due: Money;
  finalized_at: string | null;
  customer_name: string;
  customer_number: string;
  shop_name: string;
  created_by: string;
};

export type SaleTotals = {
  invoiced: Money;
  received: Money;
  outstanding: Money;
};

/** `totals` respects every applied filter; with `itemType` set they are
 * apportioned per BR-15 — a mixed order contributes only its matching lines,
 * and receipts are pro-rated by that line share. */
export type SalePage = Paginated<Sale> & { totals: SaleTotals };

export type SaleListParams = {
  page?: number;
  search?: string;
  status?: SaleStatus;
  shopId?: Id;
  customerId?: Id;
  createdFrom?: string;
  createdTo?: string;
  itemType?: "inventory" | "non_inventory";
  /** FR-00.5, the manager's "review one salesperson" filter. It narrows within
   * BR-01's scope, never widens it: a non-manager passing someone else's id
   * gets zero sales, not theirs. */
  createdById?: Id;
};

export function listSales(params: SaleListParams = {}) {
  return apiFetch<SalePage>("/sales", {
    query: {
      page: params.page,
      search: params.search,
      status: params.status,
      shopId: params.shopId,
      customerId: params.customerId,
      createdFrom: params.createdFrom,
      createdTo: params.createdTo,
      itemType: params.itemType,
      createdById: params.createdById,
    },
  });
}

export type SaleItem = {
  id: Id;
  item_type_code: "inventory" | "non_inventory";
  item_type_label: string;
  description: string | null;
  inventory_item_id: Id | null;
  part_code: string | null;
  part_name: string | null;
  quantity: Quantity;
  boxes: number;
  unit_price: Money;
  line_total: Money;
};

export type SalePayment = {
  id: Id;
  receipt_number: string;
  payment_date: string;
  amount: Money;
  /** The id, so an edit form can preselect it; the code and label are display. */
  payment_method_id: Id;
  method_code: string;
  method_label: string;
  notes: string | null;
  /** When the receipt was written — what a printed receipt dates itself by. */
  created_at: string;
  batch_id: Id | null;
};

export type SaleRow = Sale & {
  customer_id: Id;
  shop_id: Id;
  created_by_id: Id | null;
  notes: string | null;
  created_at: string;
};

export type SaleDetail = SaleRow & {
  items: SaleItem[];
  payments: SalePayment[];
};

/**
 * The lines on their own. Separate from `getSale` because a screen that lists
 * several sales wants one sale's lines without its header or its payments —
 * the customer account's expandable order rows. Re-applies BR-01's scope, so a
 * sale the caller may not see answers 404 here too.
 */
export function listSaleItems(id: Id) {
  return apiFetch<SaleItem[]>(`/sales/${id}/items`);
}

/**
 * The lines and the payment history are their OWN routes rather than being
 * embedded in the sale — each one re-applies BR-01's scope, so a sale the
 * caller may not see cannot leak through a child collection either. They are
 * requested together here because every detail screen wants all three.
 */
export async function getSale(id: Id): Promise<SaleDetail> {
  const sale = await apiFetch<SaleRow>(`/sales/${id}`);

  const [items, payments] = await Promise.all([
    listSaleItems(id),
    apiFetch<SalePayment[]>(`/sales/${id}/payments`),
  ]);

  return { ...sale, items, payments };
}

/* ---------------------------------------------------------------------------
   Creating
   --------------------------------------------------------------------------- */

/**
 * BR-04 — the two line kinds. An `inventory` line needs `inventoryItemId` and
 * draws stock at finalisation; a `non_inventory` line needs `description` —
 * that description IS the machine — and never draws stock. Neither may be saved
 * without its required field, and the database makes the mixed state
 * unrepresentable so a machine line can never be silently deducted.
 *
 * Line totals and the order total are calculated by the system and never
 * accepted from the caller. A stocked line with `unitPrice` omitted or zero
 * takes the product's current selling price; a positive entered price always
 * wins, so a deliberate discount survives and an empty field does not silently
 * sell at nothing.
 */
export type SaleItemInput = {
  itemType: "inventory" | "non_inventory";
  inventoryItemId?: Id;
  description?: string;
  quantity: Quantity;
  /** Whole boxes, the second stock dimension (BR-26). */
  boxes?: number;
  unitPrice?: Money;
};

/** The first payment travels as a nested object, not as flattened fields. */
export type InitialPaymentInput = {
  amount: Money;
  paymentDate: string;
  paymentMethodId: Id;
  notes?: string;
};

export type SaleInput = {
  customerId: Id;
  shopId: Id;
  items: SaleItemInput[];
  /**
   * Omit for a draft invoice; "quote" for quotation mode. `finalized` is not
   * accepted here — finalising is its own act with its own permission.
   */
  status?: "draft" | "quote";
  notes?: string;
  initialPayment?: InitialPaymentInput;
};

export function createSale(input: SaleInput) {
  return apiFetch<Sale>("/sales", { method: "POST", body: input });
}

/** FR-02.3.1 — a quotation becomes a draft invoice in one step, keeping its
 * items and prices. */
export function convertQuotation(id: Id) {
  return apiFetch<Sale>(`/sales/${id}/convert`, { method: "POST" });
}

/**
 * Its own permission (FR-02.4.3), so the staff who assemble orders need not be
 * the staff who commit them.
 *
 * IRREVERSIBLE. BR-06 — availability is validated for every line before ANY
 * deduction, in both units and boxes. If one line is short the whole
 * finalisation is refused and nothing changes, not even the lines that could
 * have been filled.
 */
export type FinalizeResult = {
  saleNumber: string;
  /** FR-02.4.2 — the items that have just fallen to or below their minimum. */
  nowLowOnStock: Array<{
    partCode: string;
    partName: string;
    quantity: Quantity;
    minimumStock: number;
  }>;
  sale: { status_code: SaleStatus; finalized_at: string };
};

export function finalizeSale(id: Id) {
  return apiFetch<FinalizeResult>(`/sales/${id}/finalize`, { method: "POST" });
}

/** BR-14 — only DRAFT sales may be deleted. */
export function deleteSale(id: Id) {
  return apiFetch<void>(`/sales/${id}`, { method: "DELETE" });
}

/* ---------------------------------------------------------------------------
   Payments
   --------------------------------------------------------------------------- */

export type SalePaymentInput = {
  amount: Money;
  paymentDate: string;
  /** Must be customer-scoped (BR-62). */
  paymentMethodId: Id;
  notes?: string;
};

/**
 * Any number of part-payments; each gets a unique receipt number and posts a
 * Credit to the ledger automatically (BR-38).
 *
 * BR-09 total payments may not exceed the sale value · BR-10 nothing at or
 * below zero · BR-11 nothing on a cancelled sale or a quotation.
 */
/**
 * FR-02.7 — correcting a receipt: amount, date, method and notes.
 *
 * BR-09 holds on an edit as it does on insert — raising an amount past the sale
 * total is refused. BR-62 holds on the method: only `customer`-scoped methods
 * are accepted, which is why the picker is fed `customerPaymentMethods()` and
 * never the full list.
 *
 * A repriced payment that came from a customer lump sum carries its allocation
 * with it, so BR-19's combined receipt stays equal to the sum of the invoices
 * it covers.
 */
export type SalePaymentUpdate = {
  amount?: Money;
  paymentDate?: string;
  paymentMethodId?: Id;
  notes?: string;
};

export function updateSalePayment(paymentId: Id, input: SalePaymentUpdate) {
  return apiFetch<{ ok: true }>(`/sale-payments/${paymentId}`, {
    method: "PATCH",
    body: input,
  });
}

/**
 * Removing a receipt reverses its ledger entry. Where the payment came from a
 * customer lump sum, its allocation goes too and the batch total is recomputed
 * from what remains — a batch left covering nothing is deleted outright.
 */
export function deleteSalePayment(paymentId: Id) {
  return apiFetch<void>(`/sale-payments/${paymentId}`, { method: "DELETE" });
}

export function recordSalePayment(id: Id, input: SalePaymentInput) {
  return apiFetch<SalePayment>(`/sales/${id}/payments`, {
    method: "POST",
    body: input,
  });
}

/* ---------------------------------------------------------------------------
   Editing a finalised sale (FR-02.6) — administrators only. A manager may SEE
   a finalised sale but not change its lines.
   --------------------------------------------------------------------------- */

/** BR-13 — stock is validated and deducted immediately, exactly as at
 * finalisation. */
export function addSaleItem(id: Id, input: SaleItemInput) {
  return apiFetch<SaleItem>(`/sales/${id}/items`, { method: "POST", body: input });
}

/**
 * BR-12 — the stock that line consumed is RETURNED to inventory and a reversing
 * Adjustment movement is recorded. Stock is never silently lost.
 *
 * FR-02.6.2 — if this empties the sale it reverts to draft and its payments are
 * deleted, so no orphaned overpayment remains.
 */
export function deleteSaleItem(id: Id, itemId: Id) {
  return apiFetch<{
    revertedToDraft?: boolean;
    paymentsRemoved?: number;
    sale: { status_code: SaleStatus; finalized_at: string | null; amount_paid: Money };
  }>(`/sales/${id}/items/${itemId}`, { method: "DELETE" });
}

/**
 * FR-02.9 — the printable invoice, or the distinct QUOTATION template when the
 * sale is a quotation. BR-01 applies: another user's invoice is a 404.
 *
 * A PAGE of this app, not the API's PDF. The document is meant to be read and
 * checked before it is printed, and the browser's own print dialog still offers
 * "Save as PDF" to anyone who wants the file. `GET /documents/sales/:id/invoice`
 * remains on the API for anything that needs the PDF bytes directly.
 */
export function invoicePath(id: Id): string {
  return `/sales/${id}/invoice`;
}

/**
 * FR-02.9 — the order history as a PDF, narrowed to one customer.
 *
 * Linked, never fetched: the bytes come from the API, which the browser cannot
 * call itself, so the link goes through the download route handler that
 * attaches the session cookie. BR-01 still scopes it upstream — an employee
 * gets their own sales for that customer, not the customer's whole history.
 */
export function ordersPdfPath(customerId: Id): string {
  return `/api/download/documents/orders.pdf?customerId=${encodeURIComponent(customerId)}`;
}

/**
 * FR-02.9 — the printable receipt for one payment.
 *
 * A PAGE of this app, like the invoice and for the same reason: the document is
 * handed to a customer, and the browser's print dialog — which this page opens
 * itself — offers "Save as PDF" to anyone who wants the file.
 * `GET /documents/payments/:id/receipt` still serves the bytes directly.
 */
export function receiptPath(saleId: Id, paymentId: Id): string {
  return `/sales/${saleId}/payments/${paymentId}/receipt`;
}

/**
 * The sale and its payment history as one document. This one IS the API's PDF —
 * it streams, so it goes through the download route that attaches the session
 * cookie rather than pointing at the API directly.
 */
export function statementPath(saleId: Id): string {
  return `/api/download/documents/sales/${saleId}/statement`;
}
