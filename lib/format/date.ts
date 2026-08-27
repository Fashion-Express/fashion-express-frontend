/**
 * NFR-05: the business runs on the Asia/Dhaka day. The backend's
 * `finalized_today` is a Dhaka day, so formatting an API timestamp in the
 * viewer's local zone would put a sale on the wrong date for part of every day.
 * Every date shown in the console goes through here.
 */
const ZONE = "Asia/Dhaka";

function format(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: ZONE }).format(date);
}

/** "20 Aug 2026" */
export function formatDate(value: string | null | undefined): string {
  return format(value, { day: "2-digit", month: "short", year: "numeric" });
}

/** "20 Aug 2026, 00:48" — for audit lines and stock movements. */
export function formatDateTime(value: string | null | undefined): string {
  return format(value, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "Thu 20 Aug 2026" — the top bar's date line. */
export function formatLongDate(value: string | null | undefined): string {
  return format(value, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** "Aug 20" — compact, for a dashboard list. */
export function formatShortDate(value: string | null | undefined): string {
  return format(value, { day: "2-digit", month: "short" });
}

/** Today in Dhaka, as the `YYYY-MM-DD` a date input wants. */
export function todayInDhaka(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
