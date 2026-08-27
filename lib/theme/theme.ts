import "server-only";

import { cookies } from "next/headers";
import {
  ACCENT_COOKIE,
  DEFAULT_ACCENT,
  DEFAULT_MODE,
  MODE_COOKIE,
  THEME_MAX_AGE,
  isAccent,
  isThemeMode,
  type Theme,
} from "./tokens";

/**
 * Theme state lives in cookies rather than localStorage so the SERVER can read
 * it while rendering. A localStorage theme can only be applied after hydration,
 * which means a flash of the wrong palette on every page load.
 */

export async function readTheme(): Promise<Theme> {
  const jar = await cookies();
  const accent = jar.get(ACCENT_COOKIE)?.value;
  const mode = jar.get(MODE_COOKIE)?.value;

  return {
    accent: isAccent(accent) ? accent : DEFAULT_ACCENT,
    mode: isThemeMode(mode) ? mode : DEFAULT_MODE,
  };
}

export async function writeTheme(theme: Theme): Promise<void> {
  const jar = await cookies();
  const options = { path: "/", maxAge: THEME_MAX_AGE, sameSite: "lax" as const };

  jar.set(ACCENT_COOKIE, theme.accent, options);
  jar.set(MODE_COOKIE, theme.mode, options);
}
