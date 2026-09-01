import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { getCustomer, getCustomerAccount, getOutstanding } from "@/lib/api/customers";
import { customerPaymentMethods } from "@/lib/api/reference";
import { ordersPdfPath } from "@/lib/api/sales";
import { can, requireSession } from "@/lib/auth/session";
import { formatDate, todayInDhaka } from "@/lib/format/date";
import { formatMoney, isZero } from "@/lib/format/money";
import { plural } from "@/lib/format/plural";
import { DownloadLink } from "@/components/ui/button";
import { Card, EmptyState, PageBody, StatTile } from "@/components/ui/surfaces";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { CustomerHeader } from "../customer-header";
import { loadPaymentBatch } from "./batch-action";
import { loadSaleItems } from "./items-action";
import { OrderRow } from "./order-row";
import { PaymentReceipt } from "./payment-receipt";
import { RecordPayment } from "./record-payment";

export const metadata: Metadata = { title: "Customer orders" };

export default async function CustomerOrdersPage(
  props: PageProps<"/customers/[id]/orders">,
) {
  const { id } = await props.params;
  const me = await requireSession();

  let customer;
  try {
    customer = await getCustomer(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const [account, outstanding, methods] = await Promise.all([
    getCustomerAccount(id),
    getOutstanding(id),
    // Scoped list: `customer` methods only, so a supplier-only method such as
    // LC is never offered on a customer receipt (BR-62).
    can(me, "add_customerpayment")
      ? customerPaymentMethods().catch(() => [])
      : Promise.resolve([]),
  ]);

  // FR-03.5.1 — the payment action is offered only when something is owed.
  const owes = !isZero(outstanding.outstanding);

  /**
   * A sale opened from here carries the way back, so the sale screen's "Back"
   * returns to this customer rather than dumping the reader in the global sales
   * list. `/sales/[id]` runs the value through `safeRedirect` before using it.
   */
  const back = encodeURIComponent(`/customers/${customer.id}/orders`);
  const saleHref = (saleId: string) => `/sales/${saleId}?from=${back}`;

  return (
    <>
      <CustomerHeader
        customer={customer}
        me={me}
        current={`/customers/${customer.id}/orders`}
      />

      <PageBody>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="Total invoiced"
            value={formatMoney(account.totals.invoiced)}
            note={`${plural(account.totals.order_count, "finalized order")}`}
            tone="accent"
          />
          <StatTile
            label="Total received"
            value={formatMoney(account.totals.received)}
            tone="success"
          />
          <StatTile
            label="Total due"
            value={formatMoney(account.totals.due)}
            tone={owes ? "danger" : "success"}
          />
        </div>

        <Card
          title="Order history"
          actions={
            <>
              {/* Offered only when there is something to export — a PDF of an
                  empty table helps nobody. */}
              {account.orders.length > 0 && (
                <DownloadLink href={ordersPdfPath(customer.id)}>
                  Download PDF
                </DownloadLink>
              )}
              {can(me, "add_customerpayment") && owes && (
                <RecordPayment
                  customerId={customer.id}
                  customerName={customer.name}
                  outstanding={outstanding.outstanding}
                  methods={methods}
                  today={todayInDhaka()}
                />
              )}
            </>
          }
          bodyClassName="p-0"
        >
          {account.orders.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No finalized orders"
                description="Drafts and quotations are excluded from this view and from every money figure in the system."
              />
            </div>
          ) : (
            <div className="px-5 pb-3">
              <Table
                head={
                  <>
                    <Th>Sale no.</Th>
                    <Th>Finalized</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">Paid</Th>
                    <Th align="right">Due</Th>
                    <Th>Status</Th>
                    <Th align="right">Actions</Th>
                  </>
                }
              >
                {account.orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    href={saleHref(order.id)}
                    loadItems={loadSaleItems}
                  />
                ))}
              </Table>
            </div>
          )}
        </Card>

        <Card title="Payment history" bodyClassName="p-0">
          {account.paymentEvents.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No payments recorded"
                description="A payment is spread across outstanding invoices oldest-first, and each invoice it touches gets its own receipt."
              />
            </div>
          ) : (
            <div className="px-5 pb-3">
              <Table
                head={
                  <>
                    <Th>Reference</Th>
                    <Th>Date</Th>
                    <Th>Method</Th>
                    <Th align="right">Amount</Th>
                    <Th align="right">Invoices settled</Th>
                    <Th>Notes</Th>
                  </>
                }
              >
                {account.paymentEvents.map((event) => (
                  <Tr key={event.id}>
                    <Td mono>
                      <PaymentReceipt
                        customerId={customer.id}
                        batchRef={event.batch_ref}
                        loadBatch={loadPaymentBatch}
                      />
                    </Td>
                    <Td mono>{formatDate(event.payment_date)}</Td>
                    <Td>{event.method_label}</Td>
                    <Td align="right" mono>{formatMoney(event.total_amount)}</Td>
                    <Td align="right" mono>{event.invoices_settled}</Td>
                    <Td className="max-w-[220px] truncate">{event.notes || "—"}</Td>
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
