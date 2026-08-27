/**
 * "1 purchase", "2 purchases" — count lines read as broken English otherwise,
 * and these numbers sit next to money, where sloppiness reads as inaccuracy.
 */
export function plural(count: number | string, singular: string, pluralForm?: string): string {
  const n = Number(count);
  return `${count} ${n === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}
