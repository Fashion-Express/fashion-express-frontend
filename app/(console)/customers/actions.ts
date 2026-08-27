"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { toActionState, type ActionState } from "@/lib/api/errors";
import {
  createCustomer,
  deleteCustomer,
  recordCustomerPayment,
  updateCustomer,
} from "@/lib/api/customers";
import { can, requireSession } from "@/lib/auth/session";
import { fieldErrorsOf, required, text } from "@/lib/form";
import { isPositive, parseMoneyInput } from "@/lib/format/money";

/**
 * `customerId` is deliberately absent: it is issued by the server and never
 * accepted from the caller (FR-03.2, BR-45). `shopId` appears on create only —
 * a record's shop is fixed at creation (BR-54) and a PATCH carrying it is a
 * 400, not a silent no-op.
 */
const baseFields = {
  name: z.string().trim().min(1, "A customer needs a name."),
  phone: z.string().trim().min(1, "A phone number is required."),
  company: z.string().trim().optional(),
  email: z.union([z.string().trim().email("Enter a valid email address."), z.literal("")]).optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  statusCode: z.enum(["active", "inactive"]).optional(),
};

const createSchema = z.object({
  ...baseFields,
  shopId: z.string().trim().min(1, "Choose the shop this customer belongs to."),
});

const updateSchema = z.object(baseFields);

function readForm(formData: FormData) {
  return {
    name: required(formData, "name"),
    phone: required(formData, "phone"),
    company: text(formData, "company"),
    email: text(formData, "email"),
    address: text(formData, "address"),
    city: text(formData, "city"),
    notes: text(formData, "notes"),
    statusCode: text(formData, "statusCode"),
    shopId: text(formData, "shopId"),
  };
}

export async function createCustomerAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "add_customer")) {
    return { formError: "You do not have permission to add a customer." };
  }

  const parsed = createSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  let id: string;
  try {
    const customer = await createCustomer(parsed.data);
    id = customer.id;
  } catch (error) {
    return toActionState(error);
  }

  redirect(`/customers/${id}`);
}

export async function updateCustomerAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "change_customer")) {
    return { formError: "You do not have permission to edit a customer." };
  }

  const id = required(formData, "id");
  if (!id) return { formError: "Missing customer id." };

  const parsed = updateSchema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await updateCustomer(id, parsed.data);
  } catch (error) {
    return toActionState(error);
  }

  redirect(`/customers/${id}`);
}

export async function deleteCustomerAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "delete_customer")) {
    return { formError: "You do not have permission to delete a customer." };
  }

  const id = required(formData, "id");

  try {
    // BR-21 — this cascades to every sale, line item, payment, batch and
    // allocation. The impact was shown before the button was offered.
    await deleteCustomer(id);
  } catch (error) {
    return toActionState(error);
  }

  redirect("/customers");
}

const paymentSchema = z.object({
  paymentDate: z.string().trim().min(1, "Choose a payment date."),
  paymentMethodId: z.string().trim().min(1, "Choose a payment method."),
  notes: z.string().trim().optional(),
});

/**
 * FR-03.5 — one lump sum, spread by the server across outstanding invoices
 * oldest-first (BR-16). BR-17 caps it at the total outstanding: over that, the
 * whole event is rejected and nothing is written, so there is no partial state
 * to reconcile here.
 */
export async function recordPaymentAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "add_customerpayment")) {
    return { formError: "You do not have permission to record a payment." };
  }

  const id = required(formData, "id");
  const amount = parseMoneyInput(formData.get("amount"));

  if (!amount) {
    return { fieldErrors: { amount: "Enter an amount." } };
  }
  if (!isPositive(amount)) {
    return { fieldErrors: { amount: "The amount must be greater than zero." } };
  }

  const parsed = paymentSchema.safeParse({
    paymentDate: required(formData, "paymentDate"),
    paymentMethodId: required(formData, "paymentMethodId"),
    notes: text(formData, "notes"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await recordCustomerPayment(id, { amount, ...parsed.data });
  } catch (error) {
    return toActionState(error);
  }

  // The orders tab is where the result shows, and we are already on it.
  refresh();
  return { ok: true };
}
