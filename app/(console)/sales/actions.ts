"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { toActionState, type ActionState } from "@/lib/api/errors";
import {
  convertQuotation,
  createSale,
  deleteSale,
  deleteSaleItem,
  finalizeSale,
  addSaleItem,
  deleteSalePayment,
  recordSalePayment,
  updateSalePayment,
  type SaleItemInput,
  type SalePaymentUpdate,
} from "@/lib/api/sales";
import { can, requireSession } from "@/lib/auth/session";
import { fieldErrorsOf, required, text } from "@/lib/form";
import { isPositive, parseMoneyInput } from "@/lib/format/money";
import { todayInDhaka } from "@/lib/format/date";

/**
 * BR-01 governs every read here, and the API enforces it: a sale outside the
 * caller's scope answers 404, not 403. Nothing in this file needs to reproduce
 * that — it only needs to not get in the way of it.
 */

const saleSchema = z.object({
  customerId: z.string().min(1, "Choose a customer."),
  shopId: z.string().min(1, "Choose the shop this sale belongs to."),
  notes: z.string().optional(),
});

/**
 * Line items arrive as parallel indexed fields (`items.0.itemType`, …) because
 * a repeating group in a plain form has no other shape. They are reassembled
 * here rather than in the browser, so the payload the API sees is built on the
 * server in every case — including a submit that happened before hydration.
 *
 * An incomplete line is REPORTED, never skipped. Dropping it silently meant
 * that adding three lines and filling two saved a sale with two, with nothing
 * on screen to say the third had gone — and a missing line on an invoice is not
 * the kind of thing anyone re-counts before sending it.
 */
function readItems(formData: FormData): {
  items: SaleItemInput[];
  problems: Record<string, string>;
  incompleteLines: number[];
} {
  const items: SaleItemInput[] = [];
  const problems: Record<string, string> = {};
  const incompleteLines: number[] = [];

  for (let index = 0; ; index += 1) {
    const itemType = text(formData, `items.${index}.itemType`);
    if (!itemType) break;

    const quantity = text(formData, `items.${index}.quantity`) ?? "0";
    const unitPrice = text(formData, `items.${index}.unitPrice`);
    const boxes = text(formData, `items.${index}.boxes`);

    // BR-04 — the two kinds are not interchangeable: a stocked line needs a
    // product, a machine line needs a description, and the database makes the
    // mixed state unrepresentable. Sending the wrong field would be refused.
    if (itemType === "inventory") {
      const inventoryItemId = text(formData, `items.${index}.inventoryItemId`);
      if (!inventoryItemId) {
        problems[`items.${index}.inventoryItemId`] = "Choose a product for this line.";
        incompleteLines.push(index + 1);
        continue;
      }
      items.push({
        itemType: "inventory",
        inventoryItemId,
        quantity,
        boxes: boxes ? Number(boxes) : undefined,
        // A positive entered price wins; omitted or zero takes the product's
        // current selling price, so an empty field does not sell at nothing.
        unitPrice: unitPrice && isPositive(unitPrice) ? unitPrice : undefined,
      });
    } else {
      const description = text(formData, `items.${index}.description`);
      if (!description) {
        problems[`items.${index}.description`] = "Describe the machine on this line.";
        incompleteLines.push(index + 1);
        continue;
      }
      items.push({
        itemType: "non_inventory",
        description,
        quantity,
        unitPrice: unitPrice ?? "0",
      });
    }
  }

  return { items, problems, incompleteLines };
}

