"use client";

import { Button } from "@/components/ui/button";

/** The whole point of the page: the browser's own print dialog, from which the
 * user can print or "Save as PDF". Nothing here is rendered into the printout —
 * the toolbar carries `no-print`. */
export function PrintButton() {
  return (
    <Button variant="outline" onClick={() => window.print()}>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-3.5"
        fill="currentColor"
      >
        <path d="M4.5 1.5h7A1.5 1.5 0 0 1 13 3v1.5H3V3a1.5 1.5 0 0 1 1.5-1.5Z" />
        <path d="M2.5 5.5h11A1.5 1.5 0 0 1 15 7v4a1.5 1.5 0 0 1-1.5 1.5H13v-1.75A1.75 1.75 0 0 0 11.25 9h-6.5A1.75 1.75 0 0 0 3 10.75v1.75h-.5A1.5 1.5 0 0 1 1 11V7a1.5 1.5 0 0 1 1.5-1.5Zm9.5 2.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
        <path d="M4 10.75c0-.414.336-.75.75-.75h6.5c.414 0 .75.336.75.75V15H4v-4.25Z" />
      </svg>
      Print
    </Button>
  );
}
