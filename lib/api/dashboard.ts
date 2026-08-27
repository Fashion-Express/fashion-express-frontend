import "server-only";

import { apiFetch } from "./client";
import type { Id, Money, Quantity } from "./types";

/**
 * FR-01. The route carries no permission decorator on purpose: what you see is
 * decided by your permissions *inside* the endpoint, so a user with only
 * bill-claim rights gets a reduced view rather than a 403 on the landing page.
 *
 * Check `reduced` before reading anything else — the other keys are absent.
 */

export type ReducedDashboard = {
  reduced: true;
  reason: string;
  actions: Array<{ label: string; path: string; method: string }>;
  myClaims: { pending: string; approved: string; rejected: string };
};

export type FullDashboard = {
  reduced: false;
  shopId: Id | null;
  headline: {
    active_employees: string;
    active_customers: string;
    inventory_items: string;
    low_stock_count: string;
    stock_value: Money;
  };
  sales: {
    /** Counts include drafts and quotations — that is the point of the tile. */
    draft_count: string;
    quotation_count: string;
    finalized_count: string;
    /** The Asia/Dhaka day (NFR-05), not the UTC one. */
    finalized_today: Money;
    invoiced: Money;
    outstanding: Money;
  };
  /**
   * FR-11.4 — expenses and bill claims are NOT shop-scoped, so these figures
   * cover the whole business no matter what the shop filter says. The API ships
   * a `note` saying so; label these tiles business-wide or the number lies.
   */
  businessWide: {
    note: string;
    expenses_this_month: Money;
    claims_awaiting_review: string;
    claims_awaiting_value: Money;
  };
  topProducts: Array<{
    label: string;
    item_type: "inventory" | "non_inventory";
    quantity_sold: Quantity;
    value_sold: Money;
  }>;
  lowStock: Array<Record<string, unknown>>;
  recentSales: Array<Record<string, unknown>>;
  recentExpenses: Array<Record<string, unknown>>;
};

export type Dashboard = ReducedDashboard | FullDashboard;

export function getDashboard(shopId?: Id) {
  return apiFetch<Dashboard>("/dashboard", { query: { shopId } });
}

/**
 * FR-01.6 — the low-stock count has to be visible on every page, not only the
 * dashboard. This is the cheap endpoint a layout can call for that banner;
 * there is a partial index behind it precisely because it runs on every load.
 */
export function getLowStockCount(shopId?: Id) {
  return apiFetch<{ count: number }>("/low-stock-count", { query: { shopId } });
}
