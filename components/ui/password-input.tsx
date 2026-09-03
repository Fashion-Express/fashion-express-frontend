"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";

/**
 * A password box with a reveal toggle.
 *
 * This lives apart from the other controls in `field.tsx` on purpose: the
 * toggle needs state, and marking that module `"use client"` would break every
 * `<Field>` in the app — `Field` takes its control as a render-prop *function*,
 * and a Server Component cannot pass a function across a client boundary.
 * `Input` itself carries no directive, so it renders happily on either side and
 * is reused here rather than duplicating the control styling.
 *
 * Reveal is deliberately per-field and resets on every mount: nothing about the
 * choice is persisted, so a shared screen never comes back with the password
 * already showing.
 */
export function PasswordInput({ className, ...props }: ComponentProps<"input">) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        type={revealed ? "text" : "password"}
        /* Room for the button, so a long password never runs under it. */
        className={cn("pr-10", className)}
      />

      <button
        type="button"
        /*
         * `type="button"` is load-bearing. A bare <button> inside a <form>
         * defaults to type="submit", so the toggle would sign the user in
         * instead of showing the password.
         */
        onClick={() => setRevealed((shown) => !shown)}
        aria-label={revealed ? "Hide password" : "Show password"}
        aria-pressed={revealed}
        aria-controls={props.id}
        title={revealed ? "Hide password" : "Show password"}
        className={cn(
          "absolute inset-y-0 right-1.5 my-auto flex size-7 items-center justify-center",
          "rounded-control text-faint transition-colors outline-none",
          "hover:text-ink focus-visible:text-ink",
          "focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)]",
        )}
      >
        {revealed ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

/* Stroked rather than filled, unlike the print icon: an eye reads as an outline
   at this size, and the crossed-out variant needs a slash that a fill cannot
   express cleanly. */
const ICON = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "size-4",
  "aria-hidden": true,
} as const;

function EyeIcon() {
  return (
    <svg {...ICON}>
      <path d="M1.5 8S3.9 3.75 8 3.75 14.5 8 14.5 8s-2.4 4.25-6.5 4.25S1.5 8 1.5 8Z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg {...ICON}>
      <path d="M6.9 3.9A6.7 6.7 0 0 1 8 3.75c4.1 0 6.5 4.25 6.5 4.25a12.1 12.1 0 0 1-1.98 2.52" />
      <path d="M4.24 4.94A11.7 11.7 0 0 0 1.5 8s2.4 4.25 6.5 4.25c1.06 0 2-.19 2.82-.5" />
      <path d="M9.44 9.54a2 2 0 0 1-2.85-2.8" />
      <path d="M2 2l12 12" />
    </svg>
  );
}
