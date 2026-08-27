"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { ShopOption } from "@/lib/api/types";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { NavGroup } from "./nav";

/**
 * Holds the one piece of state the shell needs: whether the sidebar drawer is
 * open on a narrow screen.
 *
 * The mockup's artboards are a fixed 1440px with the rail always visible. Below
 * `lg` that rail would eat most of the viewport, so it becomes a drawer — the
 * markup is the same either way, only its container changes.
 */
export function ConsoleFrame({
  groups,
  user,
  dateLabel,
  shops,
  currentShopId,
  lowStockCount,
  signOutAction,
  children,
}: {
  groups: NavGroup[];
  user: { name: string; role: string; initials: string };
  dateLabel: string;
  shops: ShopOption[];
  currentShopId?: string;
  lowStockCount: number;
  signOutAction: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();

  /**
   * The drawer stores the path it was opened on rather than a boolean, so
   * navigating anywhere closes it by derivation — no effect, and no window
   * where the drawer covers the page it just moved to.
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const drawerOpen = openedOn === pathname;
  const setDrawerOpen = (open: boolean) => setOpenedOn(open ? pathname : null);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedOn(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const sidebar = (
    <Sidebar
      groups={groups}
      user={user}
      signOutAction={signOutAction}
      onNavigate={() => setDrawerOpen(false)}
    />
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <div className="hidden lg:block">{sidebar}</div>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-default bg-[rgb(26_23_20_/_0.5)]"
          />
          <div className="relative animate-fade-up">{sidebar}</div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          username={user.name}
          dateLabel={dateLabel}
          shops={shops}
          currentShopId={currentShopId}
          lowStockCount={lowStockCount}
          menuButton={
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
              className="flex size-9 cursor-pointer flex-col items-center justify-center gap-1 rounded-control border border-line lg:hidden"
            >
              <span className="h-px w-4 bg-ink-soft" />
              <span className="h-px w-4 bg-ink-soft" />
              <span className="h-px w-4 bg-ink-soft" />
            </button>
          }
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
