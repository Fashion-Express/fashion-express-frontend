import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { supplierPaymentMethods, optionLabel } from "@/lib/api/reference";
import {
  getPurchase,
  listPurchasePayments,
  type PurchaseDetail,
  type PurchasePayment,
} from "@/lib/api/suppliers";
import { can, requireSession } from "@/lib/auth/session";
import { formatDate, todayInDhaka } from "@/lib/format/date";
import { formatMoney, isZero } from "@/lib/format/money";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  DetailList,
  EmptyState,
  PageBody,
  PageHeader,
  StatTile,
} from "@/components/ui/surfaces";
import { RowActions, Table, Td, Th, Tr } from "@/components/ui/table";
import { PaymentDialog, type MethodOption } from "../../payment-form";
import { recordPurchasePaymentAction } from "../../../actions";
import { DeletePurchase } from "./delete-purchase";
import { DeletePurchasePayment, EditPurchasePayment } from "./payment-actions";

export const metadata: Metadata = { title: "Purchase" };

export default async function PurchaseDetailPage(
  props: PageProps<"/suppliers/[id]/purchases/[purchaseId]">,
) {
  const { id, purchaseId } = await props.params;
  const me = await requireSession();

  let purchase: PurchaseDetail;
  try {
    purchase = await getPurchase(purchaseId);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  // The purchase id is global, so a mismatched supplier in the URL would render
  // one supplier's purchase under another's breadcrumb.
  if (purchase.supplier_id !== id) notFound();

  const settled = isZero(purchase.due);
  /** The API gates both recording and editing a receipt on this one. */
  const mayManagePayments = can(me, "add_supplierpayment");
  const mayPay = mayManagePayments && !settled;

  const [payments, methods] = await Promise.all([
    listPurchasePayments(purchaseId).catch((): PurchasePayment[] => []),
    // BR-62 — supplier-scoped methods only, so a customer method is never
    // offered against a purchase. Needed to EDIT a receipt as well as to record
    // one, so it is fetched whenever payments can be managed at all.
    mayManagePayments ? supplierPaymentMethods().catch(() => []) : Promise.resolve([]),
  ]);

  const methodOptions = methods.map((m): MethodOption => ({
    id: m.id,
    label: optionLabel(m),
    // BR-29 keys off the code: everything but cash needs a reference, so an
    // absent code errs toward demanding one.
    code: m.code ?? "",
  }));

  return (
    <>
      <PageHeader
        eyebrow={`Suppliers / ${purchase.supplier_name}`}
        title={purchase.product_name}
        meta={
          <span className="text-faint">
            Purchased {formatDate(purchase.purchase_date)}
          </span>
        }
        actions={
          <>
            <ButtonLink href={`/suppliers/${id}`} variant="outline">
              ← Back
            </ButtonLink>
            {can(me, "change_supplier") && (
              <ButtonLink href={`/suppliers/${id}/purchases/${purchaseId}/edit`}>
                Edit
              </ButtonLink>
            )}
            {can(me, "delete_supplier") && (
              <DeletePurchase
                purchaseId={purchase.id}
                productName={purchase.product_name}
                price={purchase.price}
                paid={purchase.paid_amount}
                variant="danger"
              />
            )}
          </>
        }
      />

      <PageBody>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Price" value={formatMoney(purchase.price)} tone="accent" />
          <StatTile
            label="Paid"
            value={formatMoney(purchase.paid_amount)}
            tone="success"
          />
          <StatTile
            label="Due"
            value={formatMoney(purchase.due)}
            tone={settled ? "success" : "danger"}
          />
        </div>

        <Card title="Purchase information">
          <DetailList
            columns={2}
            items={[
              { label: "Product", value: purchase.product_name },
              { label: "Supplier", value: purchase.supplier_name },
              {
                label: "Purchase date",
                value: formatDate(purchase.purchase_date),
                mono: true,
              },
              { label: "Notes", value: purchase.notes || "—" },
            ]}
          />
        </Card>

        <Card
          title="Payment history"
          actions={
            mayPay ? (
              <PaymentDialog
                action={recordPurchasePaymentAction}
                trigger="Record payment"
                title="Record purchase payment"
                targetLabel={purchase.product_name}
                outstanding={purchase.due}
                methods={methodOptions}
                today={todayInDhaka()}
                hiddenName="purchaseId"
                hiddenValue={purchase.id}
                allocationNote="Each payment gets its own receipt number and cannot exceed the amount still due on this purchase."
              />
            ) : null
          }
          bodyClassName="p-0"
        >
          {payments.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No payments recorded"
                description="Instalments are the norm — each one gets its own receipt number and posts its own ledger debit."
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
                    <Th>Reference</Th>
                    <Th align="right">Amount</Th>
                    <Th align="right">Actions</Th>
                  </>
                }
              >
                {payments.map((payment) => (
                  <Tr key={payment.id}>
                    <Td mono>{payment.receipt_number}</Td>
                    <Td mono>{formatDate(payment.payment_date)}</Td>
                    <Td>{payment.method_label}</Td>
                    {/* BR-29 — every method but cash carries one. */}
                    <Td mono>{payment.reference_number || "—"}</Td>
                    <Td align="right" mono>{formatMoney(payment.amount)}</Td>
                    <Td align="right">
                      {mayManagePayments ? (
                        <RowActions>
                          <EditPurchasePayment
                            payment={payment}
                            methods={methodOptions}
                          />
                          <DeletePurchasePayment payment={payment} />
                        </RowActions>
                      ) : (
                        <span className="text-[11.5px] text-faint">—</span>
                      )}
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
