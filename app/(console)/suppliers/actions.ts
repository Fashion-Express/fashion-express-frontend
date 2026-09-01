"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { toActionState, type ActionState } from "@/lib/api/errors";
import {
  createPurchase,
  createSupplier,
  deletePurchase,
  deletePurchasePayment,
  deleteSupplier,
  paySupplier,
  recordPurchasePayment,
  updatePurchase,
  updatePurchasePayment,
  updateSupplier,
  type PurchasePaymentUpdate,
} from "@/lib/api/suppliers";
import { can, requireSession } from "@/lib/auth/session";
import { fieldErrorsOf, required, text } from "@/lib/form";
import { isPositive, parseMoneyInput } from "@/lib/format/money";

const supplierSchema = z.object({
  name: z.string().min(1, "A supplier needs a name."),
  phone: z.string().min(1, "A phone number is required."),
  email: z
    .union([z.string().email("Enter a valid email address."), z.literal("")])
    .optional(),
  address: z.string().optional(),
});

function readSupplier(formData: FormData) {
  return {
    name: required(formData, "name"),
    phone: required(formData, "phone"),
    email: text(formData, "email"),
    address: text(formData, "address"),
  };
}

export async function createSupplierAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "add_supplier")) {
    return { formError: "You do not have permission to add a supplier." };
  }

  const parsed = supplierSchema.safeParse(readSupplier(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  let id: string;
  try {
    const supplier = await createSupplier(parsed.data);
    id = supplier.id;
  } catch (error) {
    return toActionState(error);
  }

  redirect(`/suppliers/${id}`);
}

export async function updateSupplierAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "change_supplier")) {
    return { formError: "You do not have permission to edit a supplier." };
  }

  const id = required(formData, "id");
  const parsed = supplierSchema.safeParse(readSupplier(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await updateSupplier(id, parsed.data);
  } catch (error) {
    return toActionState(error);
  }

  redirect(`/suppliers/${id}`);
}

/** Cascades to every purchase and payment — that history belongs to the supplier. */
export async function deleteSupplierAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "delete_supplier")) {
    return { formError: "You do not have permission to delete a supplier." };
  }

  try {
    await deleteSupplier(required(formData, "id"));
  } catch (error) {
    return toActionState(error);
  }

  redirect("/suppliers");
}

/* -------------------------------------------------------------------------
   Purchases
   ------------------------------------------------------------------------- */

const purchaseSchema = z.object({
  productName: z.string().min(1, "Describe what was purchased."),
  purchaseDate: z.string().min(1, "Choose the purchase date."),
  notes: z.string().optional(),
  initialPaymentMethodId: z.string().optional(),
  initialPaymentReference: z.string().optional(),
});

export async function createPurchaseAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "add_supplier")) {
    return { formError: "You do not have permission to add a purchase." };
  }

  const supplierId = required(formData, "supplierId");
  const price = parseMoneyInput(formData.get("price"));
  if (!price || !isPositive(price)) {
    return { fieldErrors: { price: "Enter the purchase price." } };
  }

  // The optional payment section: leave it empty to save only the purchase.
  const initialPayment = parseMoneyInput(formData.get("initialPayment"));

  const parsed = purchaseSchema.safeParse({
    productName: required(formData, "productName"),
    purchaseDate: required(formData, "purchaseDate"),
    notes: text(formData, "notes"),
    initialPaymentMethodId: text(formData, "initialPaymentMethodId"),
    initialPaymentReference: text(formData, "initialPaymentReference"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const paying = Boolean(initialPayment && isPositive(initialPayment));
  if (paying && !parsed.data.initialPaymentMethodId) {
    return { fieldErrors: { initialPaymentMethodId: "Choose how this payment was made." } };
  }

  try {
    /*
     * BR-32 — an initial payment may not exceed the price, and both are saved
     * atomically or not at all. Send too much and NOTHING is written, not even
     * the purchase, so there is no partial state to explain here.
     */
    await createPurchase(supplierId, {
      productName: parsed.data.productName,
      price,
      purchaseDate: parsed.data.purchaseDate,
      notes: parsed.data.notes,
      ...(paying
        ? {
            initialPayment: initialPayment!,
            initialPaymentMethodId: parsed.data.initialPaymentMethodId,
            initialPaymentReference: parsed.data.initialPaymentReference,
          }
        : {}),
    });
  } catch (error) {
    return toActionState(error);
  }

  redirect(`/suppliers/${supplierId}`);
}

/** The editable subset — no supplier, and no `paid_amount`. */
const purchaseEditSchema = z.object({
  productName: z.string().min(1, "Describe what was purchased."),
  purchaseDate: z.string().min(1, "Choose the purchase date."),
  notes: z.string().optional(),
});

/**
 * FR-05.4 — correcting a purchase.
 *
 * Lowering the price below what has already been paid is refused by
 * `purchase_not_overpaid`, and the API's sentence is passed through: the money
 * has moved, so it is the price that is wrong, and the user has to decide which
 * to change.
 */
export async function updatePurchaseAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "change_supplier")) {
    return { formError: "You do not have permission to change a purchase." };
  }

  const price = parseMoneyInput(formData.get("price"));
  if (!price || !isPositive(price)) {
    return { fieldErrors: { price: "Enter the purchase price." } };
  }

  const parsed = purchaseEditSchema.safeParse({
    productName: required(formData, "productName"),
    purchaseDate: required(formData, "purchaseDate"),
    notes: text(formData, "notes"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const supplierId = required(formData, "supplierId");

  try {
    await updatePurchase(required(formData, "purchaseId"), {
      productName: parsed.data.productName,
      price,
      purchaseDate: parsed.data.purchaseDate,
      // An emptied box is a deliberate clearing, so "" is sent as "".
      notes: parsed.data.notes ?? "",
    });
  } catch (error) {
    return toActionState(error);
  }

  redirect(`/suppliers/${supplierId}`);
}

/**
 * Deleting a purchase takes its payments with it, and their ledger debits
 * (BR-40) — nothing is left pointing at a purchase that no longer exists.
 */
export async function deletePurchaseAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "delete_supplier")) {
    return { formError: "You do not have permission to delete a purchase." };
  }

  try {
    await deletePurchase(required(formData, "purchaseId"));
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}

