import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { forbidden } from "@/lib/api/guard";
import { getSupplier } from "@/lib/api/suppliers";
import { can, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { updateSupplierAction } from "../../actions";
import { SupplierForm } from "../../supplier-form";

export const metadata: Metadata = { title: "Edit supplier" };

export default async function EditSupplierPage(props: PageProps<"/suppliers/[id]/edit">) {
  const { id } = await props.params;
  const me = await requireSession();
  if (!can(me, "change_supplier")) forbidden("Cannot edit suppliers.");

  let supplier;
  try {
    supplier = await getSupplier(id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  return (
    <>
      <PageHeader eyebrow="Suppliers / Edit" title={`Edit ${supplier.name}`} />
      <PageBody>
        <SupplierForm
          action={updateSupplierAction}
          supplier={supplier}
          cancelHref={`/suppliers/${supplier.id}`}
          submitLabel="Save changes"
        />
      </PageBody>
    </>
  );
}
