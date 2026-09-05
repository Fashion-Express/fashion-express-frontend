"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { IMPLEMENTED, type NavGroup } from "./nav";
import { NAV_ICON } from "./nav-icons";

/**
 * The mockup's near-black rail. It stays dark in both themes — it is the
 * console's shell, not a surface that follows the palette.
 *
 * It rests at 68px, showing icons only, and widens to 236px while it is
 * hovered. The 68px is held by an outer spacer while the rail itself is
 * absolutely positioned inside it, so widening OVERLAYS the page rather than
 * pushing it: nothing reflows, and the shadow tells the eye the rail is
 * floating above the content it covers.
 *
 * A KEYBOARD focus opens it as well as `:hover`. The mockup only tracks the
 * pointer, which would leave a keyboard user tabbing through sixteen links
 * whose labels are at `opacity: 0`. The labels are always in the DOM — hidden
 * by opacity, never by `display` — so a screen reader reads the rail in full
 * whatever its width, and each row repeats its label in `title` for a pointer
 * hovering a lone icon.
 *
 * That is `:has(:focus-visible)` and NOT `:focus-within`, which was wrong in a
 * way only clicking showed: a click focuses the link it lands on and that focus
 * outlives the navigation, so the rail stayed open after the pointer left and
 * only shut when something else was clicked. `:focus-visible` is the browser's
 * own answer to "was this focus reached by keyboard", which is the question
 * being asked — a mouse leaves nothing behind, a Tab still opens the rail.
 *
 * Filtering by permission happens on the server; this receives the groups it
 * should draw. It is a client component only so it can read the current path.
 */
