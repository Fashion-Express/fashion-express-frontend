import "server-only";

import { apiFetch } from "./client";
import type { Id, Money, Paginated } from "./types";

/**
 * FR-09 and FR-08. Reports and the ledger are MANAGER-ONLY (FR-09.5).
 */

export type ReportSummary = {
  ledger: { balance: Money; credits: Money; debits: Money };
  trading: { invoiced: Money; received: Money; outstanding: Money };
  /**
   * FR-09.6. There is deliberately no per-shop net profit: `attributed_expenses`
   * counts only the expenses explicitly given that shop, and many costs are
   * business-wide by design (§10.2). Dividing them between shops would be
   * arbitrary, so the report gives what the data supports.
   */
  byShop: Array<{
    name: string;
    invoiced: Money;
    received: Money;
    outstanding: Money;
    stock_value: Money;
    customer_count: string;
    attributed_expenses: Money;
  }>;
};

export function getReportSummary() {
  return apiFetch<ReportSummary>("/reports/summary");
}

/* ---------------------------------------------------------------------------
   FR-08 — the ledger. Append-only and read-only: BR-38 means no user posts a
   line by hand, and there is no POST, PATCH or DELETE for entries.
   --------------------------------------------------------------------------- */

export type LedgerEntry = {
  id: Id;
  timestamp: string;
  entry_type: string;
  entry_type_label: string;
  /** Render from this, NEVER by comparing entry_type to "credit" — the
   * definition of a credit lives in one row of `ledger_entry_types`
   * (FR-12.12.2), which is the whole reason that list is a table. */
  direction: 1 | -1;
  source: string;
  source_label: string;
  reference: string;
  description: string;
  amount: Money;
  signed_amount: Money;
};

/**
 * `totals` covers the WHOLE ledger; `filtered` covers what you asked for. The
 * split is deliberate — "the current balance" means the business's balance, and
 * a filtered subtotal under the same label would be a far more confusing number.
 */
export type LedgerPage = Paginated<LedgerEntry> & {
  totals: { total_credits: Money; total_debits: Money; balance: Money };
  filtered: { net: Money; gross: Money };
};

export type LedgerListParams = {
  page?: number;
  entryType?: "credit" | "debit";
  source?: string;
  reference?: string;
  from?: string;
  to?: string;
};

export function listLedger(params: LedgerListParams = {}) {
  return apiFetch<LedgerPage>("/ledger", {
    query: {
      page: params.page,
      entryType: params.entryType,
      source: params.source,
      reference: params.reference,
      from: params.from,
      to: params.to,
    },
  });
}

/**
 * Exports stream straight from the API. These are linked, never fetched and
 * re-served: the browser hits the Next route handler which forwards the session
 * cookie and pipes the workbook back.
 */
export const EXPORT_ROUTES = {
  full: "/api/download/reports/export/full",
  customers: "/api/download/reports/export/customers",
} as const;
