import type { Metadata } from "next";
import { getDashboard } from "@/lib/api/dashboard";
import { firstParam } from "@/lib/api/types";
import { formatDate } from "@/lib/format/date";
import { formatMoney, formatQuantity, isPositive } from "@/lib/format/money";
import { requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader, StatTile, Card, EmptyState, Alert, StatusPill } from "@/components/ui/surfaces";
import { ButtonLink } from "@/components/ui/button";
import { RowLink, Table, Td, Th, Tr } from "@/components/ui/table";

export const metadata: Metadata = { title: "Dashboard" };

/** RD-03, as on the sales list. Only `finalized` counts toward a total. */
const STATUS_TONE = {
  quote: "info",
  draft: "neutral",
  finalized: "success",
  cancelled: "danger",
} as const;

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const params = await props.searchParams;
  const shopId = firstParam(params.shopId);

  const [me, dashboard] = await Promise.all([requireSession(), getDashboard(shopId)]);

  /*
   * FR-01.7 — check `reduced` before rendering anything else. A user whose
   * permissions cover bill claims only gets an entirely different payload; the
   * other keys are absent, not empty.
   */
  if (dashboard.reduced) {
    return (
      <>
        <PageHeader eyebrow="Overview" title={`Welcome, ${me.displayName || me.username}`} />
        <PageBody>
          <Alert tone="info">{dashboard.reason}</Alert>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Pending" value={dashboard.myClaims.pending} tone="warning" />
            <StatTile label="Approved" value={dashboard.myClaims.approved} tone="success" />
            <StatTile label="Rejected" value={dashboard.myClaims.rejected} tone="danger" />
          </div>

          <EmptyState
            title="Bill claims"
            description="Submit a claim for an expense you paid for personally, and track it here until it is reviewed."
            action={<ButtonLink href="/bills/submit">Submit a bill</ButtonLink>}
          />
        </PageBody>
      </>
    );
  }

  const { headline, sales, businessWide, topProducts, recentSales, recentExpenses } =
    dashboard;

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`Welcome, ${me.displayName || me.username}`}
        meta={shopId ? "Filtered to one shop" : "All shops"}
      />

      <PageBody>
        <section aria-labelledby="shop-figures" className="flex flex-col gap-3">
          <h2 id="shop-figures" className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
            {shopId ? "This shop" : "All shops"}
          </h2>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Active employees" value={headline.active_employees} note="Staff accounts in use" tone="info" />
            <StatTile label="Active customers" value={headline.active_customers} tone="accent" />
            <StatTile label="Inventory items" value={headline.inventory_items} note={`${headline.low_stock_count} at or below minimum`} tone={Number(headline.low_stock_count) > 0 ? "warning" : "neutral"} />
            <StatTile label="Stock value" value={formatMoney(headline.stock_value, { compact: true })} tone="warning" />

            <StatTile label="Today's sales (finalized)" value={formatMoney(sales.finalized_today, { compact: true })} note={`${sales.finalized_count} finalized in total`} tone="success" />
            <StatTile label="Invoiced" value={formatMoney(sales.invoiced, { compact: true })} note="Finalized sales only" tone="accent" />
            <StatTile label="Sales balance due" value={formatMoney(sales.outstanding, { compact: true })} note="Outstanding across finalized sales" tone={isPositive(sales.outstanding) ? "danger" : "success"} />
            <StatTile label="Drafts & quotations" value={`${sales.draft_count} / ${sales.quotation_count}`} note="Excluded from every money figure" tone="neutral" />
          </div>
        </section>

        {/*
          FR-11.4 — these are NOT shop-scoped. The API says so in its own
          payload, and a figure that silently ignored the filter above it would
          be worse than no figure at all.
        */}
        <section aria-labelledby="business-figures" className="flex flex-col gap-3">
          <h2 id="business-figures" className="font-mono text-[10px] tracking-[0.1em] text-muted uppercase">
            Business-wide · not affected by the shop filter
          </h2>

          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile label="Expenses this month" value={formatMoney(businessWide.expenses_this_month, { compact: true })} tone="info" />
            <StatTile label="Claims awaiting review" value={businessWide.claims_awaiting_review} tone="warning" />
            <StatTile label="Claims awaiting value" value={formatMoney(businessWide.claims_awaiting_value, { compact: true })} tone="warning" />
          </div>

          <p className="text-[11.5px] leading-relaxed text-faint">{businessWide.note}</p>
        </section>

        {/*
          FR-01.3 — what has just happened, beside the figures that summarise
          it. Two independent lists, so they sit side by side on a wide screen
          and stack below `lg` rather than squeezing four columns each.
        */}
        <div className="grid gap-3 lg:grid-cols-2">
          <Card
            title="Recent sales"
            actions={<ButtonLink href="/sales" variant="outline" size="sm">View all</ButtonLink>}
            bodyClassName="p-0 sm:p-0"
          >
            {recentSales.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No sales yet"
                  description="Raise a quotation for an offer, or a sale to invoice and draw stock."
                />
              </div>
            ) : (
              <div className="px-5 pb-2">
                <Table
                  head={
                    <>
                      <Th>Sale #</Th>
                      <Th>Customer</Th>
                      <Th align="right">Amount</Th>
                      <Th>Status</Th>
                    </>
                  }
                >
                  {recentSales.map((sale) => (
                    <Tr key={sale.id}>
                      <Td mono>
                        <RowLink href={`/sales/${sale.id}`}>{sale.sale_number}</RowLink>
                      </Td>
                      <Td strong>{sale.customer_name}</Td>
                      <Td align="right" mono>{formatMoney(sale.total_amount)}</Td>
                      <Td>
                        <StatusPill tone={STATUS_TONE[sale.status_code]}>
                          {sale.status_label}
                        </StatusPill>
                      </Td>
                    </Tr>
                  ))}
                </Table>
              </div>
            )}
          </Card>

          {/* FR-11.4 — business-wide, so this list ignores the shop filter in
              the same way the expenses tile above it does. */}
          <Card
            title="Recent expenses"
            actions={<ButtonLink href="/expenses" variant="outline" size="sm">View all</ButtonLink>}
            bodyClassName="p-0 sm:p-0"
          >
            {recentExpenses.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No expenses recorded"
                  description="Expenses cover the whole business, not one shop."
                />
              </div>
            ) : (
              <div className="px-5 pb-2">
                <Table
                  head={
                    <>
                      <Th>Date</Th>
                      <Th>Category</Th>
                      <Th align="right">Amount</Th>
                    </>
                  }
                >
                  {recentExpenses.map((expense) => (
                    <Tr key={expense.id}>
                      <Td mono>{formatDate(expense.date)}</Td>
                      <Td strong className="max-w-[220px] truncate">
                        {expense.category_label}
                        <span className="mt-0.5 block text-[11px] font-normal text-faint">
                          {expense.description}
                        </span>
                      </Td>
                      <Td align="right" mono className="text-danger">
                        {formatMoney(expense.amount)}
                      </Td>
                    </Tr>
                  ))}
                </Table>
              </div>
            )}
          </Card>
        </div>

        <Card title="Top selling products" bodyClassName="p-0 sm:p-0">
          {topProducts.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No finalized sales yet" description="Products appear here once a sale has been finalized." />
            </div>
          ) : (
            <div className="px-5 pb-2">
              <Table
                head={
                  <>
                    <Th>Product</Th>
                    <Th>Type</Th>
                    <Th align="right">Quantity sold</Th>
                    <Th align="right">Value sold</Th>
                  </>
                }
              >
                {topProducts.map((product) => (
                  <Tr key={`${product.label}-${product.item_type}`}>
                    <Td strong>{product.label}</Td>
                    <Td>{product.item_type === "inventory" ? "Stocked" : "Machine"}</Td>
                    <Td align="right" mono>{formatQuantity(product.quantity_sold)}</Td>
                    <Td align="right" mono>{formatMoney(product.value_sold)}</Td>
                  </Tr>
                ))}
              </Table>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}