async function submitSale(
  formData: FormData,
  asQuotation: boolean,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "add_sale")) {
    return { formError: "You do not have permission to create a sale." };
  }

  const parsed = saleSchema.safeParse({
    customerId: required(formData, "customerId"),
    shopId: required(formData, "shopId"),
    notes: text(formData, "notes"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const { items, problems, incompleteLines } = readItems(formData);

  // An incomplete line stops the save rather than vanishing from it. The error
  // lands on the line's own control as well, so a long form does not send the
  // user hunting for which of eight rows is meant.
  if (incompleteLines.length > 0) {
    return {
      formError:
        incompleteLines.length === 1
          ? `Line ${incompleteLines[0]} is incomplete. Complete it or remove it before saving.`
          : `Lines ${incompleteLines.join(", ")} are incomplete. Complete them or remove them before saving.`,
      fieldErrors: problems,
    };
  }

  // BR-05 — a sale with no lines is refused by the API too; catching it here
  // saves a round trip and says so in the form's own words.
  if (items.length === 0) {
    return { formError: "Add at least one line before saving." };
  }

  const initialPayment = parseMoneyInput(formData.get("initialPayment"));
  const paying = Boolean(initialPayment && isPositive(initialPayment));
  const methodId = text(formData, "initialPaymentMethodId");

  if (paying && !methodId) {
    return { fieldErrors: { initialPaymentMethodId: "Choose how this payment was made." } };
  }

  // BR-11 — only a CANCELLED sale refuses a payment. A quotation may take an
  // advance as it is raised, exactly as a draft may.
  let id: string;
  try {
    const sale = await createSale({
      customerId: parsed.data.customerId,
      shopId: parsed.data.shopId,
      items,
      notes: parsed.data.notes,
      ...(asQuotation ? { status: "quote" as const } : {}),
      // Nested, not flattened — the API validates it as its own DTO.
      ...(paying
        ? {
            initialPayment: {
              amount: initialPayment!,
              paymentDate:
                text(formData, "initialPaymentDate") ?? todayInDhaka(),
              paymentMethodId: methodId!,
              notes: text(formData, "initialPaymentNotes"),
            },
          }
        : {}),
    });
    id = sale.id;
  } catch (error) {
    return toActionState(error);
  }

  redirect(`/sales/${id}`);
}

export async function createSaleAction(_previous: ActionState, formData: FormData) {
  return submitSale(formData, false);
}

export async function createQuotationAction(_previous: ActionState, formData: FormData) {
  return submitSale(formData, true);
}

/** FR-02.3.1 — a quotation becomes a draft invoice, keeping items and prices. */
export async function convertQuotationAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "change_sale")) {
    return { formError: "You do not have permission to convert this quotation." };
  }

  try {
    await convertQuotation(required(formData, "id"));
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}

/**
 * Its own permission (FR-02.4.3), so the staff who assemble orders need not be
 * the staff who commit them.
 *
 * BR-06 — availability is checked for every line before any deduction; if one
 * is short the whole thing is refused and nothing changes. The API's message
 * names what is short, so it is passed through verbatim.
 */
export async function finalizeSaleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "finalize_sale")) {
    return { formError: "You do not have permission to finalize a sale." };
  }

  try {
    await finalizeSale(required(formData, "id"));
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}

/** BR-14 — only DRAFT sales may be deleted. */
export async function deleteSaleAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "delete_sale")) {
    return { formError: "You do not have permission to delete a sale." };
  }

  try {
    await deleteSale(required(formData, "id"));
  } catch (error) {
    return toActionState(error);
  }

  redirect("/sales");
}

const paymentSchema = z.object({
  paymentDate: z.string().min(1, "Choose a payment date."),
  paymentMethodId: z.string().min(1, "Choose a payment method."),
  notes: z.string().optional(),
});

/** The editable subset — everything but the receipt number itself. */
const paymentEditSchema = z.object({
  paymentDate: z.string().min(1, "Choose the payment date."),
  paymentMethodId: z.string().min(1, "Choose a payment method."),
  notes: z.string().optional(),
});

/**
 * BR-09 total payments may not exceed the sale value · BR-10 nothing at or
 * below zero · BR-11 nothing on a cancelled sale or a quotation · BR-62 the
 * method must be customer-scoped.
 */
