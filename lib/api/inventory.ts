import "server-only";

import { apiFetch } from "./client";
import type { Id, Money, Paginated, Quantity } from "./types";

/**
 * FR-04. Stock belongs to a SHOP, not to a shared warehouse — one product
 * carried by three shops is three records, with three quantities, three prices
 * and three movement histories.
 *
 * Two independent stock dimensions: loose units (three decimals, so part units
 * measure cleanly) and whole boxes. They are validated, deducted and logged
 * separately (BR-26).
 */
export type InventoryItem = {
  id: Id;
  /** Unique WITHIN the shop, not globally (BR-51) — a code alone does not
   * identify a product, so any lookup by code needs the shop too. */
  part_code: string;
  part_name: string;
  quantity: Quantity;
  box_count: number;
  purchase_price: Money;
  unit_price: Money;
  minimum_stock: number;
  /** BR-24 — at or below its OWN minimum, evaluated per shop (BR-52). */
  is_low_stock: boolean;
  stock_value: Money;
  shop_id: Id;
  shop_name: string;
  unit_code: string;
  unit_label: string;
  category_id: Id | null;
  category_name: string | null;
  supplier_id: Id | null;
  supplier_name: string | null;
};

/** FR-04.4 — describes the current FILTER, not the current page. */
export type InventorySummary = {
  product_count: string;
  total_quantity: Quantity;
  total_boxes: string;
  total_value: Money;
  low_stock_count: string;
};

export type InventoryPage = Paginated<InventoryItem> & {
  summary: InventorySummary;
};

export type InventoryListParams = {
  page?: number;
  search?: string;
  shopId?: Id;
  categoryId?: Id;
  lowStock?: boolean;
};

export function listInventory(params: InventoryListParams = {}) {
  return apiFetch<InventoryPage>("/inventory", {
    query: {
      page: params.page,
      search: params.search,
      shopId: params.shopId,
      categoryId: params.categoryId,
      lowStock: params.lowStock,
    },
  });
}

export function getInventoryItem(id: Id) {
  return apiFetch<InventoryItem>(`/inventory/${id}`);
}

/**
 * The line-item picker for a sale.
 *
 * Unlike the other `/options` endpoints this returns a richer row than
 * `{ id, label }` — the code, the quantity on hand, the unit and the current
 * selling price. All four are worth showing: a salesperson picking a line needs
 * to see what is left, and the price is what an empty line will default to.
 *
 * `shopId` is required — a sale may only draw on its own shop's stock (BR-50).
 */
export type InventoryOption = {
  id: Id;
  part_code: string;
  part_name: string;
  quantity: Quantity;
  box_count: number;
  unit_price: Money;
  unit_label: string;
};

export function listInventoryOptions(shopId: Id) {
  return apiFetch<InventoryOption[]>("/inventory/options", { query: { shopId } });
}

export function listLowStock(shopId?: Id, limit = 5) {
  return apiFetch<InventoryItem[]>("/inventory/low-stock", {
    query: { shopId, limit },
  });
}

export type InventoryInput = {
  partCode: string;
  partName: string;
  shopId: Id;
  unitId: Id;
  quantity?: Quantity;
  boxCount?: number;
  purchasePrice?: Money;
  unitPrice?: Money;
  minimumStock?: number;
  categoryId?: Id;
  supplierId?: Id;
};

export function createInventoryItem(input: InventoryInput) {
  return apiFetch<InventoryItem>("/inventory", { method: "POST", body: input });
}

/** `shopId` is refused with a 400: BR-54 fixes a record's shop at creation, and
 * moving stock between shops is a transfer, explicitly out of scope. */
export type InventoryUpdate = Omit<Partial<InventoryInput>, "shopId">;

export function updateInventoryItem(id: Id, input: InventoryUpdate) {
  return apiFetch<InventoryItem>(`/inventory/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export function deleteInventoryItem(id: Id) {
  return apiFetch<void>(`/inventory/${id}`, { method: "DELETE" });
}

/**
 * FR-04.5. Read-only, and there is no write route — BR-25: movements are
 * recorded automatically, never written by hand, edited or deleted.
 *
 * `quantity` is the ABSOLUTE amount moved; the sign comes from the transaction
 * type's `direction` (+1 in, −1 out, 0 either). Render from `direction` rather
 * than comparing the code to a string (FR-12.7.2).
 *
 * Each row carries only one dimension: a unit movement zeroes the box columns
 * and vice versa, which is what lets a five-unit move be told from a five-box
 * one.
 */
export type StockMovement = {
  id: Id;
  created_at: string;
  type_code: string;
  type_label: string;
  direction: 1 | -1 | 0;
  quantity: Quantity;
  previous_quantity: Quantity;
  new_quantity: Quantity;
  box_quantity: number;
  previous_box_quantity: number;
  new_box_quantity: number;
  reason: string;
  created_by: string;
};

/** Paginated at 20 (RD-12), newest first — note the flatter envelope. */
export type MovementPage = {
  items: StockMovement[];
  total: number;
  page: number;
  pageSize: number;
};

export function listMovements(id: Id, page = 1) {
  return apiFetch<MovementPage>(`/inventory/${id}/movements`, { query: { page } });
}
