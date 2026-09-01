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

const baseFields = {
  date: z.string().min(1, "Choose the date of the expense."),
  description: z.string().min(1, "Describe what this was for."),
  paymentMethodId: z.string().optional(),
  paidTo: z.string().optional(),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
  shopId: z.string().optional(),
};

const createSchema = z.object({
  ...baseFields,
  expenseCategoryId: z.string().min(1, "Every expense is classified — choose a category."),
});

/**
 * On a PATCH the category is OPTIONAL, and blank means "leave it as it was".
 *
 * It cannot be required here: the expense read shape returns `category_code`
 * and `category_label` but no category id, so the edit form has nothing to
 * preselect the picker with. Requiring it made every first save of an edit fail
 * with "Every expense is classified" even when the user had changed only the
 * amount. Omitting the field instead is the same contract every other optional
 * field on this form already has — absent means unchanged.
 */
const updateSchema = z.object({
  ...baseFields,
  expenseCategoryId: z.string().optional(),
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

  const parsed = createSchema.safeParse(readForm(formData));
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
        "Only managers may edit an expense — the ledger entry moves with it.",
    };
  }

  const id = required(formData, "id");
  const amount = parseMoneyInput(formData.get("amount"));
  if (!amount) return { fieldErrors: { amount: "Enter an amount." } };

  const parsed = updateSchema.safeParse(readForm(formData));
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
        "Only managers may delete an expense — it removes the ledger entry.",
    };
  }

  try {
    await deleteExpense(required(formData, "id"));
  } catch (error) {
    return toActionState(error);
  }

  redirect("/expenses");
}
