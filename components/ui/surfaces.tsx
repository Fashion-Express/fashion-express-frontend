import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* ---------------------------------------------------------------------------
   PageHeader — the mockup's white strip under the top bar: a monospaced
   breadcrumb eyebrow, the page title, and the screen's actions on the right.
   --------------------------------------------------------------------------- */

export function PageHeader({
  eyebrow,
  title,
  meta,
  actions,
}: {
  eyebrow: string;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-line bg-surface px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:gap-5 sm:px-7">
      <div className="min-w-0">
        <p className="font-mono text-[11px] tracking-[0.07em] text-eyebrow uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-sans text-[22px] leading-tight font-semibold tracking-[-0.02em] text-ink">
          {title}
        </h1>
        {meta && <div className="mt-1.5 text-[12px] text-muted">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** The scrolling body every console page sits in. */
export function PageBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-1 flex-col gap-4 px-5 py-5 sm:px-7", className)}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Card / FormCard
   --------------------------------------------------------------------------- */

export function Card({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-card border border-line bg-surface",
        className,
      )}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {typeof title === "string" ? (
            <h2 className="font-sans text-[13px] font-semibold text-ink">{title}</h2>
          ) : (
            title
          )}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * The mockup's form container: a solid dark header strip naming the section,
 * then the fields. Used on every add/edit screen.
 */
export function FormCard({
  title,
  children,
  footer,
  className,
}: {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-card border border-line bg-surface",
        className,
      )}
    >
      <h2 className="bg-ink px-5 py-3.5 font-sans text-[12.5px] font-semibold text-canvas">
        {title}
      </h2>
      <div className="flex flex-col gap-4 p-5">{children}</div>
      {footer && (
        <div className="flex justify-end gap-2.5 border-t border-line bg-subtle px-5 py-4">
          {footer}
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------------------
   DetailList — the label/value grid on every detail screen.
   --------------------------------------------------------------------------- */

export type Detail = { label: string; value: ReactNode; mono?: boolean };

export function DetailList({
  items,
  columns = 2,
}: {
  items: Detail[];
  columns?: 1 | 2 | 3;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-5",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="font-mono text-[10.5px] tracking-[0.06em] text-muted uppercase">
            {item.label}
          </dt>
          <dd
            className={cn(
              "mt-1.5 text-[13px] break-words text-ink",
              item.mono && "font-mono tabular-nums",
            )}
          >
            {item.value ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------------------------------------------------------------------
   StatTile — the dashboard KPI, and the three-up totals above a list.
   --------------------------------------------------------------------------- */

export type StatTone = "neutral" | "accent" | "success" | "danger" | "warning" | "info";

const TILE_BAR: Record<StatTone, string> = {
  neutral: "bg-faint",
  accent: "bg-accent",
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
};

export function StatTile({
  label,
  value,
  note,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  tone?: StatTone;
}) {
  return (
    <div className="relative overflow-hidden rounded-card border border-line bg-surface p-4">
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-[3px]", TILE_BAR[tone])}
      />
      <p className="font-mono text-[9.5px] tracking-[0.1em] text-muted uppercase">
        {label}
      </p>
      <p className="mt-2 font-mono text-[22px] leading-none font-semibold tabular-nums text-ink">
        {value}
      </p>
      {note && <p className="mt-2 text-[11px] text-faint">{note}</p>}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   StatusPill
   --------------------------------------------------------------------------- */

export type PillTone = "neutral" | "success" | "danger" | "warning" | "info" | "accent";

const PILL: Record<PillTone, string> = {
  neutral: "bg-subtle text-muted",
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
  warning: "bg-warning-bg text-warning",
  info: "bg-info-bg text-info",
  accent: "bg-accent/10 text-accent",
};

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: PillTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-badge px-2 py-1 font-mono text-[10px] font-medium tracking-[0.04em] whitespace-nowrap uppercase",
        PILL[tone],
      )}
    >
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Alert — form-level errors, and the API's own explanatory notes.
   --------------------------------------------------------------------------- */

export function Alert({
  tone = "danger",
  title,
  children,
}: {
  tone?: "danger" | "warning" | "info" | "success";
  title?: string;
  children?: ReactNode;
}) {
  const tones = {
    danger: "border-danger/25 bg-danger-bg text-danger",
    warning: "border-warning/25 bg-warning-bg text-warning",
    info: "border-info/25 bg-info-bg text-info",
    success: "border-success/25 bg-success-bg text-success",
  } as const;

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("rounded-control border px-3.5 py-3 text-[12px] leading-relaxed", tones[tone])}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   EmptyState
   --------------------------------------------------------------------------- */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-card border border-dashed border-line px-6 py-14 text-center">
      <p className="font-sans text-[14px] font-semibold text-ink">{title}</p>
      {description && (
        <p className="max-w-sm text-[12.5px] leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Tabs — the customer profile's Profile / Orders switch. Real links, so each
   tab is its own URL and can be shared, bookmarked and reloaded.
   --------------------------------------------------------------------------- */

export function TabLinks({
  tabs,
  current,
}: {
  tabs: Array<{ href: string; label: string }>;
  current: string;
}) {
  return (
    <nav className="flex gap-1 border-b border-line" aria-label="Sections">
      {tabs.map((tab) => {
        const active = tab.href === current;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3.5 py-2.5 text-[12.5px] font-medium no-underline transition-colors",
              active
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
