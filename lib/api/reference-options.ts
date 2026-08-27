import type { Id } from "./types";

/**
 * The shape of a picker entry, and how to read its label.
 *
 * Kept apart from `reference.ts` because forms are client components and need
 * both — importing them from a module that also holds the server-only fetchers
 * would pull `server-only` into the browser bundle, which is a build error.
 */
export type ReferenceOption = {
  id: Id;
  /** Coded lists carry code + label; named lists (categories, departments,
   * job positions) carry `name` instead. `optionLabel` reads either. */
  code?: string;
  label?: string;
  name?: string;
  scope?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

/** The text to show for a picker entry, whichever kind of list it came from. */
export function optionLabel(option: ReferenceOption): string {
  return option.label ?? option.name ?? option.code ?? option.id;
}
