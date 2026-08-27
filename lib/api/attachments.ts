/**
 * BR-34 — the fixed extension whitelist for a bill claim's supporting document.
 * Anything else is refused outright by the API.
 *
 * Mirrored on the client so the file picker offers the same set and a bad
 * choice is caught before the upload crosses the wire. The server checks again
 * regardless; this is courtesy, not enforcement — which is why it lives in its
 * own module rather than alongside the server-only claim fetchers.
 */
export const ATTACHMENT_EXTENSIONS = [
  ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp",
  ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt",
] as const;

export const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.join(",");

export function hasAllowedExtension(filename: string): boolean {
  const name = filename.toLowerCase();
  return ATTACHMENT_EXTENSIONS.some((extension) => name.endsWith(extension));
}
