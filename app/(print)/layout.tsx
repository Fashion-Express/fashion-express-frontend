import { requireSession } from "@/lib/auth/session";

/**
 * The document chrome: no sidebar, no top bar, nothing but the sheet.
 *
 * A printable document is a page of its own rather than a screen inside the
 * console — what is on screen is what comes out of the printer, so the shell
 * has to be absent, not merely hidden by a print stylesheet.
 *
 * This is still a security boundary in its own right. `proxy.ts` only checks
 * that a cookie exists; these routes sit outside `(console)`, so they do not
 * inherit its `requireSession()` and must ask for themselves.
 */
export default async function PrintLayout({ children }: LayoutProps<"/">) {
  await requireSession();

  return (
    <div className="min-h-dvh bg-[#f1eee9] print:bg-white">{children}</div>
  );
}
