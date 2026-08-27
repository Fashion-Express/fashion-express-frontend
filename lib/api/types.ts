import type { Money, Quantity } from "@/lib/format/money";

/**
 * Shapes shared by every endpoint.
 *
 * Two conventions run through the whole API and are preserved here rather than
 * normalised away:
 *
 *  - **Reads are snake_case, writes are camelCase.** `GET /customers` returns
 *    `status_code`; `POST /customers` takes `statusCode`. A recursive
 *    case-transformer would hide that difference and mangle a field one day, so
 *    the two shapes are typed separately and mapped explicitly.
 *  - **IDs, money and quantities are strings.** 64-bit integers and decimals
 *    both lose precision as JSON numbers.
 */

export type Id = string;

export type { Money, Quantity };

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/** Every list endpoint paginates at 10. */
export const PAGE_SIZE = 10;

/** The shape of `/options` endpoints that feed a picker. */
export type Option = { id: Id; label: string };

/** Shops use `name` rather than `label` in theirs. */
export type ShopOption = { id: Id; name: string };

export function emptyPage<T>(): Paginated<T> {
  return { items: [], page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 };
}

/** Read a 1-based page number out of a searchParams value. */
export function pageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

/** Narrow a searchParams entry to a single string. */
export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.trim() !== "" ? raw : undefined;
}
