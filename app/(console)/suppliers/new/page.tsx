import type { Metadata } from "next";
import { forbidden } from "@/lib/api/guard";
import { can, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { createSupplierAction } from "../actions";
import { SupplierForm } from "../supplier-form";

export const metadata: Metadata = { title: "Add supplier" };

export default async function NewSupplierPage() {
  const me = await requireSession();
  if (!can(me, "add_supplier")) forbidden("Cannot add suppliers.");

  return (
    <>
      <PageHeader eyebrow="Suppliers / Add" title="Add supplier" />
      <PageBody>
        <SupplierForm action={createSupplierAction} cancelHref="/suppliers" submitLabel="Save supplier" />
      </PageBody>
    </>
  );
}
