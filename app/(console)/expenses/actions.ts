"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { toActionState, type ActionState } from "@/lib/api/errors";
import { createExpense, deleteExpense, updateExpense } from "@/lib/api/expenses";
import { can, isManager, requireSession } from "@/lib/auth/session";
import { fieldErrorsOf, required, text } from "@/lib/form";
import { parseMoneyInput } from "@/lib/format/money";

/**
 * BR-33 runs through this file: anyone holding `add_expense` may CREATE an
 * expense, but editing or deleting one additionally requires MANAGER. Recording
 * a cost is day-to-day work; changing one after the fact is not, because the
 * ledger has already moved (BR-40).
 */

const schema = z.object({
  date: z.string().min(1, "Choose the date of the expense."),
  description: z.string().min(1, "Describe what this was for."),
  expenseCategoryId: z.string().min(1, "Every expense is classified — choose a category."),
  paymentMethodId: z.string().optional(),
  paidTo: z.string().optional(),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
  shopId: z.string().optional(),
});

function readForm(formData: FormData) {
  return {
    date: required(formData, "date"),
    description: required(formData, "description"),
    expenseCategoryId: required(formData, "expenseCategoryId"),
    paymentMethodId: text(formData, "paymentMethodId"),
    paidTo: text(formData, "paidTo"),
    receiptNumber: text(formData, "receiptNumber"),
    notes: text(formData, "notes"),
    // Absent means a BUSINESS-WIDE cost — head office rent, the accountant's
    // fee (§10.2). That is a meaningful value, not a missing one.
    shopId: text(formData, "shopId"),
  };
}

export async function createExpenseAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "add_expense")) {
    return { formError: "You do not have permission to record an expense." };
  }

  const amount = parseMoneyInput(formData.get("amount"));
  if (!amount) return { fieldErrors: { amount: "Enter an amount." } };

  const parsed = schema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  let id: string;
  try {
    const expense = await createExpense({ ...parsed.data, amount });
    id = expense.id;
  } catch (error) {
    return toActionState(error);
  }

  redirect(`/expenses/${id}`);
}

export async function updateExpenseAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "change_expense") || !isManager(me)) {
    return {
      formError:
        "Only managers may edit an expense — the ledger entry moves with it (BR-33).",
    };
  }

  const id = required(formData, "id");
  const amount = parseMoneyInput(formData.get("amount"));
  if (!amount) return { fieldErrors: { amount: "Enter an amount." } };

  const parsed = schema.safeParse(readForm(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  try {
    await updateExpense(id, { ...parsed.data, amount });
  } catch (error) {
    return toActionState(error);
  }

  redirect(`/expenses/${id}`);
}

export async function deleteExpenseAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const me = await requireSession();
  if (!can(me, "delete_expense") || !isManager(me)) {
    return {
      formError:
        "Only managers may delete an expense — it removes the ledger entry (BR-33, BR-40).",
    };
  }

  try {
    await deleteExpense(required(formData, "id"));
  } catch (error) {
    return toActionState(error);
  }

  redirect("/expenses");
}
