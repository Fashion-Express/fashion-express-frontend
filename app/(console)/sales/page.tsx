import type { Metadata } from "next";
import { listSales, type SaleStatus } from "@/lib/api/sales";
import { listUserOptions } from "@/lib/api/users";
import { firstParam, pageParam } from "@/lib/api/types";
import { can, isManager, requireSession } from "@/lib/auth/session";
import { formatDate } from "@/lib/format/date";
import { formatMoney, isPositive, isZero } from "@/lib/format/money";
import { ButtonLink } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState, PageBody, PageHeader, StatTile, StatusPill } from "@/components/ui/surfaces";
import { Pagination, RowActions, RowLink, Table, Td, Th, Tr } from "@/components/ui/table";

export const metadata: Metadata = { title: "Sales" };

/** RD-03. Only `finalized` touches stock or counts toward a total. */
const STATUS_TONE = {
  quote: "info",
  draft: "neutral",
  finalized: "success",
  cancelled: "danger",
} as const;

export default async function SalesPage(props: PageProps<"/sales">) {
  const params = await props.searchParams;
  const search = firstParam(params.search);
  const status = firstParam(params.status) as SaleStatus | undefined;
  const itemType = firstParam(params.itemType) as "inventory" | "non_inventory" | undefined;
  const createdFrom = firstParam(params.createdFrom);
  const createdTo = firstParam(params.createdTo);
  const createdById = firstParam(params.createdById);
  const shopId = firstParam(params.shopId);
  const page = pageParam(params.page);

  const me = await requireSession();

  /*
   * BR-01 — a non-manager sees only the sales they created, so "whose sale is
   * this?" is a question they can already answer. Offering the filter would
   * also hand them the staff list, which is not theirs to read: the API gates
   * `/users/options` on `view_user`, and this mirrors that rather than drawing
   * a control the fetch behind it would refuse.
   */
  const mayFilterByPerson = isManager(me) && can(me, "view_user");

  const [sales, salespeople] = await Promise.all([
    listSales({
      page,
      search,
      status,
      itemType,
      createdFrom,
      createdTo,
      createdById,
      shopId,
    }),
    // Never fatal: the list still reads without the filter.
    mayFilterByPerson ? listUserOptions().catch(() => []) : Promise.resolve([]),
  ]);

  const filtered = Boolean(
    search || status || itemType || createdFrom || createdTo || createdById,
  );

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Sales and quotations"
        meta="Totals exclude drafts and quotations, and respect the current filters."
        actions={
          can(me, "add_sale") ? (
            <>
              <ButtonLink href="/sales/new?mode=quotation" variant="outline">New quotation</ButtonLink>
              <ButtonLink href="/sales/new">+ New sale</ButtonLink>
            </>
          ) : null
        }
      />

      <PageBody>
        {/*
          BR-03 — drafts and quotations are excluded from every money figure, so
          a list showing drafts still reports totals over finalised sales only.
          With an item-type filter the figures are apportioned per BR-15: a
          mixed order contributes only its matching lines, receipts pro-rated by
          that line share.
        */}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Total invoiced"
            value={formatMoney(sales.totals.invoiced, { compact: true })}
            note={itemType ? "Apportioned to matching lines" : "Finalized sales only"}
            tone="accent"
          />
          <StatTile label="Total received" value={formatMoney(sales.totals.received, { compact: true })} tone="success" />
          <StatTile
            label="Total outstanding"
            value={formatMoney(sales.totals.outstanding, { compact: true })}
            tone={isPositive(sales.totals.outstanding) ? "danger" : "success"}
          />
        </div>

        <FilterBar
          basePath="/sales"
          values={{ search, status, itemType, createdFrom, createdTo, createdById }}
          fields={[
            { type: "search", name: "search", placeholder: "Search sale number, customer name or ID" },
            {
              type: "select",
              name: "status",
              label: "All statuses",
              options: [
                { value: "quote", label: "Quotation" },
                { value: "draft", label: "Draft" },
                { value: "finalized", label: "Finalized" },
                { value: "cancelled", label: "Cancelled" },
              ],
            },
            {
              type: "select",
              name: "itemType",
              label: "All item types",
              options: [
                { value: "inventory", label: "Stocked products" },
                { value: "non_inventory", label: "Machines" },
              ],
            },
            ...(mayFilterByPerson
              ? [
                  {
                    type: "select" as const,
                    name: "createdById",
                    label: "All salespeople",
                    options: salespeople.map((person) => ({
                      value: person.id,
                      label: person.name,
                    })),
                  },
                ]
              : []),
            { type: "date", name: "createdFrom", label: "From" },
            { type: "date", name: "createdTo", label: "To" },
          ]}
        />

        {sales.items.length === 0 ? (
          <EmptyState
            title={filtered ? "No sales match that filter" : "No sales yet"}
            description={
              filtered
                ? "A non-manager sees only the sales they created."
                : "Raise a quotation for an offer, or a sale to invoice and draw stock."
            }
            action={
              can(me, "add_sale") && !filtered ? (
                <ButtonLink href="/sales/new">+ New sale</ButtonLink>
              ) : null
            }
          />
        ) : (
          <>
            <Table
              head={
                <>
                  <Th>Sale #</Th>
                  <Th>Customer</Th>
                  <Th>Shop</Th>
                  <Th>Status</Th>
                  <Th>Finalized</Th>
                  <Th align="right">Total</Th>
                  <Th align="right">Paid</Th>
                  <Th align="right">Due</Th>
                  <Th>Created by</Th>
                  <Th align="right">Actions</Th>
                </>
              }
            >
              {sales.items.map((sale) => (
                <Tr key={sale.id}>
                  <Td mono className="text-accent">{sale.sale_number}</Td>
                  <Td strong>
                    {sale.customer_name}
                    <span className="mt-0.5 block font-mono text-[10.5px] font-normal text-faint">
                      {sale.customer_number}
                    </span>
                  </Td>
                  <Td>{sale.shop_name}</Td>
                  <Td>
                    <StatusPill tone={STATUS_TONE[sale.status_code]}>{sale.status_label}</StatusPill>
                  </Td>
                  <Td mono>{sale.finalized_at ? formatDate(sale.finalized_at) : "—"}</Td>
                  <Td align="right" mono>{formatMoney(sale.total_amount)}</Td>
                  <Td align="right" mono>{formatMoney(sale.amount_paid)}</Td>
                  <Td
                    align="right"
                    mono
                    className={
                      sale.status_code === "finalized" && !isZero(sale.balance_due)
                        ? "text-danger"
                        : undefined
                    }
                  >
                    {formatMoney(sale.balance_due)}
                  </Td>
                  <Td mono>{sale.created_by}</Td>
                  <Td align="right">
                    <RowActions>
                      <RowLink href={`/sales/${sale.id}`}>View</RowLink>
                    </RowActions>
                  </Td>
                </Tr>
              ))}
            </Table>

            <Pagination
              page={sales}
              noun="sales"
              basePath="/sales"
              searchParams={{
                search,
                status,
                itemType,
                createdFrom,
                createdTo,
                createdById,
                shopId,
              }}
            />
          </>
        )}
      </PageBody>
    </>
  );
}
