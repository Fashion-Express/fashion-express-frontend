import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Paginated } from "@/lib/api/types";

/**
 * The mockup draws its tables as CSS-grid rows of <span>s. This uses a real
 * <table> styled to match: a grid of spans has no row/column relationship for a
 * screen reader, and cannot be scrolled horizontally without breaking the
 * alignment that the design depends on.
 *
 * Wide tables scroll inside their own container so the page body never scrolls
 * sideways on a narrow screen.
 */

export function Table({
  head,
  children,
  className,
}: {
  head: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="-mx-5 overflow-x-auto sm:mx-0">
      <table
        className={cn("w-full min-w-[720px] border-collapse text-left", className)}
      >
        <thead>
          <tr className="border-b border-line">{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Th({
  children,
  align = "left",
  className,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-3 py-2.5 font-mono text-[9.5px] leading-tight font-medium tracking-[0.07em] text-muted uppercase",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-line transition-colors last:border-0 hover:bg-subtle-hover">
      {children}
    </tr>
  );
}

export function Td({
  children,
  align = "left",
  mono = false,
  strong = false,
  className,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  /** Amounts, quantities, dates and IDs — anything that should line up. */
  mono?: boolean;
  strong?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "px-3 py-3.5 align-middle text-[12px] text-ink-soft",
        mono && "font-mono tabular-nums",
        strong && "text-[13px] font-semibold text-ink",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      {children}
    </td>
  );
}

/** The mockup's "View · Edit" cell. */
export function RowActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 text-[11.5px]">{children}</div>
  );
}

export function RowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-sm text-accent no-underline hover:underline"
    >
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------------------
   Pagination — "Showing 4 of 4 shops" plus page pills, as the mockup has it.
   Links rather than buttons, so a page is a URL.
   --------------------------------------------------------------------------- */

export function Pagination<T>({
  page,
  noun,
  singular,
  basePath,
  searchParams = {},
}: {
  page: Paginated<T>;
  /** Plural noun for the count line: "shops", "customers". */
  noun: string;
  /**
   * The singular, when it is not just the plural without its "s" — "entries"
   * becomes "entry", not "entrie". Stripping the last letter is wrong often
   * enough that the caller says which word it wants.
   */
  singular?: string;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  const { page: current, total, totalPages, items } = page;

  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  // Long ranges collapse to a window around the current page; the mockup only
  // ever had one page to draw.
  const windowed = pageWindow(current, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <p className="font-mono text-[11.5px] text-faint">
        {total === 0
          ? `No ${noun}`
          : `Showing ${items.length} of ${total} ${total === 1 ? (singular ?? noun.replace(/s$/, "")) : noun}`}
      </p>

      {totalPages > 1 && (
        <nav className="flex items-center gap-1.5" aria-label="Pagination">
          {windowed.map((target, index) =>
            target === null ? (
              <span
                key={`gap-${index}`}
                className="px-1 font-mono text-[11.5px] text-faint"
              >
                …
              </span>
            ) : (
              <Link
                key={target}
                href={href(target)}
                aria-current={target === current ? "page" : undefined}
                className={cn(
                  "flex h-[30px] min-w-[30px] items-center justify-center rounded-lg px-2 font-mono text-[11.5px] no-underline transition-colors",
                  target === current
                    ? "bg-ink text-canvas"
                    : "border border-line text-ink-soft hover:bg-subtle",
                )}
              >
                {target}
              </Link>
            ),
          )}
        </nav>
      )}
    </div>
  );
}

function pageWindow(current: number, totalPages: number): Array<number | null> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, current]);
  if (current - 1 > 1) pages.add(current - 1);
  if (current + 1 < totalPages) pages.add(current + 1);

  const sorted = [...pages].sort((a, b) => a - b);
  const output: Array<number | null> = [];

  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) output.push(null);
    output.push(value);
  });

  return output;
}
