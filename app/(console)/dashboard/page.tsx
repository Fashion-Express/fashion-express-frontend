import type { Metadata } from "next";
import { getDashboard } from "@/lib/api/dashboard";
import { firstParam } from "@/lib/api/types";
import { formatMoney, formatQuantity, isPositive } from "@/lib/format/money";
import { requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader, StatTile, Card, EmptyState, Alert } from "@/components/ui/surfaces";
import { ButtonLink } from "@/components/ui/button";
import { Table, Td, Th, Tr } from "@/components/ui/table";

export const metadata: Metadata = { title: "Dashboard" };

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

  const { headline, sales, businessWide, topProducts } = dashboard;

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
