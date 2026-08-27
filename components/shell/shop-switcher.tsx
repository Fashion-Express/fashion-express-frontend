"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import type { ShopOption } from "@/lib/api/types";

/**
 * The shop filter, which the mockup does not draw but the API requires: the
 * dashboard and every scoped list take `?shopId=` (FR-01.8, FR-11.5.1), and
 * without this control that filter is unreachable.
 *
 * It writes to the URL rather than to state, so a filtered view is a link —
 * shareable, bookmarkable, and correct after a reload.
 */
export function ShopSwitcher({
  shops,
  current,
}: {
  shops: ShopOption[];
  current?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // One shop means no decision to make.
  if (shops.length < 2) return null;

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
        value={current ?? ""}
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
