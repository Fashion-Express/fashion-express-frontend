import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { customerPaymentMethods, optionLabel } from "@/lib/api/reference";
import {
  getSale,
  invoicePath,
  receiptPath,
  statementPath,
} from "@/lib/api/sales";
import { listInventoryOptions } from "@/lib/api/inventory";
import { firstParam } from "@/lib/api/types";
import { safeRedirect } from "@/lib/form";
import { can, requireSession } from "@/lib/auth/session";
import { formatDate, formatDateTime, todayInDhaka } from "@/lib/format/date";
import { formatMoney, formatQuantity, isPositive, isZero } from "@/lib/format/money";
import { ButtonLink, DownloadLink } from "@/components/ui/button";
import { Alert, Card, DetailList, EmptyState, PageBody, PageHeader, StatTile, StatusPill } from "@/components/ui/surfaces";
import { RowActions, RowLink, Table, Td, Th, Tr } from "@/components/ui/table";
import {
  AddSaleItem,
  ApplySaleDiscount,
  ConvertQuotation,
  DeleteSale,
  DeleteSalePayment,
  EditSalePayment,
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

  /**
   * Where "Back" goes. A sale is reachable from the sales list and from a
   * customer's Orders tab, and returning to the list from the latter loses the
   * reader's place. `safeRedirect` keeps this to a path on this origin — an
   * absolute or protocol-relative URL here would be an open redirect.
   */
  const backHref = safeRedirect(firstParam((await props.searchParams).from), "/sales");

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

  const isCancelled = sale.status_code === "cancelled";

  /*
   * BR-11 names exactly ONE status that cannot take a payment: a cancelled
   * sale. A draft can, and so can a quotation — an advance against an offer is
   * ordinary trade, and it rides along when the quotation is converted.
   */
  const mayPay =
    can(me, "add_salepayment") && !isCancelled && isPositive(sale.balance_due);

  /*
   * BR-69 — a discount is editable only while something is still owed, and
   * never on a cancelled sale or a quotation. Once the balance reaches zero the
   * button goes: reducing the discount further is arithmetically impossible and
   * raising it would resurrect a balance on a settled sale.
   */
  const mayDiscount =
    can(me, "change_sale") &&
    !isCancelled &&
    !isQuotation &&
    isPositive(sale.balance_due);
  // Also needed to EDIT a receipt's method, which stays available after the
  // balance reaches zero — so the list is fetched for either reason.
  const mayEditPayments = can(me, "change_salepayment") && sale.payments.length > 0;
  const methods =
    mayPay || mayEditPayments ? await customerPaymentMethods().catch(() => []) : [];
  const methodOptions = methods.map((m) => ({ id: m.id, label: optionLabel(m) }));

  // FR-02.6.1 — editing the LINES of a finalised sale is restricted to
  // administrators. A manager may see one but not change it.
  const mayEditFinalizedLines = me.userType.isSuperuser;
  const mayEditLines = isFinalized ? mayEditFinalizedLines : can(me, "change_sale");
  const mayRemoveLines = mayEditLines;
  // A cancelled sale is closed; nothing is added to it.
  const mayAddLines = mayEditLines && !isCancelled;

  /*
   * BR-50 — a sale may only draw on stock held by its OWN shop, so the picker
   * is fed per shop. Fetched only when a line could actually be added.
   */
  const products = mayAddLines
    ? await listInventoryOptions(sale.shop_id).catch(() => [])
    : [];

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
            <ButtonLink href={backHref} variant="outline">← Back</ButtonLink>
            {/* Its own tab: the document is read before it is printed, and
                this screen stays where it was. */}
            <ButtonLink href={invoicePath(sale.id)} target="_blank" variant="outline">
              {isQuotation ? "View quotation" : "View invoice"}
            </ButtonLink>
            {isQuotation && can(me, "change_sale") && <ConvertQuotation saleId={sale.id} />}
            {mayDiscount && (
              <ApplySaleDiscount
                saleId={sale.id}
                subtotal={sale.subtotal_amount}
                discount={sale.discount_amount}
                amountPaid={sale.amount_paid}
              />
            )}
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
            This is a quotation, not an invoice. No stock is reserved and it counts
            toward no revenue figure, though an advance may be taken against it.
            Convert it to a draft invoice when the customer accepts.
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
              /* BR-67 — only worth a row when there is one; an always-present
                 "Discount —" line is noise on the sales that never had one. */
              ...(isZero(sale.discount_amount)
                ? []
                : [
                    {
                      label: "Discount",
                      value: `${formatMoney(sale.subtotal_amount)} − ${formatMoney(sale.discount_amount)}`,
                      mono: true,
                    },
                    {
                      label: "Discounted by",
                      value: sale.discounted_by
                        ? `${sale.discounted_by}${sale.discount_reason ? ` — ${sale.discount_reason}` : ""}`
                        : "—",
                    },
                  ]),
              { label: "Created by", value: sale.created_by, mono: true },
            ]}
          />
          {sale.notes && (
            <p className="mt-5 border-t border-line pt-4 text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink-soft">
              {sale.notes}
            </p>
          )}
        </Card>

        <Card
          title="Items"
          actions={
            mayAddLines ? (
              <AddSaleItem
                saleId={sale.id}
                finalized={isFinalized}
                products={products.map((product) => ({
                  id: product.id,
                  label: `${product.part_name} (${product.part_code})`,
                  unitPrice: product.unit_price,
                  inStock: `${formatQuantity(product.quantity)} ${product.unit_label}`,
                }))}
              />
            ) : null
          }
          bodyClassName="p-0"
        >
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

        {/* BR-11 — a quotation may hold an advance, so it gets the same
            payment section as any other sale. Only a cancelled sale has
            nothing that can be paid against it. */}
        <Card
          title="Payments"
          actions={
            <>
              {/* The sale and its payment history as one document. Offered
                  only when there is a history to print. */}
              {sale.payments.length > 0 && (
                <DownloadLink href={statementPath(sale.id)} size="sm">
                  Download PDF
                </DownloadLink>
              )}
              {mayPay && (
                <RecordSalePayment
                  saleId={sale.id}
                  balanceDue={sale.balance_due}
                  methods={methodOptions}
                  today={todayInDhaka()}
                />
              )}
            </>
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
                    : "Each payment gets its own receipt number. Nothing counts toward revenue until the sale is finalized."
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
                    <Th align="right">Actions</Th>
                  </>
                }
              >
                {sale.payments.map((payment) => (
                  <Tr key={payment.id}>
                    <Td mono>{payment.receipt_number}</Td>
                    <Td mono>{formatDate(payment.payment_date)}</Td>
                    <Td>{payment.method_label}</Td>
                    <Td className="max-w-[220px] truncate">{payment.notes || "—"}</Td>
                    <Td align="right" mono>{formatMoney(payment.amount)}</Td>
                    <Td align="right">
                      <RowActions>
                        {/* Its own tab, as the old console had it: the
                            receipt is read and printed while this screen
                            stays where it was. */}
                        <RowLink
                          href={receiptPath(sale.id, payment.id)}
                          target="_blank"
                        >
                          Receipt
                        </RowLink>
                        {can(me, "change_salepayment") && (
                          <EditSalePayment
                            paymentId={payment.id}
                            receiptNumber={payment.receipt_number}
                            amount={payment.amount}
                            paymentDate={payment.payment_date}
                            methodId={payment.payment_method_id}
                            methods={methodOptions}
                            notes={payment.notes}
                          />
                        )}
                        {can(me, "delete_salepayment") && (
                          <DeleteSalePayment
                            paymentId={payment.id}
                            receiptNumber={payment.receipt_number}
                            amount={payment.amount}
                            fromBatch={payment.batch_id !== null}
                          />
                        )}
                      </RowActions>
                    </Td>
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
