import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { forbidden } from "@/lib/api/guard";
import { getPurchase, type PurchaseDetail } from "@/lib/api/suppliers";
import { can, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { PurchaseEditForm } from "./purchase-edit-form";

export const metadata: Metadata = { title: "Edit purchase" };

export default async function EditPurchasePage(
  props: PageProps<"/suppliers/[id]/purchases/[purchaseId]/edit">,
) {
  const { id, purchaseId } = await props.params;
  const me = await requireSession();
  if (!can(me, "change_supplier")) forbidden("Cannot edit purchases.");

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

  return (
    <>
      <PageHeader
        eyebrow={`Suppliers / ${purchase.supplier_name} / Purchase`}
        title="Edit purchase"
      />
      <PageBody>
        <PurchaseEditForm
          purchase={purchase}
          cancelHref={`/suppliers/${id}/purchases/${purchaseId}`}
        />
      </PageBody>
    </>
  );
}
