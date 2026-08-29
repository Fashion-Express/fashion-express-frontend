"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The signed-in user's menu, sitting after the shop switcher in the top bar.
 *
 * The three destinations are deliberately not the same thing:
 *  - Profile is a page, because it is a record to read and sometimes edit.
 *  - Update password is its own page rather than a dialog, so it is linkable
 *    and survives a reload — a half-typed password dialog that vanishes on a
 *    stray click is a bad place to lose your work.
 *  - Logging out is a form posting to a Server Action, NOT a link. It mutates
 *    (it revokes the session upstream and clears the cookie), and a GET that
 *    mutates is one prefetch away from signing people out by accident.
 */
export function UserMenu({
  username,
  displayName,
  role,
  initials,
  signOutAction,
}: {
  username: string;
  displayName: string;
  role: string;
  initials: string;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * The path the menu was opened on, rather than a boolean, so navigating
   * closes it by derivation — the same trick the sidebar drawer uses. Without
   * it the menu stays open over the page it just moved to.
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpenedOn(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenedOn(null);
    }

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative flex-none">
      <button
        type="button"
        onClick={() => setOpenedOn(open ? null : pathname)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex h-filter cursor-pointer items-center gap-2 rounded-control border px-2 transition-colors sm:px-2.5",
          open ? "border-line-strong bg-subtle" : "border-line bg-surface hover:bg-subtle",
        )}
      >
        <span className="flex size-[22px] flex-none items-center justify-center rounded-full bg-ink font-mono text-[9.5px] font-semibold text-canvas">
          {initials}
        </span>
        {/* The username, not the display name: it is what the person signs in
            with and what every audit line in the console shows them as. */}
        <span className="hidden max-w-[140px] truncate font-mono text-[12px] text-ink-soft sm:block">
          {username}
        </span>
        <span aria-hidden className="text-[9px] leading-none text-faint">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute top-[calc(100%+6px)] right-0 z-50 flex w-[236px] animate-fade-up flex-col overflow-hidden rounded-card border border-line bg-surface shadow-modal"
        >
          <div className="flex flex-col gap-0.5 border-b border-line px-3.5 py-3">
            <span className="truncate font-sans text-[12.5px] font-semibold text-ink">
              {displayName || username}
            </span>
            <span className="truncate font-mono text-[10.5px] text-faint">
              {username} · {role}
            </span>
          </div>

          <div className="flex flex-col py-1">
            <MenuLink href="/profile" onNavigate={() => setOpenedOn(null)}>
              Profile
            </MenuLink>
            <MenuLink href="/profile/password" onNavigate={() => setOpenedOn(null)}>
              Update password
            </MenuLink>
          </div>

          <form action={signOutAction} className="border-t border-line py-1">
            <button
              type="submit"
              role="menuitem"
              className="w-full cursor-pointer px-3.5 py-2.5 text-left font-sans text-[12.5px] font-medium text-danger transition-colors hover:bg-subtle"
            >
              Logout
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className="px-3.5 py-2.5 font-sans text-[12.5px] font-medium text-ink-soft no-underline transition-colors hover:bg-subtle"
    >
      {children}
    </Link>
  );
}
