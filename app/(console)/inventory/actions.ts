"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { toActionState, type ActionState } from "@/lib/api/errors";
import {
  createInventoryItem,
  deleteInventoryItem,
  updateInventoryItem,
} from "@/lib/api/inventory";
import { can, requireSession } from "@/lib/auth/session";
import { fieldErrorsOf, required, text } from "@/lib/form";

/**
 * Quantities and prices stay decimal STRINGS all the way to the API — they are
 * validated as well-formed decimals here rather than parsed into numbers, which
 * would lose precision on the way past (NFR-01).
 */
const decimalString = (message: string) =>
  z
    .string()
    .regex(/^\d+(\.\d+)?$/, message)
    .optional();

const wholeNumber = (message: string) =>
  z.string().regex(/^\d+$/, message).optional();

const baseFields = {
  partName: z.string().min(1, "A product needs a name."),
  partCode: z.string().min(1, "A product code is required."),
  quantity: decimalString("Quantity must be a number."),
  boxCount: wholeNumber("Box count must be a whole number."),
  purchasePrice: decimalString("Purchase price must be an amount."),
  unitPrice: decimalString("Unit price must be an amount."),
  minimumStock: wholeNumber("Minimum stock must be a whole number."),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
};

const createSchema = z.object({
  ...baseFields,
  // BR-49 and FR-04.1.2 — a quantity without a unit is meaningless.
  shopId: z.string().min(1, "Choose the shop that holds this stock."),
  unitId: z.string().min(1, "Choose a unit."),
});

const updateSchema = z.object({ ...baseFields, unitId: z.string().optional() });

function readForm(formData: FormData) {
  return {
    partName: required(formData, "partName"),
    partCode: required(formData, "partCode"),
    shopId: text(formData, "shopId"),
    unitId: text(formData, "unitId"),
    quantity: text(formData, "quantity"),
    boxCount: text(formData, "boxCount"),
    purchasePrice: text(formData, "purchasePrice"),
    unitPrice: text(formData, "unitPrice"),
    minimumStock: text(formData, "minimumStock"),
    categoryId: text(formData, "categoryId"),
    supplierId: text(formData, "supplierId"),
  };
}

/** The API takes whole numbers for boxes and minimum stock, decimals for the rest. */
function toPayload(data: z.infer<typeof updateSchema>) {
  return {
    partName: data.partName,
    partCode: data.partCode,
    quantity: data.quantity,
    boxCount: data.boxCount === undefined ? undefined : Number(data.boxCount),
    purchasePrice: data.purchasePrice,
    unitPrice: data.unitPrice,
    minimumStock:
      data.minimumStock === undefined ? undefined : Number(data.minimumStock),
    categoryId: data.categoryId,
    supplierId: data.supplierId,
  };
}

export async function createInventoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "add_inventoryitem")) {
    return { formError: "You do not have permission to add a product." };
  }

  const parsed = createSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  let id: string;
  try {
    // BR-51 — the code is unique within the SHOP, not globally, so the same
    // code in another shop is a different product and is accepted.
    const item = await createInventoryItem({
      ...toPayload(parsed.data),
      shopId: parsed.data.shopId,
      unitId: parsed.data.unitId,
    });
    id = item.id;
  } catch (error) {
    return toActionState(error);
  }

  redirect(`/inventory/${id}/movements`);
}

export async function updateInventoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "change_inventoryitem")) {
    return { formError: "You do not have permission to edit a product." };
  }

  const id = required(formData, "id");
  const parsed = updateSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    /*
     * An edit writes to the movement log with a deliberately asymmetric
     * vocabulary (FR-04.5.1): raising the quantity is a Stock In, lowering it is
     * an Adjustment. Stock leaving through an edit is a correction; stock
     * leaving through a sale is an issue, and the log has to tell them apart.
     * Units and boxes are evaluated separately, so one edit can write a row of
     * each kind (BR-26).
     */
    await updateInventoryItem(id, {
      ...toPayload(parsed.data),
      unitId: parsed.data.unitId,
    });
  } catch (error) {
    return toActionState(error);
  }

  redirect(`/inventory/${id}/movements`);
}

/** BR-27 — a product that has ever appeared on a sale cannot be deleted; the
 * 409 says how many lines are in the way. */
export async function deleteInventoryAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "delete_inventoryitem")) {
    return { formError: "You do not have permission to delete a product." };
  }

  try {
    await deleteInventoryItem(required(formData, "id"));
  } catch (error) {
    return toActionState(error);
  }

  redirect("/inventory");
}
