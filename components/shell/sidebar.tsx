"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { IMPLEMENTED, type NavGroup } from "./nav";

/**
 * The mockup's 236px near-black rail. It stays dark in both themes — it is the
 * console's shell, not a surface that follows the palette.
 *
 * Filtering by permission happens on the server; this receives the groups it
 * should draw. It is a client component only so it can read the current path.
 */
export function Sidebar({
  groups,
  user,
  signOutAction,
  onNavigate,
}: {
  groups: NavGroup[];
  user: { name: string; role: string; initials: string };
  signOutAction: () => Promise<void>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  /**
   * The ONE item to highlight: the longest href that the current path sits
   * under.
   *
   * A plain per-item `startsWith` lights up every ancestor as well — on
   * /bills/review both "Review bills" and "My bills" (/bills) matched, so two
   * entries appeared selected and two carried `aria-current="page"`, which is
   * a lie to a screen reader as much as it is to the eye. Sorting by length
   * and taking the first picks the most specific match, so a nested route
   * highlights its own entry and a route with no entry of its own (/bills/submit,
   * /reports/ledger) still highlights the section it belongs to.
   */
  const activeHref = groups
    .flatMap((group) => group.items.map((item) => item.href))
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div className="flex h-full w-sidebar flex-none flex-col gap-5 overflow-y-auto bg-shell px-3.5 py-5">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-2 no-underline"
      >
        <span className="flex size-[26px] items-center justify-center rounded-[8px] bg-accent font-sans text-xs font-bold text-accent-ink">
          F
        </span>
        <span className="font-sans text-[13px] font-semibold tracking-[-0.01em] text-shell-ink">
          Fashion Express
        </span>
      </Link>

      <nav className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="px-2 pb-2 font-mono text-[9.5px] font-medium tracking-[0.12em] text-shell-label uppercase">
              {group.label}
            </p>

            {group.items.map((item) => {
              const active = item.href === activeHref;
              const ready = IMPLEMENTED.has(item.href);

              if (!ready) {
                return (
                  <span
                    key={item.href}
                    title="Not built yet"
                    className="flex cursor-not-allowed items-center gap-2.5 rounded-[9px] px-2 py-2.5 opacity-40"
                  >
                    <span className="size-[15px] flex-none rounded-[5px] border-[1.5px] border-shell-muted opacity-55" />
                    <span className="flex-1 font-sans text-[12.5px] font-medium text-shell-muted">
                      {item.label}
                    </span>
                    <span className="font-mono text-[8.5px] tracking-wider text-shell-faint uppercase">
                      Soon
                    </span>
                  </span>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-[9px] px-2 py-2.5 no-underline transition-colors duration-150",
                    active ? "bg-shell-active" : "hover:bg-shell-hover",
                  )}
                >
                  <span
                    className={cn(
                      "size-[15px] flex-none rounded-[5px] border-[1.5px] opacity-55",
                      active
                        ? "border-accent bg-accent"
                        : "border-shell-muted bg-transparent",
                    )}
                  />
                  <span
                    className={cn(
                      "flex-1 font-sans text-[12.5px] font-medium",
                      active ? "text-shell-ink" : "text-shell-muted",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-1.5">
        <form action={signOutAction}>
          <button
            type="submit"
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-[9px] px-2 py-2.5 text-left transition-colors hover:bg-shell-hover"
          >
            <span className="size-[15px] flex-none rounded-[5px] border-[1.5px] border-shell-muted opacity-55" />
            <span className="flex-1 font-sans text-[12.5px] font-medium text-shell-muted">
              Log out
            </span>
          </button>
        </form>

        <div className="flex items-center gap-2.5 rounded-[10px] px-2 py-2">
          <span className="flex size-[26px] flex-none items-center justify-center rounded-full bg-shell-avatar font-mono text-[10.5px] font-semibold text-shell-muted">
            {user.initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-sans text-[11.5px] font-medium text-shell-ink">
              {user.name}
            </span>
            <span className="block font-mono text-[9.5px] text-shell-faint">
              {user.role}
            </span>
          </span>
          <span className="size-[5px] flex-none rounded-full bg-[#14A06E]" />
        </div>
      </div>
    </div>
  );
}
