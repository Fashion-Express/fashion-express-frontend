import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { optionLabel, supplierPaymentMethods } from "@/lib/api/reference";
import { getSupplier, listPurchases } from "@/lib/api/suppliers";
import { can, requireSession } from "@/lib/auth/session";
import { formatDate, todayInDhaka } from "@/lib/format/date";
import { formatMoney, isPositive, isZero } from "@/lib/format/money";
import { plural } from "@/lib/format/plural";
import { ButtonLink } from "@/components/ui/button";
import { Card, DetailList, EmptyState, PageBody, PageHeader, StatTile, StatusPill } from "@/components/ui/surfaces";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { paySupplierAction, recordPurchasePaymentAction } from "../actions";
import { PaymentDialog, type MethodOption } from "./payment-form";
import { DeleteSupplier } from "./delete-supplier";

export const metadata: Metadata = { title: "Supplier" };

export default async function SupplierDetailPage(props: PageProps<"/suppliers/[id]">) {
  const { id } = await props.params;
  const me = await requireSession();

  let supplier;
  try {
    supplier = await getSupplier(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const mayPay = can(me, "add_supplierpayment");
  const [purchases, methodOptions] = await Promise.all([
    listPurchases(id),
    mayPay ? supplierPaymentMethods().catch(() => []) : Promise.resolve([]),
  ]);

  const methods: MethodOption[] = methodOptions.map((method) => ({
    id: method.id,
    label: optionLabel(method),
    code: method.code ?? "",
  }));

  const owes = isPositive(supplier.total_due);
  const today = todayInDhaka();

  return (
    <>
      <PageHeader
        eyebrow="Suppliers / Detail"
        title={supplier.name}
        meta={<span className="font-mono">{supplier.phone}</span>}
        actions={
          <>
            <ButtonLink href="/suppliers" variant="outline">← Back</ButtonLink>
            {can(me, "add_supplier") && (
              <ButtonLink href={`/suppliers/${supplier.id}/purchases/new`}>+ Add purchase</ButtonLink>
            )}
            {can(me, "change_supplier") && (
              <ButtonLink href={`/suppliers/${supplier.id}/edit`} variant="outline">Edit</ButtonLink>
            )}
            {can(me, "delete_supplier") && (
              <DeleteSupplier supplierId={supplier.id} name={supplier.name} purchaseCount={supplier.purchase_count} />
            )}
          </>
        }
      />

      <PageBody>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Total purchased" value={formatMoney(supplier.total_purchased)} note={plural(supplier.purchase_count, "purchase")} tone="accent" />
          <StatTile label="Total paid" value={formatMoney(supplier.total_paid)} tone="success" />
          {/* BR-28 — the amount due is DERIVED from the payment rows by a
              database trigger, never entered, so it cannot drift. */}
          <StatTile label="Total due" value={formatMoney(supplier.total_due)} note="Derived from the payment rows" tone={owes ? "danger" : "success"} />
        </div>

        <Card title="Contact">
          <DetailList
            columns={3}
            items={[
              { label: "Name", value: supplier.name },
              { label: "Phone", value: supplier.phone, mono: true },
              { label: "Email", value: supplier.email || "—" },
              { label: "Address", value: supplier.address || "—" },
            ]}
          />
        </Card>

        <Card
          title="Purchases"
          actions={
            mayPay && owes ? (
              <PaymentDialog
                action={paySupplierAction}
                trigger="Record payment"
                title={`Pay ${supplier.name}`}
                targetLabel={`Supplier: ${supplier.name}`}
                outstanding={supplier.total_due}
                methods={methods}
                today={today}
                hiddenName="supplierId"
                hiddenValue={supplier.id}
                allocationNote="Applied to the oldest purchase first, by purchase date. Each purchase touched gets its own receipt number, and cannot exceed the total owed."
              />
            ) : null
          }
          bodyClassName="p-0"
        >
          {purchases.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No purchases recorded"
                description="A purchase is free text — it is deliberately not linked to an inventory item."
                action={
                  can(me, "add_supplier") ? (
                    <ButtonLink href={`/suppliers/${supplier.id}/purchases/new`}>+ Add purchase</ButtonLink>
                  ) : null
                }
              />
            </div>
          ) : (
            <div className="px-5 pb-3">
              <Table
                head={
                  <>
                    <Th>Date</Th>
                    <Th>Product</Th>
                    <Th>Notes</Th>
                    <Th align="right">Price</Th>
                    <Th align="right">Paid</Th>
                    <Th align="right">Due</Th>
                    <Th>Status</Th>
                    <Th align="right">Actions</Th>
                  </>
                }
              >
                {purchases.map((purchase) => {
                  const settled = isZero(purchase.due);
                  return (
                    <Tr key={purchase.id}>
                      <Td mono>{formatDate(purchase.purchase_date)}</Td>
                      <Td strong>{purchase.product_name}</Td>
                      <Td className="max-w-[200px] truncate">{purchase.notes || "—"}</Td>
                      <Td align="right" mono>{formatMoney(purchase.price)}</Td>
                      <Td align="right" mono>{formatMoney(purchase.paid_amount)}</Td>
                      <Td align="right" mono className={settled ? undefined : "text-danger"}>
                        {formatMoney(purchase.due)}
                      </Td>
                      <Td>
                        <StatusPill tone={settled ? "success" : "danger"}>
                          {settled ? "Settled" : "Due"}
                        </StatusPill>
                      </Td>
                      <Td align="right">
                        {mayPay && !settled ? (
                          <PaymentDialog
                            action={recordPurchasePaymentAction}
                            trigger="Pay"
                            title="Record purchase payment"
                            targetLabel={purchase.product_name}
                            outstanding={purchase.due}
                            methods={methods}
                            today={today}
                            hiddenName="purchaseId"
                            hiddenValue={purchase.id}
                            allocationNote="Instalments are the norm. Each payment gets its own receipt number and cannot exceed the amount still due on this purchase."
                          />
                        ) : (
                          <span className="text-[11.5px] text-faint">—</span>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Table>
            </div>
          )}
        </Card>
      </PageBody>
    </>
  );
}
