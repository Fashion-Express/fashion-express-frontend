import "server-only";

import { apiFetch } from "./client";
import type { Id } from "./types";

/**
 * FR-10.1 — the letterhead, kept as a singleton row (`CHECK (id = 1)`): one
 * business, one letterhead, and no way to end up with two and no way to say
 * which is right.
 *
 * The read is open to any signed-in user precisely because every printed
 * document needs it; only editing carries a permission.
 */
export type BusinessSettings = {
  id: Id;
  name: string;
  address: string;
  phone: string;
  email: string;
  /** A path under the API's attachment root, or a data URI — see `logoSrc`. */
  logo: string | null;
  /** Free text printed at the foot of an invoice: terms, a thank-you. */
  invoice_footer: string;
};

/** What a document falls back to when the settings row cannot be read. Printing
 * an invoice must not fail because the letterhead is unavailable. */
export const BUSINESS_FALLBACK: BusinessSettings = {
  id: "1",
  name: "Fashion Express",
  address: "",
  phone: "",
  email: "",
  logo: null,
  invoice_footer: "",
};

export function getBusinessSettings() {
  return apiFetch<BusinessSettings>("/admin/business-settings");
}

/**
 * The `logo` column holds "a relative path under the attachment root, or a data
 * URI", and the API exposes no route that serves the former — so only a logo
 * the browser can actually fetch on its own is rendered, and a stored path
 * falls back to the business name in type. Returning `null` here is what makes
 * that fallback visible rather than a broken image on every invoice.
 */
export function logoSrc(logo: string | null): string | null {
  if (!logo) return null;
  return /^(data:|https?:)/i.test(logo) ? logo : null;
}
