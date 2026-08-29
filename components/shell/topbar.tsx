import Link from "next/link";
import type { ReactNode } from "react";
import type { ShopOption } from "@/lib/api/types";
import { ShopSwitcher } from "./shop-switcher";
import { UserMenu } from "./user-menu";

/**
 * The mockup's 66px white strip. It carries the page's own title (set per page),
 * the shop filter, and the low-stock warning.
 */
export function Topbar({
  user,
  /** Formatted on the server: the Dhaka date, rendered once, no hydration drift. */
  dateLabel,
  shops,
  lowStockCount,
  menuButton,
  signOutAction,
}: {
  user: { username: string; name: string; role: string; initials: string };
  dateLabel: string;
  shops: ShopOption[];
  lowStockCount: number;
  menuButton?: ReactNode;
  signOutAction: () => Promise<void>;
}) {
  return (
    <header className="flex h-topbar flex-none items-center gap-4 border-b border-line bg-surface px-5 sm:px-7">
      {menuButton}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-sans text-[15px] leading-none font-semibold tracking-[-0.015em] text-ink">
          Fashion Express
        </span>
        <span className="font-mono text-[11px] leading-none text-faint">
          {dateLabel}
        </span>
      </div>

      {/*
        FR-01.6 — the low-stock count must be visible on EVERY page, not only
        the dashboard, so it lives in the shell rather than on one screen.
      */}
      {lowStockCount > 0 && (
        <Link
          href="/inventory?stock=low"
          className="hidden items-center gap-2 rounded-control border border-warning/25 bg-warning-bg px-3 py-1.5 no-underline sm:flex"
        >
          <span className="size-1.5 rounded-full bg-warning" />
          <span className="font-mono text-[11px] font-medium text-warning">
            {lowStockCount} low stock
          </span>
        </Link>
      )}

      <ShopSwitcher shops={shops} />

      <UserMenu
        username={user.username}
        displayName={user.name}
        role={user.role}
        initials={user.initials}
        signOutAction={signOutAction}
      />
    </header>
  );
}
