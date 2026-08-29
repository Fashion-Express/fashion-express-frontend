"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { ShopOption } from "@/lib/api/types";

/**
 * Routes that ignore `?shopId=` entirely, where the switcher would be a control
 * that does nothing.
 *
 *  /shops      — the list IS the shops; filtering it by shop is circular.
 *  /suppliers  — FR-11.4, purchasing is done centrally for the business and a
 *                supplier belongs to no shop.
 *  /bills      — bill claims are not shop-scoped either (same rule), and their
 *                scope follows the CALLER's permissions rather than any URL
 *                parameter (FR-07).
 *  /reports    — the summary and the ledger are business-wide figures. The
 *                summary does carry a per-shop breakdown, but as a column in
 *                its own table, not as a filter over the page.
 *  /profile    — one account, not a shop's worth of anything.
 *  /settings   — a per-browser preference.
 *
 * Matched by prefix, so the detail and create screens underneath each one are
 * covered too. None of these pages reads `shopId` at all, and none preserves it
 * in its own filters, so nothing stale is left behind when the control
 * disappears.
 */
const SHOP_AGNOSTIC_ROUTES = [
  "/shops",
  "/suppliers",
  "/bills",
  "/reports",
  "/profile",
  "/settings",
];

function ignoresShopFilter(pathname: string): boolean {
  return SHOP_AGNOSTIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/**
 * The shop filter, which the mockup does not draw but the API requires: the
 * dashboard and every scoped list take `?shopId=` (FR-01.8, FR-11.5.1), and
 * without this control that filter is unreachable.
 *
 * It writes to the URL rather than to state, so a filtered view is a link —
 * shareable, bookmarkable, and correct after a reload. It also READS the URL
 * for its own selected value: this lives in the console layout, and a layout
 * cannot see `searchParams` in the App Router, so a `current` prop threaded
 * down from there is always undefined and the control shows "All shops" no
 * matter what the URL says. Reading it here is the only place that works.
 */
export function ShopSwitcher({ shops }: { shops: ShopOption[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const current = searchParams.get("shopId") ?? "";

  // One shop means no decision to make.
  if (shops.length < 2) return null;

  // Neither does a page that would ignore the answer.
  if (ignoresShopFilter(pathname)) return null;

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("shopId", value);
    else params.delete("shopId");
    // A new filter invalidates the page position.
    params.delete("page");

    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname));
  }

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">Filter by shop</span>
      <select
        value={shops.some((shop) => shop.id === current) ? current : ""}
        onChange={(event) => onChange(event.target.value)}
        disabled={pending}
        className="h-filter cursor-pointer rounded-control border border-line bg-surface px-2.5 font-sans text-[12px] text-ink-soft outline-none focus:border-accent disabled:opacity-60"
      >
        <option value="">All shops</option>
        {shops.map((shop) => (
          <option key={shop.id} value={shop.id}>
            {shop.name}
          </option>
        ))}
      </select>
    </label>
  );
}