export async function recordSalePaymentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "add_salepayment")) {
    return { formError: "You do not have permission to record a payment." };
  }

  const amount = parseMoneyInput(formData.get("amount"));
  if (!amount || !isPositive(amount)) {
    return { fieldErrors: { amount: "Enter an amount greater than zero." } };
  }

  const parsed = paymentSchema.safeParse({
    paymentDate: required(formData, "paymentDate"),
    paymentMethodId: required(formData, "paymentMethodId"),
    notes: text(formData, "notes"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await recordSalePayment(required(formData, "id"), { amount, ...parsed.data });
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}

/**
 * FR-02.7 — correcting a receipt. BR-62 constrains the method to a
 * `customer`-scoped one, and the API re-checks it whatever the form offered.
 *
 * Fields absent from the form are left alone rather than blanked: the API
 * treats every key as optional, so sending `undefined` is "no change" and
 * sending `""` would wipe the notes.
 */
export async function updateSalePaymentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "change_salepayment")) {
    return { formError: "You do not have permission to change a payment." };
  }

  const amount = parseMoneyInput(formData.get("amount"));
  if (!amount || !isPositive(amount)) {
    return { fieldErrors: { amount: "Enter an amount greater than zero." } };
  }

  const parsed = paymentEditSchema.safeParse({
    paymentDate: required(formData, "paymentDate"),
    paymentMethodId: required(formData, "paymentMethodId"),
    notes: text(formData, "notes"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const update: SalePaymentUpdate = {
    amount,
    paymentDate: parsed.data.paymentDate,
    paymentMethodId: parsed.data.paymentMethodId,
    // An emptied box is a deliberate clearing, so "" is sent as "".
    notes: parsed.data.notes ?? "",
  };

  try {
    await updateSalePayment(required(formData, "paymentId"), update);
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}

/**
 * Deleting a receipt reverses its ledger entry. Where the payment came from a
 * customer lump sum its allocation cascades away too, so BR-19's batch then
 * accounts for one fewer invoice than it was recorded against.
 */
export async function deleteSalePaymentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "delete_salepayment")) {
    return { formError: "You do not have permission to delete a payment." };
  }

  try {
    await deleteSalePayment(required(formData, "paymentId"));
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}

const addItemSchema = z.object({
  itemType: z.enum(["inventory", "non_inventory"]),
  inventoryItemId: z.string().optional(),
  description: z.string().optional(),
  quantity: z.string().min(1, "Enter a quantity."),
  boxes: z.string().optional(),
  unitPrice: z.string().optional(),
});

/**
 * FR-02.6 — adding a line to an existing sale.
 *
 * BR-13: on a FINALISED sale the stock is validated and deducted immediately,
 * exactly as it is at finalisation, so a line that would take stock negative is
 * refused and nothing is written. On a draft or quotation nothing moves yet.
 *
 * BR-04 — the two line kinds are not interchangeable: a stocked line names a
 * product, a machine line carries the description that IS the machine. Neither
 * may be both, and the API refuses the combination regardless of this check.
 */
export async function addSaleItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "change_sale")) {
    return { formError: "You do not have permission to change this sale." };
  }

  const parsed = addItemSchema.safeParse({
    itemType: required(formData, "itemType"),
    inventoryItemId: text(formData, "inventoryItemId"),
    description: text(formData, "description"),
    quantity: required(formData, "quantity"),
    boxes: text(formData, "boxes"),
    unitPrice: text(formData, "unitPrice"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const line = parsed.data;
  if (line.itemType === "inventory" && !line.inventoryItemId) {
    return { fieldErrors: { inventoryItemId: "Choose a product." } };
  }
  if (line.itemType === "non_inventory" && !line.description) {
    return { fieldErrors: { description: "Describe what is being sold." } };
  }

  const quantity = parseMoneyInput(line.quantity);
  if (!quantity || !isPositive(quantity)) {
    return { fieldErrors: { quantity: "Enter a quantity greater than zero." } };
  }

  // FR-02.2 — a blank or zero price on a stocked line means "use the product's
  // current selling price", which only the server knows. Left out entirely.
  const unitPrice = parseMoneyInput(line.unitPrice ?? null);

  const input: SaleItemInput = {
    itemType: line.itemType,
    quantity,
    ...(line.itemType === "inventory"
      ? { inventoryItemId: line.inventoryItemId }
      : { description: line.description }),
    ...(line.boxes ? { boxes: Number(line.boxes) } : {}),
    ...(unitPrice && isPositive(unitPrice) ? { unitPrice } : {}),
  };

  try {
    await addSaleItem(required(formData, "id"), input);
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}

/**
 * FR-02.6 — removing a line from a FINALISED sale is restricted to
 * administrators. BR-12 returns the stock that line consumed to inventory and
 * records a reversing Adjustment; stock is never silently lost. If this empties
 * the sale it reverts to draft and its payments are deleted (FR-02.6.2).
 */
export async function removeSaleItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "change_sale")) {
    return { formError: "You do not have permission to change this sale." };
  }

  try {
    await deleteSaleItem(required(formData, "id"), required(formData, "itemId"));
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}
