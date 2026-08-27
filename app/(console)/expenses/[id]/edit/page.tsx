import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { forbidden } from "@/lib/api/guard";
import { getExpense } from "@/lib/api/expenses";
import { expenseCategories, expensePaymentMethods, optionLabel } from "@/lib/api/reference";
import { listShopOptions } from "@/lib/api/shops";
import { can, isManager, requireSession } from "@/lib/auth/session";
import { todayInDhaka } from "@/lib/format/date";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { updateExpenseAction } from "../../actions";
import { ExpenseForm } from "../../expense-form";

export const metadata: Metadata = { title: "Edit expense" };

export default async function EditExpensePage(props: PageProps<"/expenses/[id]/edit">) {
  const { id } = await props.params;
  const me = await requireSession();

  // BR-33 — a Finance user may create expenses all day but gets a 403 here,
  // even on a row they entered themselves.
  if (!can(me, "change_expense") || !isManager(me)) {
    forbidden("Editing an expense is manager-only (BR-33).");
  }

  let expense;
  try {
    expense = await getExpense(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const [categories, methods, shops] = await Promise.all([
    expenseCategories(),
    expensePaymentMethods().catch(() => []),
    listShopOptions().catch(() => []),
  ]);

  return (
    <>
      <PageHeader eyebrow="Expenses / Edit" title="Edit expense" />
      <PageBody>
        <ExpenseForm
          action={updateExpenseAction}
          expense={expense}
          categories={categories.map((c) => ({ id: c.id, label: optionLabel(c) }))}
          methods={methods.map((m) => ({ id: m.id, label: optionLabel(m) }))}
          shops={shops}
          today={todayInDhaka()}
          cancelHref={`/expenses/${expense.id}`}
          submitLabel="Save changes"
        />
      </PageBody>
    </>
  );
}