export function Sidebar({
  groups,
  user,
  badges,
  expanded = false,
  signOutAction,
  onNavigate,
}: {
  groups: NavGroup[];
  user: { name: string; role: string; initials: string };
  /** Counts to hang off a row, by href. A row with no entry shows no badge. */
  badges?: Record<string, number>;
  /**
   * Pin the rail open. The narrow-screen drawer has no pointer to hover with
   * and no page beside it to overlay, so it is drawn at its full width.
   */
  expanded?: boolean;
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

  /**
   * Everything that is only readable once the rail is wide: it fades in and
   * slides the last 6px into place. Applied to the text of every row, so the
   * whole column arrives as one movement rather than sixteen.
   */
  const reveal = expanded
    ? ""
    : "-translate-x-1.5 opacity-0 transition-[opacity,transform] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:translate-x-0 group-hover:opacity-100 group-has-[:focus-visible]:translate-x-0 group-has-[:focus-visible]:opacity-100";

  return (
    <div
      className={cn(
        "group relative z-[5] h-full flex-none self-stretch",
        expanded ? "w-sidebar" : "w-rail",
      )}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 flex flex-col overflow-hidden bg-shell pt-3 pb-2.5",
          "transition-[width,box-shadow] duration-[260ms] ease-[cubic-bezier(.2,.8,.2,1)]",
          expanded
            ? "w-sidebar"
            : "w-rail group-hover:w-sidebar group-hover:shadow-rail group-has-[:focus-visible]:w-sidebar group-has-[:focus-visible]:shadow-rail",
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          title="Fashion Express"
          className="flex h-[38px] flex-none items-center gap-[11px] px-4 no-underline"
        >
          <span className="flex size-[30px] flex-none items-center justify-center rounded-[9px] bg-accent font-sans text-[13px] font-bold text-accent-ink">
            F
          </span>
          {/*
            The mockup captions this with "HEAD OFFICE · V2.4". Nothing in the
            session or `business_settings` says which office a user is in, and
            the shop filter lives in the top bar, so the caption is left out
            rather than invented.
          */}
          <span
            className={cn(
              reveal,
              "block min-w-0 font-sans text-[13px] leading-[1.2] font-semibold tracking-[-0.01em] whitespace-nowrap text-shell-ink",
            )}
          >
            Fashion Express
          </span>
        </Link>

        <div className="mx-3.5 mt-2.5 mb-[9px] h-px flex-none bg-[rgb(255_255_255_/_0.07)]" />

        <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto px-3">
          {groups.map((group, index) => (
            <div key={group.label} className="contents">
              {/*
                The heading doubles as the rule between two groups, which is
                why the first one has none — there is nothing above it to
                divide. Permission filtering can drop whole groups, so this
                follows the position of what is DRAWN, not of what is defined.
              */}
              {index > 0 && (
                <div className="flex h-[22px] min-h-[22px] flex-none items-center gap-2.5 px-2.5">
                  <span className="h-px w-[22px] flex-none bg-[rgb(255_255_255_/_0.13)]" />
                  <span
                    className={cn(
                      reveal,
                      "min-w-0 flex-1 font-mono text-[9px] leading-none font-medium tracking-[0.14em] whitespace-nowrap text-shell-label uppercase",
                    )}
                  >
                    {group.label}
                  </span>
                </div>
              )}

              {group.items.map((item) => {
                const active = item.href === activeHref;
                const ready = IMPLEMENTED.has(item.href);
                const badge = badges?.[item.href];

                if (!ready) {
                  return (
                    <span
                      key={item.href}
                      title={`${item.label} — not built yet`}
                      className="flex h-8 min-h-8 flex-none cursor-not-allowed items-center gap-3 rounded-[10px] px-2.5 opacity-40"
                    >
                      <NavIcon d={item.icon} className="text-shell-muted" />
                      <span
                        className={cn(
                          reveal,
                          "min-w-0 flex-1 truncate font-sans text-[12.5px] leading-none font-medium text-shell-muted",
                        )}
                      >
                        {item.label}
                      </span>
                      <span
                        className={cn(
                          reveal,
                          "flex-none font-mono text-[8.5px] tracking-wider text-shell-faint uppercase",
                        )}
                      >
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
                    title={item.label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-8 min-h-8 flex-none items-center gap-3 rounded-[10px] px-2.5 no-underline transition-colors duration-150",
                      active ? "bg-shell-active" : "hover:bg-shell-hover",
                    )}
                  >
                    {/* The accent tab bitten out of the rail's left edge. */}
                    <span
                      className={cn(
                        "absolute top-1/2 left-0 -mt-2 h-4 w-[2.5px] rounded-r-[3px]",
                        active ? "bg-accent" : "bg-transparent",
                      )}
                    />
                    <NavIcon
                      d={item.icon}
                      className={active ? "text-accent" : "text-shell-muted"}
                    />
                    <span
                      className={cn(
                        reveal,
                        "min-w-0 flex-1 truncate font-sans text-[12.5px] leading-none tracking-[-0.005em]",
                        active ? "font-semibold text-shell-ink" : "font-medium text-shell-muted",
                      )}
                    >
                      {item.label}
                    </span>

                    {badge !== undefined && badge > 0 && (
                      <>
                        <span
                          className={cn(
                            reveal,
                            "flex-none rounded-badge bg-[rgb(255_255_255_/_0.1)] px-[5px] py-[3px] font-mono text-[9.5px] leading-none font-semibold text-shell-ink tabular-nums",
                          )}
                        >
                          {badge}
                        </span>
                        {/*
                          The count itself does not fit at 68px, so the
                          collapsed rail keeps only the fact that there is one.
                        */}
                        {!expanded && (
                          <span className="absolute top-[7px] right-2 size-[5px] rounded-full bg-accent transition-opacity duration-200 group-hover:opacity-0 group-has-[:focus-visible]:opacity-0" />
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-2 flex flex-none flex-col gap-1.5 px-3">
          <div className="mx-0.5 h-px bg-[rgb(255_255_255_/_0.07)]" />

          <form action={signOutAction}>
            <button
              type="submit"
              title="Log out"
              className="flex h-8 w-full cursor-pointer items-center gap-3 rounded-[10px] px-2.5 text-left transition-colors duration-150 hover:bg-shell-hover"
            >
              <NavIcon d={NAV_ICON.signOut} className="text-shell-muted" />
              <span
                className={cn(
                  reveal,
                  "font-sans text-[12.5px] leading-none font-medium whitespace-nowrap text-shell-muted",
                )}
              >
                Log out
              </span>
            </button>
          </form>

          <div className="flex items-center gap-[11px] rounded-[11px] bg-[rgb(255_255_255_/_0.05)] px-2.5 py-[7px] transition-colors hover:bg-[rgb(255_255_255_/_0.09)]">
            <span className="relative flex size-7 flex-none items-center justify-center rounded-full bg-shell-avatar font-mono text-[10.5px] font-semibold text-shell-muted">
              {user.initials}
              {/* Signed in. It rides the avatar so it survives the collapse. */}
              <span className="absolute -right-px -bottom-px size-2 rounded-full border-[1.5px] border-shell bg-[#14A06E]" />
            </span>
            <span className={cn(reveal, "block min-w-0 flex-1")}>
              <span className="block truncate font-sans text-[11.5px] leading-[1.2] font-medium text-shell-ink">
                {user.name}
              </span>
              <span className="block truncate font-mono text-[9.5px] leading-[1.3] text-shell-faint uppercase">
                {user.role}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One 20x20 stroked path, sized to the 22px column the labels align against.
 * `currentColor` lets the row decide the colour, so the active state is a
 * single class on the wrapper rather than a second icon.
 */
function NavIcon({ d, className }: { d: string; className?: string }) {
  return (
    <span
      className={cn("flex size-[22px] flex-none items-center justify-center", className)}
    >
      <svg
        viewBox="0 0 20 20"
        width="17"
        height="17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={d} />
      </svg>
    </span>
  );
}
