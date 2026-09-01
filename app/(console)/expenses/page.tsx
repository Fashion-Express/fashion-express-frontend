import type { Metadata } from "next";
import { listExpenses } from "@/lib/api/expenses";
import { expenseCategories, optionLabel } from "@/lib/api/reference";
import { firstParam, pageParam } from "@/lib/api/types";
import { can, isManager, requireSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format/date";
import { formatMoney, isNegative } from "@/lib/format/money";
import { plural } from "@/lib/format/plural";
import { ButtonLink } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState, PageBody, PageHeader, StatTile, StatusPill } from "@/components/ui/surfaces";
import { Pagination, RowActions, RowLink, Table, Td, Th, Tr } from "@/components/ui/table";
import { DeleteExpense } from "./[id]/delete-expense";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage(props: PageProps<"/expenses">) {
  const params = await props.searchParams;
  const search = firstParam(params.search);
  const expenseCategoryId = firstParam(params.expenseCategoryId);
  const from = firstParam(params.from);
  const to = firstParam(params.to);
  const shopId = firstParam(params.shopId);
  const page = pageParam(params.page);

  const me = await requireSession();
  const [expenses, categoryOptions] = await Promise.all([
    listExpenses({ page, search, expenseCategoryId, from, to, shopId }),
    expenseCategories().catch(() => []),
  ]);

  /*
   * Editing or deleting an expense additionally requires MANAGER, not just the
   * permission — recording a cost is day-to-day work, changing one after the
   * fact moves a ledger entry. Gated the same way the actions themselves are,
   * so the row never offers a button the server will refuse.
   */
  const mayEdit = can(me, "change_expense") && isManager(me);
  const mayDelete = can(me, "delete_expense") && isManager(me);

  const filtered = Boolean(search || expenseCategoryId || from || to);

  return (
    <>
      <PageHeader
        eyebrow="Expenses"
        title="Track daily business expenses"
        meta="Every expense posts a debit to the ledger automatically."
        actions={
          can(me, "add_expense") ? (
            <ButtonLink href="/expenses/new">+ Add expense</ButtonLink>
          ) : null
        }
      />

      <PageBody>
        <div className="grid gap-3 sm:grid-cols-2">
          {/* FR-06.5 — the filtered total covers everything matching, not just
              this page; the ledger balance is deliberately NOT filtered,
              because it is the business's number rather than this page's. */}
          <StatTile
            label={filtered ? "Total (this filter)" : "Total expenses"}
            value={formatMoney(expenses.filteredTotal, { compact: true })}
            note={plural(expenses.total, "entry", "entries")}
            tone="info"
          />
          <StatTile
            label="Current ledger balance"
            value={formatMoney(expenses.ledgerBalance, { compact: true })}
            note="Business-wide — not affected by these filters"
            tone={isNegative(expenses.ledgerBalance) ? "danger" : "success"}
          />
        </div>

        <FilterBar
          basePath="/expenses"
          values={{ search, expenseCategoryId, from, to }}
          fields={[
            { type: "search", name: "search", placeholder: "Search description, payee or receipt" },
            {
              type: "select",
              name: "expenseCategoryId",
              label: "All categories",
              options: categoryOptions.map((c) => ({ value: c.id, label: optionLabel(c) })),
            },
            { type: "date", name: "from", label: "From" },
            { type: "date", name: "to", label: "To" },
          ]}
        />

        {expenses.items.length === 0 ? (
          <EmptyState
            title={filtered ? "No expenses match that filter" : "No expenses recorded"}
            description={
              filtered
                ? "An explicit date range takes precedence over a single date or month."
                : "Record the first cost the business has paid out."
            }
            action={
              can(me, "add_expense") && !filtered ? (
                <ButtonLink href="/expenses/new">+ Add expense</ButtonLink>
              ) : null
            }
          />
        ) : (
          <>
            <Table
              head={
                <>
                  <Th>Date</Th>
                  <Th>Category</Th>
                  <Th>Description</Th>
                  <Th align="right">Amount</Th>
                  <Th>Paid to</Th>
                  <Th>Method</Th>
                  <Th>Shop</Th>
                  <Th align="right">Actions</Th>
                </>
              }
            >
              {expenses.items.map((expense) => (
                <Tr key={expense.id}>
                  <Td mono>{formatDate(expense.date)}</Td>
                  <Td><StatusPill tone="info">{expense.category_label}</StatusPill></Td>
                  <Td strong className="max-w-[280px] truncate">
                    {expense.description}
                    {/* FR-06.6 — an expense written by an approved staff claim
                        carries that provenance; showing it here prevents it
                        looking like a mystery entry someone typed. */}
                    {expense.claim_id && (
                      <span className="mt-0.5 block text-[11px] font-normal text-faint">
                        From bill claim #{expense.claim_id}
                      </span>
                    )}
                  </Td>
                  <Td align="right" mono>{formatMoney(expense.amount)}</Td>
                  <Td>{expense.paid_to || "—"}</Td>
                  <Td>{expense.method_label ?? "—"}</Td>
                  <Td>{expense.shop_name ?? <span className="text-faint">Business-wide</span>}</Td>
                  <Td align="right">
                    <RowActions>
                      <RowLink href={`/expenses/${expense.id}`}>View</RowLink>
                      {mayEdit && (
                        <RowLink href={`/expenses/${expense.id}/edit`}>Edit</RowLink>
                      )}
                      {mayDelete && (
                        <DeleteExpense
                          expenseId={expense.id}
                          description={expense.description}
                          variant="ghost"
                        />
                      )}
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </Table>

            <Pagination
              page={expenses}
              noun="expenses"
              basePath="/expenses"
              searchParams={{ search, expenseCategoryId, from, to, shopId }}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
