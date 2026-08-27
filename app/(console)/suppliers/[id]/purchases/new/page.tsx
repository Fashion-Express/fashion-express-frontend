import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { forbidden } from "@/lib/api/guard";
import { optionLabel, supplierPaymentMethods } from "@/lib/api/reference";
import { getSupplier } from "@/lib/api/suppliers";
import { can, requireSession } from "@/lib/auth/session";
import { todayInDhaka } from "@/lib/format/date";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { PurchaseForm } from "./purchase-form";

export const metadata: Metadata = { title: "Add purchase" };

export default async function NewPurchasePage(
  props: PageProps<"/suppliers/[id]/purchases/new">,
) {
  const { id } = await props.params;
  const me = await requireSession();
  if (!can(me, "add_supplier")) forbidden("Cannot add purchases.");

  let supplier;
  try {
    supplier = await getSupplier(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  const methods = await supplierPaymentMethods().catch(() => []);

  return (
    <>
      <PageHeader
        eyebrow="Suppliers / Add purchase"
        title="Add supplier purchase"
        meta={`Supplier: ${supplier.name}`}
      />
      <PageBody>
        <PurchaseForm
          supplierId={supplier.id}
          methods={methods.map((m) => ({ id: m.id, label: optionLabel(m), code: m.code ?? "" }))}
          today={todayInDhaka()}
          cancelHref={`/suppliers/${supplier.id}`}
        />
      </PageBody>
    </>
  );
}
