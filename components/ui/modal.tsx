"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Built on <dialog>, which gives focus trapping, Escape, inertness of the page
 * behind and the top layer for free — all things a hand-rolled overlay gets
 * wrong. `showModal()` has to be called imperatively, hence the effect.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "sm",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "sm" | "md";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      // Escape and the backdrop both close it; `close` covers the first.
      onClose={onClose}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop —
        // the content sits in a child element, which stops it there.
        if (event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] rounded-[14px] border border-line bg-surface p-0 text-ink shadow-modal",
        "backdrop:bg-[rgb(26_23_20_/_0.5)]",
        width === "sm" ? "max-w-[420px]" : "max-w-[560px]",
      )}
      aria-labelledby="modal-title"
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2
            id="modal-title"
            className="font-sans text-[15px] font-semibold text-ink"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 cursor-pointer rounded-sm px-1 text-lg leading-none text-faint transition-colors hover:text-ink"
          >
            ×
          </button>
        </div>

        {children}

        {footer && <div className="flex justify-end gap-2.5 pt-1">{footer}</div>}
      </div>
    </dialog>
  );
}
