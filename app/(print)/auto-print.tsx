"use client";

import { useEffect, useRef } from "react";

/**
 * Opens the print dialog as soon as the document has finished loading.
 *
 * A receipt is printed essentially every time it is opened — it is handed to
 * the customer — so the dialog coming up unasked saves the one click that the
 * page otherwise exists for. The invoice deliberately does NOT do this: an
 * invoice is read and checked before it is printed.
 *
 * Two things it has to get right:
 *
 * - **Wait for `load`, not just mount.** React has painted, but the letterhead
 *   image may not have arrived, and a print started before it does puts a gap
 *   where the logo should be.
 * - **Print once.** Effects run twice in development's strict mode, and a
 *   second `print()` while the first dialog is open is either swallowed or
 *   queues a duplicate depending on the browser.
 */
export function AutoPrint() {
  const printed = useRef(false);

  useEffect(() => {
    if (printed.current) return;
    printed.current = true;

    if (document.readyState === "complete") {
      window.print();
      return;
    }

    const onLoad = () => window.print();
    window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
