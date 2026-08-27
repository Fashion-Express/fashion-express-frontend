import type { Metadata } from "next";
import { forbidden } from "@/lib/api/guard";
import { expensesByCategory } from "@/lib/api/expenses";
import { EXPORT_ROUTES, getReportSummary } from "@/lib/api/reports";
import { can, isManager, requireSession } from "@/lib/auth/session";
import { formatMoney, isNegative, sum } from "@/lib/format/money";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageBody, PageHeader, StatTile } from "@/components/ui/surfaces";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const me = await requireSession();
  // FR-09.5 — reports are manager-only.
  if (!can(me, "view_ledger") || !isManager(me)) {
    forbidden("Reports are manager-only (FR-09.5).");
  }

  const [summary, byCategory] = await Promise.all([
    getReportSummary(),
    expensesByCategory().catch(() => []),
  ]);

  const categoryTotal = sum(byCategory.map((row) => row.total));
  const mayExport = can(me, "export_data");

  return (
    <>
      <PageHeader
        eyebrow="Reports"
        title="Reports & analytics"
        meta="View and export business data."
        actions={
          mayExport ? (
            <>
              {/* Exports are LINKS, not fetches: the workbook streams from the
                  API through the download route, which attaches the session
                  cookie the browser cannot send itself. */}
              <a
                href={EXPORT_ROUTES.customers}
                className="inline-flex h-control items-center rounded-control border border-line bg-surface px-4 text-[12.5px] font-semibold text-ink-soft no-underline transition-colors hover:bg-subtle"
              >
                Customer report
              </a>
              <a
                href={EXPORT_ROUTES.full}
                className="inline-flex h-control items-center rounded-control bg-accent px-4 text-[12.5px] font-semibold text-accent-ink no-underline"
              >
                Export all data
              </a>
            </>
          ) : null
        }
      />

      <PageBody>
        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
            Ledger
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Current balance"
              value={formatMoney(summary.ledger.balance, { compact: true })}
              tone={isNegative(summary.ledger.balance) ? "danger" : "success"}
            />
            <StatTile label="Total credits" value={formatMoney(summary.ledger.credits, { compact: true })} tone="success" />
            <StatTile label="Total debits" value={formatMoney(summary.ledger.debits, { compact: true })} tone="danger" />
          </div>
          <div>
            <ButtonLink href="/reports/ledger" variant="outline" size="sm">
              View ledger →
            </ButtonLink>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
            Trading
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Invoiced" value={formatMoney(summary.trading.invoiced, { compact: true })} note="Finalized sales only" tone="accent" />
            <StatTile label="Received" value={formatMoney(summary.trading.received, { compact: true })} tone="success" />
            <StatTile label="Outstanding" value={formatMoney(summary.trading.outstanding, { compact: true })} tone="danger" />
          </div>
        </section>

        <Card title="By shop" bodyClassName="p-0">
          {summary.byShop.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No shop figures yet" />
            </div>
          ) : (
            <div className="px-5 pb-3">
              <Table
                head={
                  <>
                    <Th>Shop</Th>
                    <Th align="right">Invoiced</Th>
                    <Th align="right">Received</Th>
                    <Th align="right">Outstanding</Th>
                    <Th align="right">Stock value</Th>
                    <Th align="right">Customers</Th>
                    <Th align="right">Attributed expenses</Th>
                  </>
                }
              >
                {summary.byShop.map((shop) => (
                  <Tr key={shop.name}>
                    <Td strong>{shop.name}</Td>
                    <Td align="right" mono>{formatMoney(shop.invoiced)}</Td>
                    <Td align="right" mono>{formatMoney(shop.received)}</Td>
                    <Td align="right" mono>{formatMoney(shop.outstanding)}</Td>
                    <Td align="right" mono>{formatMoney(shop.stock_value)}</Td>
                    <Td align="right" mono>{shop.customer_count}</Td>
                    <Td align="right" mono>{formatMoney(shop.attributed_expenses)}</Td>
                  </Tr>
                ))}
              </Table>

              {/*
                There is deliberately no per-shop net profit. Revenue is
                shop-scoped so the gross figures are real, but many expenses are
                business-wide by design (§10.2) and dividing them between shops
                would be arbitrary. Saying so is better than printing a number
                nobody should act on.
              */}
              <p className="pt-3 text-[11.5px] leading-relaxed text-faint">
                Attributed expenses count only the costs explicitly given that shop. Many
                costs are business-wide, so there is no per-shop net profit here — to get
                one, attribute the expenses upstream.
              </p>
            </div>
          )}
        </Card>

        <Card title="Expenses by category" bodyClassName="p-0">
          {byCategory.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No expenses recorded" />
            </div>
          ) : (
            <div className="px-5 pb-3">
              <Table
                head={
                  <>
                    <Th>Category</Th>
                    <Th align="right">Entries</Th>
                    <Th align="right">Total</Th>
                  </>
                }
              >
                {byCategory.map((row) => (
                  <Tr key={row.code}>
                    <Td strong>{row.label}</Td>
                    <Td align="right" mono>{row.count}</Td>
                    <Td align="right" mono>{formatMoney(row.total)}</Td>
                  </Tr>
                ))}
                <Tr>
                  <Td strong>Total</Td>
                  <Td align="right" mono>—</Td>
                  <Td align="right" mono strong>{formatMoney(categoryTotal)}</Td>
                </Tr>
              </Table>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}
