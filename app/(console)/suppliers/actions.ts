"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { toActionState, type ActionState } from "@/lib/api/errors";
import {
  createPurchase,
  createSupplier,
  deleteSupplier,
  paySupplier,
  recordPurchasePayment,
  updateSupplier,
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
