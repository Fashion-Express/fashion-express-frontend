"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { toActionState, type ActionState } from "@/lib/api/errors";
import {
  createReference,
  deleteReference,
  getReferenceUsage,
  updateReference,
} from "@/lib/api/reference";
import { can, requireSession } from "@/lib/auth/session";
import { fieldErrorsOf, required, text } from "@/lib/form";

/**
 * FR-12.4.1 — product categories, one of the twelve reference lists.
 *
 * Every write goes through `manage_referencedata`, which is what the API's own
 * routes require. The reads are deliberately ungated there, so this file does
 * not invent a restriction the server does not have.
 *
 * The list slug is pinned here rather than taken from the request: these
 * actions are reachable by direct POST, and a slug read off the form would let
 * a caller edit payment methods through the categories screen.
 */
const LIST = "categories" as const;

const categorySchema = z.object({
  name: z.string().min(1, "A category needs a name.").max(100, "Name is too long."),
  description: z.string().optional(),
  /**
   * A select rather than a checkbox, matching every other status field here. A
   * checkbox the browser did not send is indistinguishable from a field the
   * form never rendered, and both arrive as `null`.
   */
  isActive: z.enum(["true", "false"]),
});

function readForm(formData: FormData) {
  return {
    name: required(formData, "name"),
    description: text(formData, "description"),
    isActive: required(formData, "isActive"),
  };
}

export async function createCategoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "manage_referencedata")) {
    return { formError: "You do not have permission to manage reference data." };
  }

  const parsed = categorySchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await createReference(LIST, {
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      isActive: parsed.data.isActive === "true",
    });
  } catch (error) {
    return toActionState(error);
  }

  redirect("/settings/categories");
}

export async function updateCategoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "manage_referencedata")) {
    return { formError: "You do not have permission to manage reference data." };
  }

  const parsed = categorySchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await updateReference(LIST, required(formData, "id"), {
      name: parsed.data.name,
      // An emptied box is a deliberate clearing, so "" is sent as "".
      description: parsed.data.description ?? "",
      isActive: parsed.data.isActive === "true",
    });
  } catch (error) {
    return toActionState(error);
  }

  redirect("/settings/categories");
}

/**
 * BR-60 — an entry in use cannot be deleted at all. Read on demand when the
 * dialog opens, so the user is told what depends on it before they commit
 * rather than after the API refuses.
 */
export async function loadCategoryUsage(
  id: string,
): Promise<{ total: number; byTable: Record<string, number> } | { error: string }> {
  await requireSession();

  try {
    return await getReferenceUsage(LIST, id);
  } catch {
    return { error: "Could not check what uses this category." };
  }
}

export async function deleteCategoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "manage_referencedata")) {
    return { formError: "You do not have permission to manage reference data." };
  }

  try {
    await deleteReference(LIST, required(formData, "id"));
  } catch (error) {
    // A 409 here names how many records use the entry and says to deactivate
    // instead. That sentence is written for the user; it is passed through.
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}
