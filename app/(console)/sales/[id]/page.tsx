import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { customerPaymentMethods, optionLabel } from "@/lib/api/reference";
import { getSale, invoicePath } from "@/lib/api/sales";
import { can, requireSession } from "@/lib/auth/session";
import { formatDate, formatDateTime, todayInDhaka } from "@/lib/format/date";
import { formatMoney, formatQuantity, isPositive } from "@/lib/format/money";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Card, DetailList, EmptyState, PageBody, PageHeader, StatTile, StatusPill } from "@/components/ui/surfaces";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import {
  ConvertQuotation,
  DeleteSale,
  FinalizeSale,
  RecordSalePayment,
  RemoveSaleItem,
} from "./sale-actions";

export const metadata: Metadata = { title: "Sale" };

const STATUS_TONE = {
  quote: "info",
  draft: "neutral",
  finalized: "success",
  cancelled: "danger",
} as const;

export default async function SaleDetailPage(props: PageProps<"/sales/[id]">) {
  const { id } = await props.params;
  const me = await requireSession();

  let sale;
  try {
    sale = await getSale(id);
  } catch (error) {
    // BR-01 — a sale outside this user's scope answers 404, not 403: learning
    // that it exists would already be more than the rule allows. Passed
    // through as a plain not-found.
    if (error instanceof ApiError && (error.isNotFound || error.isForbidden)) notFound();
    throw error;
  }

  const isQuotation = sale.status_code === "quote";
  const isDraft = sale.status_code === "draft";
  const isFinalized = sale.status_code === "finalized";

  const mayPay = can(me, "add_salepayment") && isFinalized && isPositive(sale.balance_due);
  const methods = mayPay ? await customerPaymentMethods().catch(() => []) : [];

  // FR-02.6.1 — editing the LINES of a finalised sale is restricted to
  // administrators. A manager may see one but not change it.
  const mayEditFinalizedLines = me.userType.isSuperuser;
  const mayRemoveLines = isFinalized ? mayEditFinalizedLines : can(me, "change_sale");

  return (
    <>
      <PageHeader
        eyebrow={isQuotation ? "Sales / Quotation" : "Sales / Sale detail"}
        title={sale.sale_number}
        meta={
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={STATUS_TONE[sale.status_code]}>{sale.status_label}</StatusPill>
            <span>{sale.customer_name}</span>
            <span className="text-faint">· {sale.shop_name}</span>
          </div>
        }
        actions={
          <>
            <ButtonLink href="/sales" variant="outline">← Back</ButtonLink>
            {/* Its own tab: the document is read before it is printed, and
                this screen stays where it was. */}
            <ButtonLink href={invoicePath(sale.id)} target="_blank" variant="outline">
              {isQuotation ? "View quotation" : "View invoice"}
            </ButtonLink>
            {isQuotation && can(me, "change_sale") && <ConvertQuotation saleId={sale.id} />}
            {isDraft && can(me, "finalize_sale") && (
              <FinalizeSale saleId={sale.id} total={sale.total_amount} />
            )}
            {isDraft && can(me, "delete_sale") && (
              <DeleteSale saleId={sale.id} saleNumber={sale.sale_number} />
            )}
          </>
        }
      />

      <PageBody>
        {/* BR-02 / BR-03 — a quotation or draft touches no stock and counts
            toward no total, which is worth saying on the screen rather than
            leaving the reader to infer it from zeroes elsewhere. */}
        {isQuotation && (
          <Alert tone="info">
            This is a quotation, not an invoice. No stock is reserved, nothing is owed
            against it, and it counts toward no revenue figure. Convert it to a draft
            invoice when the customer accepts.
          </Alert>
        )}
        {isDraft && (
          <Alert tone="warning">
            This draft has not drawn stock and counts toward no total. Finalizing deducts
            stock and is irreversible.
          </Alert>
        )}
        {isFinalized && !mayEditFinalizedLines && (
          <Alert tone="info">
            This sale is finalized. Editing its lines is restricted to administrators.
          </Alert>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Total" value={formatMoney(sale.total_amount)} tone="accent" />
          <StatTile label="Paid" value={formatMoney(sale.amount_paid)} tone="success" />
          <StatTile
            label="Balance due"
            value={formatMoney(sale.balance_due)}
            note={isFinalized ? undefined : "Not counted while unfinalized"}
            tone={isFinalized && isPositive(sale.balance_due) ? "danger" : "success"}
          />
        </div>

        <Card title="Overview">
          <DetailList
            columns={3}
            items={[
              { label: "Sale number", value: sale.sale_number, mono: true },
              { label: "Customer", value: `${sale.customer_name} (${sale.customer_number})` },
              { label: "Shop", value: sale.shop_name },
              { label: "Status", value: sale.status_label },
              {
                label: "Finalized",
                value: sale.finalized_at ? formatDateTime(sale.finalized_at) : "—",
                mono: true,
              },
              { label: "Created by", value: sale.created_by, mono: true },
            ]}
          />
          {sale.notes && (
            <p className="mt-5 border-t border-line pt-4 text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink-soft">
              {sale.notes}
            </p>
          )}
        </Card>

        <Card title="Items" bodyClassName="p-0">
          <div className="px-5 pb-3">
            <Table
              head={
                <>
                  <Th>Type</Th>
                  <Th>Item</Th>
                  <Th align="right">Quantity</Th>
                  <Th align="right">Boxes</Th>
                  <Th align="right">Unit price</Th>
                  <Th align="right">Line total</Th>
                  {mayRemoveLines && <Th align="right">Actions</Th>}
                </>
              }
            >
              {sale.items.map((item) => (
                <Tr key={item.id}>
                  <Td>
                    {/* BR-04 — the two line kinds. A machine line has no product
                        to point at; its description IS the machine. */}
                    <StatusPill tone={item.item_type_code === "inventory" ? "accent" : "info"}>
                      {item.item_type_code === "inventory" ? "Stocked" : "Machine"}
                    </StatusPill>
                  </Td>
                  <Td strong>
                    {item.item_type_code === "inventory" ? item.part_name : item.description}
                    {item.part_code && (
                      <span className="mt-0.5 block font-mono text-[10.5px] font-normal text-faint">
                        {item.part_code}
                      </span>
                    )}
                  </Td>
                  <Td align="right" mono>{formatQuantity(item.quantity)}</Td>
                  <Td align="right" mono>{item.boxes || "—"}</Td>
                  <Td align="right" mono>{formatMoney(item.unit_price)}</Td>
                  <Td align="right" mono strong>{formatMoney(item.line_total)}</Td>
                  {mayRemoveLines && (
                    <Td align="right">
                      <RemoveSaleItem
                        saleId={sale.id}
                        itemId={item.id}
                        label={
                          item.item_type_code === "inventory"
                            ? (item.part_name ?? "this product")
                            : (item.description ?? "this line")
                        }
                        finalized={isFinalized}
                        lastLine={sale.items.length === 1}
                      />
                    </Td>
                  )}
                </Tr>
              ))}
            </Table>
          </div>
        </Card>

        {/* BR-11 — nothing is owed against a quotation, so it has no payment
            section at all rather than an empty one. */}
        {!isQuotation && (
          <Card
            title="Payments"
            actions={
              mayPay ? (
                <RecordSalePayment
                  saleId={sale.id}
                  balanceDue={sale.balance_due}
                  methods={methods.map((m) => ({ id: m.id, label: optionLabel(m) }))}
                  today={todayInDhaka()}
                />
              ) : null
            }
            bodyClassName="p-0"
          >
            {sale.payments.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="No payments recorded"
                  description={
                    isFinalized
                      ? "Each payment gets its own receipt number and posts a credit to the ledger."
                      : "Payments can be taken once the sale is finalized."
                  }
                />
              </div>
            ) : (
              <div className="px-5 pb-3">
                <Table
                  head={
                    <>
                      <Th>Receipt</Th>
                      <Th>Date</Th>
                      <Th>Method</Th>
                      <Th>Details</Th>
                      <Th align="right">Amount</Th>
                    </>
                  }
                >
                  {sale.payments.map((payment) => (
                    <Tr key={payment.id}>
                      <Td mono className="text-accent">{payment.receipt_number}</Td>
                      <Td mono>{formatDate(payment.payment_date)}</Td>
                      <Td>{payment.method_label}</Td>
                      <Td className="max-w-[220px] truncate">{payment.notes || "—"}</Td>
                      <Td align="right" mono>{formatMoney(payment.amount)}</Td>
                    </Tr>
                  ))}
                </Table>
              </div>
            )}
          </Card>
        )}
      </PageBody>
    </>
  );
}
