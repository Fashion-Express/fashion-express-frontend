/**
 * The theme vocabulary: what the values may be, and what they mean.
 *
 * Kept apart from the cookie access in `theme.ts` because the settings form is
 * a client component and needs the swatch list — importing it from a module
 * that touches `next/headers` would pull a server-only API into the browser
 * bundle, which is a build error rather than a subtle bug.
 */

export const ACCENTS = [
  { value: "#127A5E", label: "Green" },
  { value: "#3B6FE0", label: "Blue" },
  { value: "#6C4BD8", label: "Purple" },
  { value: "#C2410C", label: "Orange" },
] as const;

export type Accent = (typeof ACCENTS)[number]["value"];
export type ThemeMode = "light" | "dark" | "system";
export type Theme = { accent: Accent; mode: ThemeMode };

export const DEFAULT_ACCENT: Accent = "#127A5E";
export const DEFAULT_MODE: ThemeMode = "system";

export const ACCENT_COOKIE = "orgms.accent";
export const MODE_COOKIE = "orgms.mode";

/** A year — this is a preference, not a session. */
export const THEME_MAX_AGE = 60 * 60 * 24 * 365;

export function isAccent(value: string | undefined): value is Accent {
  return ACCENTS.some((a) => a.value === value);
}

export function isThemeMode(value: string | undefined): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

/**
 * "system" deliberately sets no attribute: the palette then falls through to
 * the `prefers-color-scheme` block in globals.css, which is CSS, not JS.
 */
export function themeAttribute(mode: ThemeMode): "light" | "dark" | undefined {
  return mode === "system" ? undefined : mode;
}
