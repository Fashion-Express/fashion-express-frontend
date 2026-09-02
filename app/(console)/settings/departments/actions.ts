"use server";

import type { ActionState } from "@/lib/api/errors";
import {
  createNamedEntry,
  deleteNamedEntry,
  namedEntryUsage,
  updateNamedEntry,
} from "@/lib/reference/named-list";

/**
 * FR-12.2 — departments, one of the three **named** reference lists.
 *
 * The rules live once in `lib/reference/named-list.ts`; this file supplies only
 * the slug. It is a literal and never read from the form: a Server Action is
 * reachable by direct POST, and a slug taken off a request would let a caller
 * edit another list through this screen.
 */
const LIST = "departments" as const;

export async function createDepartmentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return createNamedEntry(LIST, formData);
}

export async function updateDepartmentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return updateNamedEntry(LIST, formData);
}

/** BR-60 — read when the delete dialog opens, before the delete is offered. */
export async function loadDepartmentUsage(id: string) {
  return namedEntryUsage(LIST, id);
}

export async function deleteDepartmentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return deleteNamedEntry(LIST, formData);
}
