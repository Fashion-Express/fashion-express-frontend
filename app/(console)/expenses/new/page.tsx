import type { Metadata } from "next";
import { forbidden } from "@/lib/api/guard";
import { expenseCategories, expensePaymentMethods, optionLabel } from "@/lib/api/reference";
import { listShopOptions } from "@/lib/api/shops";
import { can, requireSession } from "@/lib/auth/session";
import { todayInDhaka } from "@/lib/format/date";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { createExpenseAction } from "../actions";
import { ExpenseForm } from "../expense-form";

export const metadata: Metadata = { title: "Add expense" };

export default async function NewExpensePage() {
  const me = await requireSession();
  if (!can(me, "add_expense")) forbidden("Cannot add expenses.");

  const [categories, methods, shops] = await Promise.all([
    expenseCategories(),
    expensePaymentMethods().catch(() => []),
    listShopOptions().catch(() => []),
  ]);

  return (
    <>
      <PageHeader eyebrow="Expenses / Add" title="Add expense" />
      <PageBody>
        <ExpenseForm
          action={createExpenseAction}
          categories={categories.map((c) => ({ id: c.id, label: optionLabel(c) }))}
          methods={methods.map((m) => ({ id: m.id, label: optionLabel(m) }))}
          shops={shops}
          today={todayInDhaka()}
          cancelHref="/expenses"
          submitLabel="Save expense"
        />
      </PageBody>
    </>
  );
}
