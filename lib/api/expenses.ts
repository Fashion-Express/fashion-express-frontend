import "server-only";

import { apiFetch } from "./client";
import type { Id, Money, Paginated } from "./types";

/**
 * FR-06. Costs the business has paid out. Every expense posts a Debit to the
 * ledger automatically (FR-08.1, BR-38).
 *
 * BR-33 shapes the whole module: anyone with the add permission may CREATE an
 * expense, but only MANAGERS may edit or delete one. Recording a cost is
 * day-to-day work; changing one after the fact is not, because the ledger has
 * already moved.
 */
export type Expense = {
  id: Id;
  date: string;
  description: string;
  amount: Money;
  paid_to: string;
  receipt_number: string;
  category_code: string;
  category_label: string;
  method_label: string | null;
  /** null means a business-wide cost — head office rent, the accountant's fee. */
  shop_id: Id | null;
  shop_name: string | null;
  claim_id: Id | null;
};

export type ExpensePage = Paginated<Expense> & {
  /** FR-06.5 — the total of everything matching the filter, not just this page. */
  filteredTotal: Money;
  /** The business-wide ledger balance, deliberately NOT filtered: it is the
   * ledger's number, not this page's. */
  ledgerBalance: Money;
};

/**
 * Precedence among the date filters: an explicit range beats a single date,
 * which beats a month. Sending both is not ambiguous — the range wins.
 */
export type ExpenseListParams = {
  page?: number;
  search?: string;
  expenseCategoryId?: Id;
  shopId?: Id;
  month?: string;
  date?: string;
  from?: string;
  to?: string;
};

export function listExpenses(params: ExpenseListParams = {}) {
  return apiFetch<ExpensePage>("/expenses", {
    query: {
      page: params.page,
      search: params.search,
      expenseCategoryId: params.expenseCategoryId,
      shopId: params.shopId,
      month: params.month,
      date: params.date,
      from: params.from,
      to: params.to,
    },
  });
}

/**
 * FR-06.6 — where an expense came from an approved staff claim, the response
 * carries that provenance. `claim` is null for one entered directly.
 */
export type ExpenseDetail = Expense & {
  notes: string | null;
  created_at: string;
  claim: {
    id: Id;
    description: string;
    bill_date: string;
    approval_date: string;
    submitted_by: string;
    approved_by: string;
  } | null;
};

export function getExpense(id: Id) {
  return apiFetch<ExpenseDetail>(`/expenses/${id}`);
}

/**
 * FR-09.1 — grouped by category ID, with the label returned for display.
 * Grouping by label would re-bucket every historical expense the moment someone
 * renamed a category.
 */
export type ExpenseByCategory = {
  /** Grouped by category id, but keyed and displayed by its retained code and
   * label — the id is not returned, and grouping by label would re-bucket every
   * historical expense the moment someone renamed a category. */
  code: string;
  label: string;
  total: Money;
  count: string;
};

export function expensesByCategory(year?: string) {
  return apiFetch<ExpenseByCategory[]>("/expenses/by-category", { query: { year } });
}

export type ExpenseInput = {
  date: string;
  amount: Money;
  description: string;
  expenseCategoryId: Id;
  /** Must be expense-scoped (BR-62). Optional — not every expense records how
   * it was settled. */
  paymentMethodId?: Id;
  paidTo?: string;
  receiptNumber?: string;
  notes?: string;
  /** Omitted means a business-wide cost (§10.2). */
  shopId?: Id;
};

export function createExpense(input: ExpenseInput) {
  return apiFetch<Expense>("/expenses", { method: "POST", body: input });
}

/** Manager-only. Editing the amount moves the ledger entry with it (BR-40). */
export function updateExpense(id: Id, input: Partial<ExpenseInput>) {
  return apiFetch<Expense>(`/expenses/${id}`, { method: "PATCH", body: input });
}

/** Manager-only. Deleting removes the ledger entry (BR-40). */
export function deleteExpense(id: Id) {
  return apiFetch<void>(`/expenses/${id}`, { method: "DELETE" });
}
