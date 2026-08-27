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
