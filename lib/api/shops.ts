import "server-only";

import { apiFetch } from "./client";
import type { Id, Paginated, ShopOption } from "./types";

/**
 * FR-11. A shop is deliberately thin — a *scope* for other records rather than
 * a record with substance of its own: two fields, a status, and the counts of
 * what it holds.
 *
 * Note for anyone comparing against the mockup: the mockup's shop screens show
 * a "SHOP ID SHP-001" and an "ADDRESS". The API has neither. The identifier is
 * the plain row id, and what the mockup labels address is `description`.
 */
export type Shop = {
  id: Id;
  name: string;
  description: string;
  is_active: boolean;
  /**
   * FR-11.2.2 — carried on the list response so the consequences of
   * deactivating a shop are visible before acting. They arrive as strings.
   */
  customer_count: string;
  inventory_count: string;
  sale_count: string;
  staff_count: string;
};

export type ShopListParams = {
  page?: number;
  search?: string;
  isActive?: boolean;
};

export function listShops(params: ShopListParams = {}) {
  return apiFetch<Paginated<Shop>>("/shops", {
    query: {
      page: params.page,
      search: params.search,
      // Boolean query params take true/false. Anything else is a 400 rather
      // than a guess, so an undefined filter must be omitted entirely.
      isActive: params.isActive,
    },
  });
}

export function getShop(id: Id) {
  return apiFetch<Shop>(`/shops/${id}`);
}

/**
 * Active shops for the pickers. Needs no `view_shop` permission by design —
 * anyone creating a customer or a product has to choose a shop (BR-49), so
 * gating this would make the day-to-day screens unusable.
 */
export function listShopOptions() {
  return apiFetch<ShopOption[]>("/shops/options");
}

export type ShopInput = {
  name: string;
  description?: string;
};

export function createShop(input: ShopInput) {
  return apiFetch<Shop>("/shops", { method: "POST", body: input });
}

export function updateShop(id: Id, input: Partial<ShopInput> & { isActive?: boolean }) {
  return apiFetch<Shop>(`/shops/${id}`, { method: "PATCH", body: input });
}

/**
 * BR-48 — a shop holding any customer, product, sale or staff account cannot be
 * deleted, and the 409 says exactly what is in the way. Show that message as it
 * stands; it is written for the user and names the alternative (deactivate).
 */
export function deleteShop(id: Id) {
  return apiFetch<void>(`/shops/${id}`, { method: "DELETE" });
}

/** Whether this shop can be deleted at all, from counts already in hand. */
export function shopHoldings(shop: Shop): Array<{ label: string; count: number }> {
  return [
    { label: "customer", count: Number(shop.customer_count) },
    { label: "product", count: Number(shop.inventory_count) },
    { label: "sale", count: Number(shop.sale_count) },
    { label: "staff account", count: Number(shop.staff_count) },
  ].filter((entry) => entry.count > 0);
}
