import { notFound } from "next/navigation";

/**
 * A page the signed-in user may not open.
 *
 * Rendered as a 404 rather than a bespoke "denied" screen, matching the
 * backend: a sale outside a user's scope answers 404, not 403, so that the
 * existence of a record is not itself leaked. The message is for the log, not
 * the screen.
 */
export function forbidden(reason: string): never {
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[orgms] blocked: ${reason}`);
  }
  notFound();
}
