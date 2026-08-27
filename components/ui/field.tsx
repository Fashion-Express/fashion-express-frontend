import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The mockup's form line: a small monospaced uppercase label above the control,
 * with the error taking the place the hint would occupy.
 *
 * The label, the control and the error are wired together with ids so a screen
 * reader announces the problem when focus lands on the input — the mockup shows
 * a red border, which on its own tells a non-sighted user nothing.
 */

type FieldProps = {
  /** The form field name. Doubles as the element id, so no hook is needed and
   * this renders as a Server Component. */
  name: string;
  label: string;
  /** Marks the control required, and adds the asterisk the mockup uses. */
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: (props: {
    id: string;
    name: string;
    required?: boolean;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
  }) => ReactNode;
};

export function Field({
  name,
  label,
  required = false,
  error,
  hint,
  className,
  children,
}: FieldProps) {
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="font-mono text-[10.5px] font-medium tracking-[0.06em] text-muted uppercase">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>

      {children({
        id,
        name,
        required: required || undefined,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}

      {error ? (
        <p id={errorId} className="font-sans text-[11.5px] leading-snug text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="font-sans text-[11.5px] leading-snug text-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Controls
   --------------------------------------------------------------------------- */

const CONTROL = [
  "w-full rounded-control border border-line bg-surface px-3",
  "font-sans text-[12.5px] text-ink placeholder:text-faint",
  "transition-[border-color,box-shadow] duration-150 outline-none",
  "focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_12%,transparent)]",
  "aria-[invalid=true]:border-danger aria-[invalid=true]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--danger)_14%,transparent)]",
  "disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted",
].join(" ");

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, "h-input", className)} {...props} />;
}

/**
 * Amounts, quantities and reference numbers are monospaced in the mockup so the
 * digits line up. Values still travel as strings end to end.
 */
export function NumericInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      inputMode="decimal"
      className={cn(CONTROL, "h-input font-mono tabular-nums", className)}
      {...props}
    />
  );
}

export function DateInput({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="date"
      className={cn(CONTROL, "h-input font-mono", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(CONTROL, "h-input cursor-pointer pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cn(CONTROL, "resize-y py-2.5", className)} {...props} />;
}

/**
 * A value that cannot be edited but must still be seen — a customer's issued
 * number, or the shop a record is locked to. Rendered as text rather than a
 * disabled input, because a disabled input invites a fight with it.
 */
export function ReadOnlyValue({
  children,
  mono = false,
}: {
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-input items-center rounded-control border border-dashed border-line bg-subtle px-3 text-[12.5px] text-muted",
        mono && "font-mono",
      )}
    >
      {children}
    </div>
  );
}
