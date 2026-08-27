"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { toActionState, type ActionState } from "@/lib/api/errors";
import { createShop, deleteShop, updateShop } from "@/lib/api/shops";
import { can, requireSession } from "@/lib/auth/session";
import { fieldErrorsOf, required, text } from "@/lib/form";

/**
 * Every Server Action is reachable by a direct POST, not only through the
 * button that renders it — so each one re-checks the session and the permission
 * rather than trusting that the UI hid the control. The API enforces the same
 * rules again; this only makes the refusal readable.
 */

const shopSchema = z.object({
  name: z.string().trim().min(1, "A shop needs a name."),
  description: z.string().trim().optional(),
});

export async function createShopAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "add_shop")) {
    return { formError: "You do not have permission to add a shop." };
  }

  const parsed = shopSchema.safeParse({
    name: required(formData, "name"),
    description: text(formData, "description"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  let id: string;
  try {
    // BR-47 — the name is unique ignoring case, and the 409 names the
    // constraint, which `toApiError` maps onto the name field.
    const shop = await createShop(parsed.data);
    id = shop.id;
  } catch (error) {
    return toActionState(error);
  }

  redirect(`/shops/${id}`);
}

export async function updateShopAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "change_shop")) {
    return { formError: "You do not have permission to edit a shop." };
  }

  const id = required(formData, "id");
  if (!id) return { formError: "Missing shop id." };

  const parsed = shopSchema.safeParse({
    name: required(formData, "name"),
    description: text(formData, "description"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await updateShop(id, parsed.data);
  } catch (error) {
    return toActionState(error);
  }

  redirect(`/shops/${id}`);
}

/**
 * FR-11.2.3 — the supported way to retire a shop. An inactive shop disappears
 * from the pickers but keeps every record it holds and stays in reports.
 */
export async function setShopActiveAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "change_shop")) {
    return { formError: "You do not have permission to edit a shop." };
  }

  const id = required(formData, "id");
  const isActive = text(formData, "isActive") === "true";

  try {
    await updateShop(id, { isActive });
  } catch (error) {
    return toActionState(error);
  }

  // Staying on the page, so re-render it in place rather than navigating.
  refresh();
  return { ok: true };
}

/**
 * BR-48 — a shop holding any customer, product, sale or staff account cannot be
 * deleted. The 409 says exactly what is in the way and names the alternative;
 * it is written for the user, so it is passed through unchanged.
 */
export async function deleteShopAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "delete_shop")) {
    return { formError: "You do not have permission to delete a shop." };
  }

  const id = required(formData, "id");

  try {
    await deleteShop(id);
  } catch (error) {
    return toActionState(error);
  }

  redirect("/shops");
}
