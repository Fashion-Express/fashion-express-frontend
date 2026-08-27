import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { getExpense } from "@/lib/api/expenses";
import { can, isManager, requireSession } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Card, DetailList, PageBody, PageHeader, StatusPill } from "@/components/ui/surfaces";
import { DeleteExpense } from "./delete-expense";

export const metadata: Metadata = { title: "Expense" };

export default async function ExpenseDetailPage(props: PageProps<"/expenses/[id]">) {
  const { id } = await props.params;
  const me = await requireSession();

  let expense;
  try {
    expense = await getExpense(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  // BR-33 — creating is day-to-day work, changing is not.
  const mayEdit = can(me, "change_expense") && isManager(me);
  const mayDelete = can(me, "delete_expense") && isManager(me);

  return (
    <>
      <PageHeader
        eyebrow="Expenses / Detail"
        title={expense.description}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="info">{expense.category_label}</StatusPill>
            <span>{formatDate(expense.date)}</span>
          </div>
        }
        actions={
          <>
            <ButtonLink href="/expenses" variant="outline">← Back to list</ButtonLink>
            {mayEdit && <ButtonLink href={`/expenses/${expense.id}/edit`}>Edit</ButtonLink>}
            {mayDelete && <DeleteExpense expenseId={expense.id} description={expense.description} />}
          </>
        }
      />

      <PageBody>
        {!mayEdit && (
          <Alert tone="info">
            Editing and deleting an expense is restricted to managers — the ledger entry
            moves with it.
          </Alert>
        )}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Card title="Expense information">
            <DetailList
              columns={2}
              items={[
                { label: "Date", value: formatDate(expense.date), mono: true },
                { label: "Amount", value: formatMoney(expense.amount), mono: true },
                { label: "Category", value: expense.category_label },
                { label: "Payment method", value: expense.method_label ?? "—" },
                { label: "Paid to", value: expense.paid_to || "—" },
                { label: "Receipt number", value: expense.receipt_number || "—", mono: true },
                {
                  label: "Shop",
                  value: expense.shop_name ?? "Business-wide",
                },
                { label: "Recorded", value: formatDateTime(expense.created_at), mono: true },
              ]}
            />
          </Card>

          {/*
            FR-06.6 — provenance. An expense written by an approved staff claim
            is dated to when the cost was INCURRED, not when it was approved, and
            carries the employee as payee. Without this panel it would look like
            an entry nobody remembers making.
          */}
          {expense.claim ? (
            <Card title="From a bill claim">
              <DetailList
                columns={1}
                items={[
                  { label: "Claim", value: expense.claim.description },
                  { label: "Bill date", value: formatDate(expense.claim.bill_date), mono: true },
                  { label: "Submitted by", value: expense.claim.submitted_by, mono: true },
                  { label: "Approved by", value: expense.claim.approved_by, mono: true },
                  { label: "Approved on", value: formatDate(expense.claim.approval_date), mono: true },
                ]}
              />
              <Link
                href="/bills/review"
                className="mt-4 inline-block text-[12px] text-accent no-underline hover:underline"
              >
                Review bill claims →
              </Link>
            </Card>
          ) : (
            <Card title="Notes">
              <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink-soft">
                {expense.notes || "No notes recorded."}
              </p>
            </Card>
          )}
        </div>

        {expense.claim && expense.notes && (
          <Card title="Notes">
            <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink-soft">
              {expense.notes}
            </p>
          </Card>
        )}
      </PageBody>
    </>
  );
}
