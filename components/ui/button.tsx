import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

/**
 * The mockup uses five button treatments, each with a job:
 *   accent  — the one action a screen exists for ("+ Add shop", "Save payment")
 *   dark    — a neutral commit ("Sign in", "Search"), and the primary on forms
 *             whose page already carries an accent action
 *   outline — "Cancel", "Reset"
 *   danger  — "Delete", and only after a confirmation step
 *   ghost   — inline row actions ("View · Edit")
 */
export type ButtonVariant = "accent" | "dark" | "outline" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  accent:
    "bg-accent text-accent-ink border-transparent hover:-translate-y-px hover:shadow-lift",
  dark: "bg-ink text-canvas border-transparent hover:opacity-90 hover:-translate-y-px",
  outline: "bg-surface text-ink-soft border-line hover:bg-subtle",
  danger: "bg-danger-bg text-danger border-transparent hover:brightness-95",
  ghost: "bg-transparent text-accent border-transparent hover:bg-subtle",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-filter px-3 text-xs",
  md: "h-control px-4 text-[12.5px]",
  lg: "h-tall px-5 text-sm",
};

function classes(
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth: boolean,
  className?: string,
): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-control border font-sans font-semibold",
    "whitespace-nowrap cursor-pointer transition-[transform,box-shadow,background-color,opacity] duration-150",
    "disabled:pointer-events-none disabled:opacity-55",
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export function Button({
  variant = "accent",
  size = "md",
  fullWidth = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={classes(variant, size, fullWidth, className)}
      {...props}
    />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

/** A link that looks like a button — navigation, so it stays an anchor. */
export function ButtonLink({
  variant = "accent",
  size = "md",
  fullWidth = false,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(classes(variant, size, fullWidth, className), "no-underline")}
      {...props}
    />
  );
}
