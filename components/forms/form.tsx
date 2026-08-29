"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";

/**
 * A submit button that disables itself while its form is in flight, so a slow
 * save cannot be submitted twice. `useFormStatus` reads the state of the
 * enclosing <form>, which is why this has to be its own client component.
 *
 * `disabled` is OR-ed with `pending` rather than left to the spread. A caller
 * passing its own condition — `disabled={isSelf}`, `disabled={!dirty}` — used
 * to overwrite the pending state with `false` the moment that condition
 * cleared, silently removing the double-submit guard from exactly the forms
 * careful enough to have a second one.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "accent",
  disabled,
  ...props
}: Omit<ComponentProps<typeof Button>, "type"> & {
  pendingLabel?: string;
  variant?: ButtonVariant;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      {...props}
      disabled={pending || disabled}
    >
      {pending ? (pendingLabel ?? "Saving…") : children}
    </Button>
  );
}

/** Cancel, as a link back to wherever the form came from. */
export function FormCancel({ href, label = "Cancel" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      className="inline-flex h-control cursor-pointer items-center justify-center rounded-control border border-line bg-surface px-4 font-sans text-[12.5px] font-semibold text-ink-soft no-underline transition-colors hover:bg-subtle"
    >
      {label}
    </a>
  );
}
