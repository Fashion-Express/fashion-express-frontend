"use server";

import { refresh } from "next/cache";
import type { ActionState } from "@/lib/api/errors";
import { isManager, requireSession } from "@/lib/auth/session";
import { writeTheme } from "@/lib/theme/theme";
import {
  DEFAULT_ACCENT,
  DEFAULT_MODE,
  isAccent,
  isThemeMode,
} from "@/lib/theme/tokens";

export async function saveThemeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();

  const accent = String(formData.get("accent") ?? "");
  const mode = String(formData.get("mode") ?? "");

  // The mockup gates the accent to admins, so the check is enforced here too
  // rather than only by hiding the swatches.
  if (!isManager(me)) {
    return { formError: "Only managers and owners can change the accent colour." };
  }

  if (!isAccent(accent) || !isThemeMode(mode)) {
    return { formError: "That is not one of the available theme options." };
  }

  await writeTheme({ accent, mode });

  // The palette lives on <html>, set by the root layout from these cookies, so
  // the whole tree has to re-render for the change to take effect.
  refresh();
  return { ok: true };
}

export async function resetThemeAction(): Promise<void> {
  const me = await requireSession();
  if (!isManager(me)) return;

  await writeTheme({ accent: DEFAULT_ACCENT, mode: DEFAULT_MODE });
  refresh();
}
