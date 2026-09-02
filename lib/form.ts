import type { ZodError } from "zod";

/**
 * `FormData.get` returns `null` for a field the form did not render, and zod's
 * `.optional()` accepts `undefined` but NOT `null` — so an absent optional
 * field fails validation, and the message lands on a field name that has no
 * input to show it against. The failure is then completely silent.
 *
 * Every read of a form value goes through here.
 */
export function text(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** A required field: absent and empty are the same failure, reported by zod. */
export function required(formData: FormData, name: string): string {
  return text(formData, name) ?? "";
}

/** First message per field, in the shape a `<Field>` expects. */
export function fieldErrorsOf(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/**
 * Everything the user typed, to be handed back on `ActionState.values` so a
 * refused form can repopulate itself.
 *
 * **Why this is needed at all.** React resets an uncontrolled form once its
 * `action` completes — including when the action came back with errors. Without
 * this, a rejected form loses every field the user filled in and they type the
 * whole thing again to fix one mistake. Re-seeding each `defaultValue` from
 * these values makes the reset land back on what was submitted.
 *
 * **Passwords are never echoed.** Any field named `password`, or ending in
 * `Password`, is dropped: the value has already reached the server, and sending
 * it back down puts it in the response payload and in client state for no
 * benefit. A password field is the one input the user expects to retype, and it
 * is usually the field they are being asked to correct anyway.
 *
 * File inputs are skipped too — a `File` is not a value a form can be re-seeded
 * with, and the browser will not let one be set programmatically.
 */
export function valuesOf(
  formData: FormData,
  omit: readonly string[] = [],
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const [name, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    if (name === "password" || name.endsWith("Password")) continue;
    if (omit.includes(name)) continue;
    values[name] = value;
  }

  return values;
}

/**
 * Where a redirect may go after signing in.
 *
 * Only a path on this origin: an absolute URL here would be an open redirect,
 * handing an attacker a link that starts on the real login page and lands on
 * theirs. `//evil.com` is a protocol-relative URL, so a leading slash alone is
 * not enough of a check.
 */
export function safeRedirect(target: string | undefined, fallback: string): string {
  if (!target) return fallback;
  if (!target.startsWith("/") || target.startsWith("//")) return fallback;
  return target;
}