/* -------------------------------------------------------------------------
   Payments
   ------------------------------------------------------------------------- */

const paymentSchema = z.object({
  paymentDate: z.string().min(1, "Choose a payment date."),
  paymentMethodId: z.string().min(1, "Choose a payment method."),
  referenceNumber: z.string().optional(),
});

/** Against ONE purchase. BR-30 caps it at that purchase's remaining due. */
export async function recordPurchasePaymentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "add_supplierpayment")) {
    return { formError: "You do not have permission to record a payment." };
  }

  const amount = parseMoneyInput(formData.get("amount"));
  if (!amount || !isPositive(amount)) {
    return { fieldErrors: { amount: "Enter an amount greater than zero." } };
  }

  const parsed = paymentSchema.safeParse({
    paymentDate: required(formData, "paymentDate"),
    paymentMethodId: required(formData, "paymentMethodId"),
    referenceNumber: text(formData, "referenceNumber"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    // BR-29 — a reference is mandatory for every method except cash, and the
    // rule fails CLOSED on the server. The form warns first so the user does
    // not lose their typing to a round trip.
    await recordPurchasePayment(required(formData, "purchaseId"), {
      amount,
      ...parsed.data,
    });
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}

/**
 * BR-31 — pay at the SUPPLIER level and the amount is allocated oldest purchase
 * first, by purchase date. Each purchase touched gets its own payment row,
 * receipt number and ledger debit. It may not exceed the total outstanding.
 */
export async function paySupplierAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "add_supplierpayment")) {
    return { formError: "You do not have permission to record a payment." };
  }

  const amount = parseMoneyInput(formData.get("amount"));
  if (!amount || !isPositive(amount)) {
    return { fieldErrors: { amount: "Enter an amount greater than zero." } };
  }

  const parsed = paymentSchema.safeParse({
    paymentDate: required(formData, "paymentDate"),
    paymentMethodId: required(formData, "paymentMethodId"),
    referenceNumber: text(formData, "referenceNumber"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await paySupplier(required(formData, "supplierId"), { amount, ...parsed.data });
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}

/* -------------------------------------------------------------------------
   Editing and removing a receipt
   ------------------------------------------------------------------------- */

const paymentEditSchema = z.object({
  paymentDate: z.string().min(1, "Choose a payment date."),
  paymentMethodId: z.string().min(1, "Choose a payment method."),
  referenceNumber: z.string().optional(),
});

/**
 * FR-05.5 — correcting a receipt.
 *
 * The reference is sent even when empty: BR-29 is judged on what the row ends
 * up with, so clearing it has to reach the API as a clearing rather than as
 * "no change", or a bank payment could quietly lose its trace.
 *
 * Both this and the delete below are gated on `add_supplierpayment` — not a
 * `change_`/`delete_` pair — because that is what the API's own routes require.
 * Gating on anything else would draw buttons the server then refuses.
 */
export async function updatePurchasePaymentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "add_supplierpayment")) {
    return { formError: "You do not have permission to change a payment." };
  }

  const amount = parseMoneyInput(formData.get("amount"));
  if (!amount || !isPositive(amount)) {
    return { fieldErrors: { amount: "Enter an amount greater than zero." } };
  }

  const parsed = paymentEditSchema.safeParse({
    paymentDate: required(formData, "paymentDate"),
    paymentMethodId: required(formData, "paymentMethodId"),
    referenceNumber: text(formData, "referenceNumber"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const update: PurchasePaymentUpdate = {
    amount,
    paymentDate: parsed.data.paymentDate,
    paymentMethodId: parsed.data.paymentMethodId,
    referenceNumber: parsed.data.referenceNumber ?? "",
    notes: text(formData, "notes") ?? "",
  };

  try {
    await updatePurchasePayment(required(formData, "paymentId"), update);
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}

/** Deleting a receipt reverses its ledger debit (BR-40) and reopens the due. */
export async function deletePurchasePaymentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "add_supplierpayment")) {
    return { formError: "You do not have permission to delete a payment." };
  }

  try {
    await deletePurchasePayment(required(formData, "paymentId"));
  } catch (error) {
    return toActionState(error);
  }

  refresh();
  return { ok: true };
}
